import { sql } from './db.js';
import { DEFAULT_TRANSLATION, normalizeTranslation } from './translations.js';

// Resolves verse text for a (reference, translation) pair from a translation
// provider, and caches each result in Postgres so repeat lookups are instant
// and the reader's chosen translation stays consistent.
//
// Providers:
//   kjv  — bible-api.com, public domain, no key required.
//   esv  — Crossway ESV API (api.esv.org); needs ESV_API_KEY.
//   niv  — API.Bible (scripture.api.bible); needs API_BIBLE_KEY + API_BIBLE_ID_NIV.
//   nkjv — API.Bible; needs API_BIBLE_KEY + API_BIBLE_ID_NKJV.
//   nasb — API.Bible; needs API_BIBLE_KEY + API_BIBLE_ID_NASB.
//
// ESV/NIV/NKJV/NASB are copyrighted; the app ships without those keys and shows
// a "not set up yet" note until they are configured. NIV in particular may not
// be licensable on API.Bible depending on your account/region.

const TIMEOUT_MS = 6000;

interface Provider {
  // Whether this provider has everything it needs to fetch (keys/ids present).
  configured: () => boolean;
  // Fetches plain verse text for a human reference, or null on failure.
  fetch: (reference: string) => Promise<string | null>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getJson(url: string, init: RequestInit = {}): Promise<any> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// bible-api.com — public-domain translations (KJV here).
function bibleApiProvider(code: string): Provider {
  return {
    configured: () => true,
    fetch: async (reference) => {
      const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${code}`;
      const data = await getJson(url);
      if (!data?.text) return null;
      return String(data.text).replace(/\s+/g, ' ').trim() || null;
    },
  };
}

// Crossway ESV API — reference-based, returns plain text passages.
const esvProvider: Provider = {
  configured: () => !!process.env.ESV_API_KEY,
  fetch: async (reference) => {
    const key = process.env.ESV_API_KEY;
    if (!key) return null;
    const params = new URLSearchParams({
      q: reference,
      'include-passage-references': 'false',
      'include-verse-numbers': 'false',
      'include-first-verse-numbers': 'false',
      'include-footnotes': 'false',
      'include-headings': 'false',
      'include-short-copyright': 'false',
      'include-passage-horizontal-lines': 'false',
      'include-heading-horizontal-lines': 'false',
    });
    const data = await getJson(`https://api.esv.org/v3/passage/text/?${params.toString()}`, {
      headers: { Authorization: `Token ${key}` },
    });
    const passages = data?.passages;
    if (!Array.isArray(passages) || !passages.length) return null;
    return String(passages[0]).replace(/\s+/g, ' ').trim() || null;
  },
};

// API.Bible (scripture.api.bible) — used for the copyrighted translations that
// aren't on Crossway. The bible id per translation is account-specific, so it
// comes from an env var. We use the search endpoint so a human reference like
// "Lamentations 3:22-23" resolves without building passage ids by hand.
function apiBibleProvider(idEnv: string): Provider {
  const bibleId = () => process.env[idEnv];
  const key = () => process.env.API_BIBLE_KEY;
  return {
    configured: () => !!key() && !!bibleId(),
    fetch: async (reference) => {
      const k = key();
      const id = bibleId();
      if (!k || !id) return null;
      const url =
        `https://api.scripture.api.bible/v1/bibles/${encodeURIComponent(id)}` +
        `/search?query=${encodeURIComponent(reference)}&limit=1`;
      const data = await getJson(url, { headers: { 'api-key': k } });
      const content = data?.data?.passages?.[0]?.content;
      if (!content) return null;
      return stripHtml(String(content)) || null;
    },
  };
}

const PROVIDERS: Record<string, Provider> = {
  kjv: bibleApiProvider('kjv'),
  esv: esvProvider,
  niv: apiBibleProvider('API_BIBLE_ID_NIV'),
  nkjv: apiBibleProvider('API_BIBLE_ID_NKJV'),
  nasb: apiBibleProvider('API_BIBLE_ID_NASB'),
};

// Whether verse text for this translation can be fetched (its provider has the
// keys it needs). The frontend uses the per-verse `available` flag derived from
// this to explain missing text instead of showing a perpetual "loading".
export function isTranslationConfigured(translation: string): boolean {
  const provider = PROVIDERS[normalizeTranslation(translation)];
  return provider ? provider.configured() : false;
}

// Reads cached verse text, tolerating any DB error (returns null so the caller
// falls through to a live fetch instead of crashing the request).
async function readCache(ref: string, tr: string): Promise<string | null> {
  try {
    const rows = (await sql`
      select text from verse_cache
      where reference = ${ref} and translation = ${tr}
      limit 1
    `) as { text: string }[];
    return rows.length ? rows[0].text : null;
  } catch {
    return null;
  }
}

// Persists fetched verse text. Best-effort: caching must never fail a request,
// so every error is swallowed. Falls back to a plain insert when the upsert's
// ON CONFLICT target is unavailable — some older databases were created without
// the (reference, translation) unique constraint the upsert needs.
async function writeCache(ref: string, tr: string, text: string): Promise<void> {
  try {
    await sql`
      insert into verse_cache (reference, translation, text)
      values (${ref}, ${tr}, ${text})
      on conflict (reference, translation) do update set text = excluded.text
    `;
  } catch {
    try {
      await sql`
        insert into verse_cache (reference, translation, text)
        select ${ref}, ${tr}, ${text}
        where not exists (
          select 1 from verse_cache where reference = ${ref} and translation = ${tr}
        )
      `;
    } catch {
      /* give up on caching this one */
    }
  }
}

// Returns verse text for a single reference in a given translation, reading
// through the cache. Returns null when the translation's provider isn't
// configured or the fetch fails. Never throws: a hydration failure must not be
// able to crash the save/read that triggered it.
export async function hydrateVerse(
  reference: string,
  translation: string = DEFAULT_TRANSLATION,
): Promise<string | null> {
  const ref = reference.trim();
  if (!ref) return null;
  const tr = normalizeTranslation(translation);

  const cached = await readCache(ref, tr);
  if (cached !== null) return cached;

  const provider = PROVIDERS[tr];
  if (!provider || !provider.configured()) return null;

  let text: string | null = null;
  try {
    text = await provider.fetch(ref);
  } catch {
    text = null;
  }
  if (text) await writeCache(ref, tr, text);
  return text;
}

// Keys a (reference, translation) pair for the map hydrateVerses returns.
export function verseKey(reference: string, translation: string): string {
  return `${reference.trim()} ${normalizeTranslation(translation)}`;
}

// Hydrates many (reference, translation) pairs concurrently.
export async function hydrateVerses(
  refs: { reference: string; translation?: string }[],
): Promise<Record<string, string | null>> {
  const seen = new Map<string, { reference: string; translation: string }>();
  for (const r of refs) {
    const reference = r.reference.trim();
    if (!reference) continue;
    const translation = normalizeTranslation(r.translation);
    seen.set(verseKey(reference, translation), { reference, translation });
  }
  const results = await Promise.all(
    Array.from(seen.entries()).map(
      async ([key, { reference, translation }]) =>
        [key, await hydrateVerse(reference, translation)] as const,
    ),
  );
  return Object.fromEntries(results);
}
