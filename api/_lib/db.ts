import { neon } from '@neondatabase/serverless';

// A single shared Neon client. `neon()` is a stateless HTTP driver, so it is
// safe to instantiate once per serverless function instance.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set. See .env.example.');
}

export const sql = neon(url);

// Row shapes as stored in Postgres.
export interface FearRow {
  id: string;
  user_id: string;
  fear: string;
  truth: string;
  topic: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface VerseRow {
  id: string;
  fear_id: string;
  reference: string;
  translation: string;
  text: string | null;
  position: number;
}
