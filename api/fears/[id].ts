import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, type FearRow, type VerseRow } from '../_lib/db.js';
import { requireUser, readBody, methodNotAllowed } from '../_lib/http.js';
import { serializeFear, isStatus } from '../_lib/serialize.js';
import { detectTopic } from '../_lib/topics.js';
import { hydrateVerse } from '../_lib/bible.js';

interface UpdateBody {
  fear?: string;
  truth?: string;
  topic?: string;
  status?: string;
  refs?: string[];
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
  await Promise.all(
    verses
      .filter((v) => !v.text)
      .map(async (v) => {
        const text = await hydrateVerse(v.reference);
        if (text) {
          v.text = text;
          await sql`update fear_verses set text = ${text} where id = ${v.id}`;
        }
      }),
  );

  res.status(200).json({ fear: serializeFear(row, verses) });
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

  // If the client sent a verse list, replace the fear's verses wholesale.
  let verses: VerseRow[];
  if (body.refs !== undefined) {
    const refs = body.refs.map((r) => r.trim()).filter(Boolean);
    await sql`delete from fear_verses where fear_id = ${row.id}`;
    verses = refs.length
      ? ((await sql`
          insert into fear_verses (fear_id, reference, position, text)
          select ${row.id}::uuid, r.reference, r.position,
                 (select text from verse_cache vc where vc.reference = r.reference limit 1)
          from unnest(${refs}::text[]) with ordinality as r(reference, position)
          returning *
        `) as VerseRow[])
      : [];
  } else {
    verses = await loadVerses(row.id);
  }

  res.status(200).json({ fear: serializeFear(updated[0], verses) });
}

async function remove(row: FearRow, res: VercelResponse) {
  await sql`delete from fears where id = ${row.id}`;
  res.status(200).json({ ok: true });
}
