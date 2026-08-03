// Applies db/schema.sql to the Neon database in DATABASE_URL.
// Usage: DATABASE_URL=... node scripts/setup-db.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const here = dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .env.local or your shell.');
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(join(here, '..', 'db', 'schema.sql'), 'utf8');

// Split on statement boundaries. The schema uses only simple statements,
// so splitting on ";" at line ends is sufficient here.
const statements = schema
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('--'));

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`Applied ${statements.length} statements. Schema is ready.`);
