// The Bible translations a verse can be shown in. All are public-domain and
// served by bible-api.com without an API key. Mirrored on the frontend in
// src/lib/translations.ts — keep the two lists in sync.

export interface Translation {
  id: string; // bible-api.com translation code
  label: string; // shown in the picker
}

export const TRANSLATIONS: Translation[] = [
  { id: 'web', label: 'World English Bible' },
  { id: 'kjv', label: 'King James Version' },
  { id: 'bbe', label: 'Bible in Basic English' },
  { id: 'webbe', label: 'WEB · British Edition' },
  { id: 'oeb-us', label: 'Open English Bible · US' },
  { id: 'oeb-cw', label: 'Open English Bible · CW' },
  { id: 'clementine', label: 'Clementine Latin Vulgate' },
  { id: 'almeida', label: 'João Ferreira de Almeida' },
  { id: 'rccv', label: 'Romanian Corrected Cornilescu' },
];

const IDS = new Set(TRANSLATIONS.map((t) => t.id));

// The fallback translation for verses that don't specify one. Honors the
// BIBLE_TRANSLATION env override when it names a supported translation.
const envDefault = process.env.BIBLE_TRANSLATION;
export const DEFAULT_TRANSLATION =
  envDefault && IDS.has(envDefault) ? envDefault : 'web';

// Coerces arbitrary input to a supported translation id, falling back to the
// default. Keeps untrusted client values from reaching the Bible API.
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
