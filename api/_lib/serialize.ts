import type { FearRow, VerseRow } from './db.js';
import { isTranslationConfigured } from './bible.js';

// The shape the API returns to the browser. Dates are ISO strings; the client
// formats the date gutter. Verse text may be null until hydrated. `available`
// is false when the verse's translation has no configured provider, so the
// client can explain the missing text instead of waiting forever.
export interface FearDTO {
  id: string;
  fear: string;
  truth: string;
  topic: string;
  status: string;
  createdAt: string;
  verses: { reference: string; translation: string; text: string | null; available: boolean }[];
}

export function serializeFear(row: FearRow, verses: VerseRow[]): FearDTO {
  return {
    id: row.id,
    fear: row.fear,
    truth: row.truth,
    topic: row.topic,
    status: row.status,
    createdAt: row.created_at,
    verses: verses
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        reference: v.reference,
        translation: v.translation,
        text: v.text,
        available: !!v.text || isTranslationConfigured(v.translation),
      })),
  };
}

export type Status = 'Active' | 'Surrendered' | 'Resolved';
export const STATUSES: Status[] = ['Active', 'Surrendered', 'Resolved'];
export function isStatus(v: unknown): v is Status {
  return typeof v === 'string' && (STATUSES as string[]).includes(v);
}
