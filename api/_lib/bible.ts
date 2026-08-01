import { sql } from './db.js';

// Resolves verse text for a set of references, using a public-domain Bible
// source (bible-api.com — World English Bible by default, no API key required)
// and caching each result in Postgres so repeat lookups are instant and the
// translation stays consistent.

const TRANSLATION = process.env.BIBLE_TRANSLATION || 'web';

interface BibleApiResponse {
  reference?: string;
  text?: string;
  error?: string;
}

async function fetchFromApi(reference: string): Promise<string | null> {
  const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${TRANSLATION}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as BibleApiResponse;
    if (!data.text) return null;
    // The API returns text with line breaks; normalize whitespace.
    return data.text.replace(/\s+/g, ' ').trim();
  } catch {
    return null;
  }
}

// Returns verse text for a single reference, reading through the cache.
export async function hydrateVerse(reference: string): Promise<string | null> {
  const ref = reference.trim();
  if (!ref) return null;

  const cached = (await sql`
    select text from verse_cache
    where reference = ${ref} and translation = ${TRANSLATION}
    limit 1
  `) as { text: string }[];
  if (cached.length) return cached[0].text;

  const text = await fetchFromApi(ref);
  if (text) {
    await sql`
      insert into verse_cache (reference, translation, text)
      values (${ref}, ${TRANSLATION}, ${text})
      on conflict (reference, translation) do update set text = excluded.text
    `;
  }
  return text;
}

// Hydrates many references concurrently.
export async function hydrateVerses(
  references: string[],
): Promise<Record<string, string | null>> {
  const unique = Array.from(new Set(references.map((r) => r.trim()).filter(Boolean)));
  const results = await Promise.all(
    unique.map(async (ref) => [ref, await hydrateVerse(ref)] as const),
  );
  return Object.fromEntries(results);
}
