import { sql } from './db.js';
import { DEFAULT_TRANSLATION, normalizeTranslation } from './translations.js';

// Resolves verse text for a (reference, translation) pair from a translation
// provider, and caches each result in Postgres so repeat lookups are instant
// and the reader's chosen translation stays consistent.
//
// Providers:
//   kjv  — bible-api.com, public domain, no key required.
//   esv  — Crossway ESV API (api.esv.org) when ESV_API_KEY is set, else API.Bible.
//   niv  — API.Bible (scripture.api.bible).
//   nkjv — API.Bible.
//   nasb — API.Bible.
//
// API.Bible uses a SINGLE shared key (API_BIBLE_KEY) for every version; the
// version is selected by its bibleId, not a per-version key. Setting just
// API_BIBLE_KEY is enough: at fetch time we query the bibles the key can see and
// match each version by abbreviation, so bibleIds are discovered automatically.
// API_BIBLE_ID_<VERSION> env vars remain as optional overrides (e.g. to pin a
// specific edition). ESV/NIV/NKJV/NASB are copyrighted; a version the key can't
// see just returns no text. NIV may not be licensable on API.Bible at all.

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

// USFM book codes API.Bible uses in passage ids (e.g. "2 Corinthians" → "2CO").
// Covers the 66-book canon with the spellings the app is likely to produce
// (AI suggestions and manual entry). Anything not here falls back to search.
const BOOK_CODES: Record<string, string> = {
  genesis: 'GEN', exodus: 'EXO', leviticus: 'LEV', numbers: 'NUM', deuteronomy: 'DEU',
  joshua: 'JOS', judges: 'JDG', ruth: 'RUT', '1 samuel': '1SA', '2 samuel': '2SA',
  '1 kings': '1KI', '2 kings': '2KI', '1 chronicles': '1CH', '2 chronicles': '2CH',
  ezra: 'EZR', nehemiah: 'NEH', esther: 'EST', job: 'JOB', psalm: 'PSA', psalms: 'PSA',
  proverbs: 'PRO', ecclesiastes: 'ECC', 'song of solomon': 'SNG', 'song of songs': 'SNG',
  canticles: 'SNG', isaiah: 'ISA', jeremiah: 'JER', lamentations: 'LAM', ezekiel: 'EZK',
  daniel: 'DAN', hosea: 'HOS', joel: 'JOL', amos: 'AMO', obadiah: 'OBA', jonah: 'JON',
  micah: 'MIC', nahum: 'NAM', habakkuk: 'HAB', zephaniah: 'ZEP', haggai: 'HAG',
  zechariah: 'ZEC', malachi: 'MAL', matthew: 'MAT', mark: 'MRK', luke: 'LUK', john: 'JHN',
  acts: 'ACT', romans: 'ROM', '1 corinthians': '1CO', '2 corinthians': '2CO',
  galatians: 'GAL', ephesians: 'EPH', philippians: 'PHP', colossians: 'COL',
  '1 thessalonians': '1TH', '2 thessalonians': '2TH', '1 timothy': '1TI', '2 timothy': '2TI',
  titus: 'TIT', philemon: 'PHM', hebrews: 'HEB', james: 'JAS', '1 peter': '1PE',
  '2 peter': '2PE', '1 john': '1JN', '2 john': '2JN', '3 john': '3JN', jude: 'JUD',
  revelation: 'REV', revelations: 'REV',
};

function bookCode(name: string): string | null {
  const n = name
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/^([123])\s*/, '$1 '); // "1john" → "1 john"
  return BOOK_CODES[n] ?? null;
}

