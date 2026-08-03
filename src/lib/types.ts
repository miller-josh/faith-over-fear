// API/domain types shared across the frontend. Mirrors the serializer in
// api/_lib/serialize.ts.

export type Status = 'Active' | 'Surrendered' | 'Resolved';

export interface Verse {
  reference: string;
  text: string | null;
}

export interface Fear {
  id: string;
  fear: string;
  truth: string;
  topic: string;
  status: Status;
  createdAt: string; // ISO 8601
  verses: Verse[];
}

export interface SuggestedVerse {
  reference: string;
  text: string;
  why: string;
}

export interface SuggestResult {
  topic: string;
  verses: SuggestedVerse[];
}

// The draft an entry form edits before saving.
export interface Draft {
  fear: string;
  truth: string;
  topic: string | null;
  refs: string[];
}
