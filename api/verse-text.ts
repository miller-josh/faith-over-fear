import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser, methodNotAllowed } from './_lib/http.js';
import { hydrateVerse, isTranslationConfigured } from './_lib/bible.js';
import { normalizeTranslation } from './_lib/translations.js';

// Resolves the text of a single reference in a chosen translation, without
// touching any entry. The entry form uses this to preview a passage as the
// writer picks a translation, so switching versions shows the real text (or an
// honest "unavailable") before saving. Reads through the shared verse cache.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const reference = typeof req.query.reference === 'string' ? req.query.reference.trim() : '';
    if (!reference) {
      res.status(400).json({ error: 'A reference is required.' });
      return;
    }
    const translation = normalizeTranslation(
      typeof req.query.translation === 'string' ? req.query.translation : undefined,
    );
    const text = await hydrateVerse(reference, translation);
    res.status(200).json({
      reference,
      translation,
      text,
      available: !!text || isTranslationConfigured(translation),
    });
  } catch (err) {
    console.error('verse-text handler failed', err);
    if (!res.headersSent) res.status(500).json({ error: 'Could not load that verse right now.' });
  }
}
