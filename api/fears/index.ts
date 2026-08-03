import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, type FearRow, type VerseRow } from '../_lib/db.js';
import { requireUser, readBody, methodNotAllowed } from '../_lib/http.js';
import { serializeFear } from '../_lib/serialize.js';
import { detectTopic } from '../_lib/topics.js';
import { normalizeRefs, type NormalizedRef } from '../_lib/translations.js';

interface CreateBody {
  fear?: string;
  truth?: string;
  topic?: string;
  refs?: unknown;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  if (req.method === 'GET') return list(userId, res);
  if (req.method === 'POST') return create(userId, req, res);
  return methodNotAllowed(res, ['GET', 'POST']);
}

async function list(userId: string, res: VercelResponse) {
  const fears = (await sql`
    select * from fears
    where user_id = ${userId}
    order by created_at desc
  `) as FearRow[];

  const ids = fears.map((f) => f.id);
  const verses = ids.length
    ? ((await sql`
        select * from fear_verses
        where fear_id = any(${ids}::uuid[])
        order by position asc
      `) as VerseRow[])
    : [];

  const byFear = new Map<string, VerseRow[]>();
  for (const v of verses) {
    const arr = byFear.get(v.fear_id) ?? [];
    arr.push(v);
    byFear.set(v.fear_id, arr);
  }

  res.status(200).json({ fears: fears.map((f) => serializeFear(f, byFear.get(f.id) ?? [])) });
}

async function create(userId: string, req: VercelRequest, res: VercelResponse) {
  const body = readBody<CreateBody>(req);
  const fear = (body.fear ?? '').trim();
  const truth = (body.truth ?? '').trim();
  if (!fear || !truth) {
    res.status(400).json({ error: 'A fear and a truth are both required.' });
    return;
  }
  const topic = (body.topic ?? '').trim() || detectTopic(fear);
  const refs = normalizeRefs(body.refs);

  const inserted = (await sql`
    insert into fears (user_id, fear, truth, topic, status)
    values (${userId}, ${fear}, ${truth}, ${topic}, 'Active')
    returning *
  `) as FearRow[];
  const row = inserted[0];

  const verses = await insertVerses(row.id, refs);

  res.status(201).json({ fear: serializeFear(row, verses) });
}

// Inserts a fear's verses, filling text from the (reference, translation)
// cache when we already have it; the rest hydrate lazily on the detail view.
export async function insertVerses(
  fearId: string,
  refs: NormalizedRef[],
): Promise<VerseRow[]> {
  if (!refs.length) return [];
  const references = refs.map((r) => r.reference);
  const translations = refs.map((r) => r.translation);
  return (await sql`
    insert into fear_verses (fear_id, reference, translation, position, text)
    select ${fearId}::uuid, r.reference, r.translation, r.position,
           (select text from verse_cache vc
            where vc.reference = r.reference and vc.translation = r.translation
            limit 1)
    from unnest(${references}::text[], ${translations}::text[])
      with ordinality as r(reference, translation, position)
    returning *
  `) as VerseRow[];
}
