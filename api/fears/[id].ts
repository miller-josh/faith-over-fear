import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, type FearRow, type VerseRow } from '../_lib/db.js';
import { requireUser, readBody, methodNotAllowed } from '../_lib/http.js';
import { serializeFear, isStatus } from '../_lib/serialize.js';
import { detectTopic } from '../_lib/topics.js';
import { hydrateVerse } from '../_lib/bible.js';
import { normalizeRefs } from '../_lib/translations.js';
import { insertVerses } from './index.js';

interface UpdateBody {
  fear?: string;
  truth?: string;
  topic?: string;
  status?: string;
  refs?: unknown;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id) {
    res.status(400).json({ error: 'Missing id.' });
    return;
  }

  const owned = (await sql`
    select * from fears where id = ${id} and user_id = ${userId} limit 1
  `) as FearRow[];
  if (!owned.length) {
    res.status(404).json({ error: 'Not found.' });
    return;
  }
  const row = owned[0];

  if (req.method === 'GET') return read(row, res);
  if (req.method === 'PATCH') return update(row, req, res);
  if (req.method === 'DELETE') return remove(row, res);
  return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
}

async function loadVerses(fearId: string): Promise<VerseRow[]> {
  return (await sql`
    select * from fear_verses where fear_id = ${fearId} order by position asc
  `) as VerseRow[];
}

async function read(row: FearRow, res: VercelResponse) {
  const verses = await loadVerses(row.id);

  // Lazily hydrate any verse whose text we don't yet have, and persist it so the
  // next read is instant.
  await hydrateMissing(verses);

  res.status(200).json({ fear: serializeFear(row, verses) });
}

// Fills in (and persists) verse text for any row we don't yet have, using each
// verse's own translation. Mutates the rows in place.
async function hydrateMissing(verses: VerseRow[]) {
  await Promise.all(
    verses
      .filter((v) => !v.text)
      .map(async (v) => {
        const text = await hydrateVerse(v.reference, v.translation);
        if (text) {
          v.text = text;
          await sql`update fear_verses set text = ${text} where id = ${v.id}`;
        }
      }),
  );
}

async function update(row: FearRow, req: VercelRequest, res: VercelResponse) {
  const body = readBody<UpdateBody>(req);

  const nextFear = body.fear !== undefined ? body.fear.trim() : row.fear;
  const nextTruth = body.truth !== undefined ? body.truth.trim() : row.truth;
  if (!nextFear || !nextTruth) {
    res.status(400).json({ error: 'A fear and a truth are both required.' });
    return;
  }

  const nextStatus =
    body.status !== undefined && isStatus(body.status) ? body.status : row.status;
  const nextTopic =
    body.topic !== undefined && body.topic.trim()
      ? body.topic.trim()
      : body.fear !== undefined
        ? detectTopic(nextFear)
        : row.topic;

  const updated = (await sql`
    update fears
    set fear = ${nextFear}, truth = ${nextTruth}, topic = ${nextTopic},
        status = ${nextStatus}, updated_at = now()
    where id = ${row.id}
    returning *
  `) as FearRow[];

  // If the client sent a verse list, replace the fear's verses wholesale. This
  // is also how a per-verse translation change lands: the client resends the
  // full list with the new translation on the changed verse.
  let verses: VerseRow[];
  if (body.refs !== undefined) {
    const refs = normalizeRefs(body.refs);
    await sql`delete from fear_verses where fear_id = ${row.id}`;
    verses = await insertVerses(row.id, refs);
    // Hydrate text for the (possibly newly-chosen) translations before
    // responding, so a translation switch shows the passage without a reload.
    await hydrateMissing(verses);
  } else {
    verses = await loadVerses(row.id);
  }

  res.status(200).json({ fear: serializeFear(updated[0], verses) });
}

async function remove(row: FearRow, res: VercelResponse) {
  await sql`delete from fears where id = ${row.id}`;
  res.status(200).json({ ok: true });
}
