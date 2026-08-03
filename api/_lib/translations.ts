// The Bible translations a verse can be shown in. Mirrored on the frontend in
// src/lib/translations.ts — keep the two lists in sync.
//
// Only KJV is public domain and served for free. ESV, NIV, NKJV, and NASB are
// copyrighted and require a licensed provider + API key (see bible.ts and
// .env.example); until one is configured the app shows a "not set up yet" note
// rather than the verse text.

export interface Translation {
  id: string; // internal translation code
  label: string; // shown in the picker
  short: string; // compact label / abbreviation
}

export const TRANSLATIONS: Translation[] = [
  { id: 'esv', label: 'English Standard Version', short: 'ESV' },
  { id: 'kjv', label: 'King James Version', short: 'KJV' },
  { id: 'niv', label: 'New International Version', short: 'NIV' },
  { id: 'nkjv', label: 'New King James Version', short: 'NKJV' },
  { id: 'nasb', label: 'New American Standard Bible', short: 'NASB' },
];

const IDS = new Set(TRANSLATIONS.map((t) => t.id));

// The fallback translation for verses that don't specify one. Defaults to KJV
// (the only one that works without an API key); honors the BIBLE_TRANSLATION
// env override when it names a supported translation.
const envDefault = process.env.BIBLE_TRANSLATION;
export const DEFAULT_TRANSLATION =
  envDefault && IDS.has(envDefault) ? envDefault : 'kjv';

// Coerces arbitrary input to a supported translation id, falling back to the
// default. Keeps untrusted client values from reaching a Bible provider.
export function normalizeTranslation(value: unknown): string {
  return typeof value === 'string' && IDS.has(value) ? value : DEFAULT_TRANSLATION;
}

export interface NormalizedRef {
  reference: string;
  translation: string;
}

// A verse reference on the wire may be a bare "Psalm 34:5" string (legacy /
// manual entry) or an object carrying its own translation. Normalize both to a
// { reference, translation } pair, dropping blanks.
export function normalizeRefs(input: unknown): NormalizedRef[] {
  if (!Array.isArray(input)) return [];
  const out: NormalizedRef[] = [];
  for (const item of input) {
    if (typeof item === 'string') {
      const reference = item.trim();
      if (reference) out.push({ reference, translation: DEFAULT_TRANSLATION });
    } else if (item && typeof item === 'object') {
      const raw = (item as { reference?: unknown }).reference;
      const reference = typeof raw === 'string' ? raw.trim() : '';
      if (reference) {
        out.push({
          reference,
          translation: normalizeTranslation((item as { translation?: unknown }).translation),
        });
      }
    }
  }
  return out;
}
