// The Bible translations a verse can be shown in. Mirrors the server list in
// api/_lib/translations.ts — keep the two in sync.
//
// Only KJV is public domain and free. ESV, NIV, NKJV, and NASB are copyrighted
// and need a licensed provider + API key configured on the server; until then
// the app shows a "not set up yet" note in place of the verse text.

export interface Translation {
  id: string;
  label: string;
  short: string;
}

export const TRANSLATIONS: Translation[] = [
  { id: 'esv', label: 'English Standard Version', short: 'ESV' },
  { id: 'kjv', label: 'King James Version', short: 'KJV' },
  { id: 'niv', label: 'New International Version', short: 'NIV' },
  { id: 'nkjv', label: 'New King James Version', short: 'NKJV' },
  { id: 'nasb', label: 'New American Standard Bible', short: 'NASB' },
];

export const DEFAULT_TRANSLATION = 'kjv';

export function translationLabel(id: string): string {
  return TRANSLATIONS.find((t) => t.id === id)?.label ?? id.toUpperCase();
}
