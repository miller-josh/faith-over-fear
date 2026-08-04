import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser, methodNotAllowed } from './_lib/http.js';
import { listBibles } from './_lib/bible.js';

// Diagnostic: lists the Bible versions the server's single API_BIBLE_KEY is
// allowed to see, each with its bibleId, so the right API_BIBLE_ID_* values can
// be set. Uses the key already configured on the server — no secret is sent from
// the browser. Signed-in only. Optional query passthrough mirrors API.Bible's
// /v1/bibles filters: language, abbreviation, name, ids.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const q = (k: string) => (typeof req.query[k] === 'string' ? (req.query[k] as string) : undefined);

  try {
    const result = await listBibles({
      language: q('language'),
      abbreviation: q('abbreviation'),
      name: q('name'),
      ids: q('ids'),
    });
    if (!result.ok) {
      const status = result.status && result.status >= 400 && result.status < 500 ? result.status : 400;
      res.status(status).json({ error: result.error ?? 'Could not list Bible versions.' });
      return;
    }
    res.status(200).json({ bibles: result.bibles ?? [] });
  } catch (err) {
    console.error('bibles handler failed', err);
    if (!res.headersSent) res.status(500).json({ error: 'Could not list Bible versions.' });
  }
}
