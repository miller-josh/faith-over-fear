import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser, readBody, methodNotAllowed } from './_lib/http.js';
import { suggestVerses } from './_lib/suggest.js';

interface Body {
  fear?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const fear = (readBody<Body>(req).fear ?? '').trim();
  if (!fear) {
    res.status(400).json({ error: 'A fear is required to suggest verses.' });
    return;
  }

  try {
    const result = await suggestVerses(fear);
    res.status(200).json(result);
  } catch (err) {
    console.error('suggest-verses failed:', err);
    res.status(502).json({ error: 'Could not reach the suggestion service. Try again.' });
  }
}