// Converts a human reference ("Isaiah 41:10-13") to an API.Bible passage id
// ("ISA.41.10-ISA.41.13"). Returns null when it can't parse, so the caller can
// fall back to the search endpoint.
function toPassageId(reference: string): string | null {
  const m = reference.trim().match(/^(.*?)[\s.]+(\d+):(\d+)(?:\s*[-–]\s*(?:(\d+):)?(\d+))?$/);
  if (!m) return null;
  const code = bookCode(m[1]);
  if (!code) return null;
  const [, , chapter, verse, endChapter, endVerse] = m;
  const start = `${code}.${chapter}.${verse}`;
  if (endVerse) return `${start}-${code}.${endChapter ?? chapter}.${endVerse}`;
  return start;
}

// API.Bible (scripture.api.bible) uses ONE shared api-key for every version; the
// version is chosen by its bibleId. Prefer the passages endpoint (clean plain
// text via content-type=text); fall back to search when a reference doesn't
// parse into a passage id.
async function apiBibleFetch(bibleId: string, reference: string): Promise<string | null> {
  const key = process.env.API_BIBLE_KEY;
  if (!key) return null;
  const headers = { 'api-key': key };
  const base = `https://api.scripture.api.bible/v1/bibles/${encodeURIComponent(bibleId)}`;

  const passageId = toPassageId(reference);
  if (passageId) {
    const params = new URLSearchParams({
      'content-type': 'text',
      'include-verse-numbers': 'false',
      'include-chapter-numbers': 'false',
      'include-titles': 'false',
      'include-notes': 'false',
      'include-verse-spans': 'false',
    });
    const data = await getJson(`${base}/passages/${encodeURIComponent(passageId)}?${params}`, { headers });
    const content = data?.data?.content;
    if (content) return stripHtml(String(content)) || null;
  }

  const data = await getJson(`${base}/search?query=${encodeURIComponent(reference)}&limit=1`, { headers });
  const content = data?.data?.passages?.[0]?.content;
  return content ? stripHtml(String(content)) || null : null;
}

// Abbreviations to look for in the key's bible list when auto-resolving a
// translation's bibleId. Includes common edition suffixes API.Bible uses.
const API_BIBLE_ABBRS: Record<string, string[]> = {
  esv: ['ESV'],
  niv: ['NIV', 'NIV11', 'NIV84'],
  nkjv: ['NKJV'],
  nasb: ['NASB', 'NASB2020', 'NASB95'],
  kjv: ['KJV', 'ENGKJV'],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let biblesCache: { at: number; list: any[] } | null = null;
const BIBLES_TTL_MS = 10 * 60_000;

// The bibles the shared key can see, cached briefly per warm instance so we
// resolve ids without re-querying on every verse.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function accessibleBibles(): Promise<any[]> {
  const key = process.env.API_BIBLE_KEY;
  if (!key) return [];
  if (biblesCache && Date.now() - biblesCache.at < BIBLES_TTL_MS) return biblesCache.list;
  const data = await getJson('https://api.scripture.api.bible/v1/bibles?language=eng', {
    headers: { 'api-key': key },
  });
  const list = Array.isArray(data?.data) ? data.data : [];
  biblesCache = { at: Date.now(), list };
  return list;
}

// Resolves the bibleId to use for a translation. Honors an explicit env override
// (API_BIBLE_ID_<VERSION>) when set; otherwise queries the bibles the key can
// see and matches by abbreviation — so setting just API_BIBLE_KEY is enough.
async function resolveBibleId(code: string, idEnv: string): Promise<string | null> {
  const override = process.env[idEnv];
  if (override) return override;
  const wanted = API_BIBLE_ABBRS[code] ?? [code.toUpperCase()];
  const list = await accessibleBibles();
  for (const abbr of wanted) {
    const hit = list.find((b) =>
      [b.abbreviation, b.abbreviationLocal].some((a) => String(a ?? '').toUpperCase() === abbr),
    );
    if (hit?.id) return String(hit.id);
  }
  return null;
}

