// The Bible translations a verse can be shown in. Mirrors the server list in
// api/_lib/translations.ts — keep the two in sync.

export interface Translation {
  id: string;
  label: string;
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

export const DEFAULT_TRANSLATION = 'web';

export function translationLabel(id: string): string {
  return TRANSLATIONS.find((t) => t.id === id)?.label ?? id.toUpperCase();
}
