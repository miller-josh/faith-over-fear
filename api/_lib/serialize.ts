import type { FearRow, VerseRow } from './db.js';

// The shape the API returns to the browser. Dates are ISO strings; the client
// formats the date gutter. Verse text may be null until hydrated.
export interface FearDTO {
  id: string;
  fear: string;
  truth: string;
  topic: string;
  status: string;
  createdAt: string;
  verses: { reference: string; text: string | null }[];
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
      .map((v) => ({ reference: v.reference, text: v.text })),
  };
}

export type Status = 'Active' | 'Surrendered' | 'Resolved';
export const STATUSES: Status[] = ['Active', 'Surrendered', 'Resolved'];
export function isStatus(v: unknown): v is Status {
  return typeof v === 'string' && (STATUSES as string[]).includes(v);
}