// A translation served by API.Bible under the shared key. `configured` only
// needs the key — the specific version's id is discovered at fetch time.
function apiBibleProvider(code: string, idEnv: string): Provider {
  return {
    configured: () => !!process.env.API_BIBLE_KEY,
    fetch: async (reference) => {
      if (!process.env.API_BIBLE_KEY) return null;
      const id = await resolveBibleId(code, idEnv);
      return id ? apiBibleFetch(id, reference) : null;
    },
  };
}

// ESV can come from either provider. Prefer Crossway's dedicated ESV API when an
// ESV_API_KEY is set; otherwise use API.Bible under the same shared key as the
// other versions (with API_BIBLE_ID_ESV naming the bibleId).
async function esvCrosswayFetch(reference: string): Promise<string | null> {
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
}

const esvProvider: Provider = {
  configured: () => !!process.env.ESV_API_KEY || !!process.env.API_BIBLE_KEY,
  fetch: async (reference) => {
    if (process.env.ESV_API_KEY) {
      const text = await esvCrosswayFetch(reference);
      if (text) return text;
    }
    if (!process.env.API_BIBLE_KEY) return null;
    const id = await resolveBibleId('esv', 'API_BIBLE_ID_ESV');
    return id ? apiBibleFetch(id, reference) : null;
  },
};

const PROVIDERS: Record<string, Provider> = {
  kjv: bibleApiProvider('kjv'),
  esv: esvProvider,
  niv: apiBibleProvider('niv', 'API_BIBLE_ID_NIV'),
  nkjv: apiBibleProvider('nkjv', 'API_BIBLE_ID_NKJV'),
  nasb: apiBibleProvider('nasb', 'API_BIBLE_ID_NASB'),
};

// Whether verse text for this translation can be fetched (its provider has the
// keys it needs). The frontend uses the per-verse `available` flag derived from
// this to explain missing text instead of showing a perpetual "loading".
export function isTranslationConfigured(translation: string): boolean {
  const provider = PROVIDERS[normalizeTranslation(translation)];
  return provider ? provider.configured() : false;
}

export interface BibleSummary {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
}

export interface ListBiblesResult {
  ok: boolean;
  status?: number;
  error?: string;
  bibles?: BibleSummary[];
}

// Lists the Bibles the server's single API_BIBLE_KEY can see, so the exact
// bibleId for each version can be copied into API_BIBLE_ID_* env vars. Surfaces
// the upstream status (401 = bad key, 403 = not authorized) rather than
// swallowing it, since that's the whole point of the diagnostic.
export async function listBibles(
  query: { language?: string; abbreviation?: string; name?: string; ids?: string } = {},
): Promise<ListBiblesResult> {
  const key = process.env.API_BIBLE_KEY;
  if (!key) return { ok: false, error: 'API_BIBLE_KEY is not set on the server.' };

  const params = new URLSearchParams({ 'include-full-details': 'false' });
  if (query.abbreviation) params.set('abbreviation', query.abbreviation);
  if (query.name) params.set('name', query.name);
  if (query.ids) params.set('ids', query.ids);
  // Default to English unless a narrower filter was given, to keep the list short.
  if (query.language) params.set('language', query.language);
  else if (!query.ids && !query.abbreviation && !query.name) params.set('language', 'eng');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`https://api.scripture.api.bible/v1/bibles?${params}`, {
      headers: { 'api-key': key },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const hint =
        res.status === 401
          ? ' The key looks invalid.'
          : res.status === 403
            ? ' The key is not authorized for this request.'
            : '';
      return { ok: false, status: res.status, error: `API.Bible returned ${res.status}.${hint}` };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const list = Array.isArray(data?.data) ? data.data : [];
    return {
      ok: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bibles: list.map((b: any) => ({
        id: String(b.id ?? ''),
        abbreviation: String(b.abbreviationLocal ?? b.abbreviation ?? ''),
        name: String(b.nameLocal ?? b.name ?? ''),
        language: String(b.language?.name ?? b.language?.id ?? ''),
      })),
    };
  } catch {
    return { ok: false, error: 'Could not reach API.Bible. Please try again.' };
  }
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
