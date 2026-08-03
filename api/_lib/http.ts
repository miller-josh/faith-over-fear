import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';

// Authenticates a request against the Clerk session. The frontend sends the
// session JWT as `Authorization: Bearer <token>` (obtained via Clerk's
// getToken()). Returns the Clerk user id, or null if unauthenticated.
export async function getUserId(req: VercelRequest): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not set. See .env.example.');
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

// Guards a handler: resolves the user id or writes a 401 and returns null.
export async function requireUser(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> {
  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Not signed in.' });
    return null;
  }
  return userId;
}

// Parses a JSON body regardless of whether Vercel has already done so.
export function readBody<T>(req: VercelRequest): T {
  if (req.body && typeof req.body === 'object') return req.body as T;
  if (typeof req.body === 'string' && req.body.length) {
    return JSON.parse(req.body) as T;
  }
  return {} as T;
}

export function methodNotAllowed(res: VercelResponse, allow: string[]): void {
  res.setHeader('Allow', allow.join(', '));
  res.status(405).json({ error: 'Method not allowed.' });
}
