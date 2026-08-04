import type { Fear, SuggestResult, VerseRef } from './types.ts';

// Thin fetch layer. Every call carries the Clerk session token as a Bearer
// header; the server verifies it and scopes queries by the Clerk user id.
export type TokenGetter = () => Promise<string | null>;

async function authedFetch<T>(
  getToken: TokenGetter,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function createApi(getToken: TokenGetter) {
  return {
    listFears: () =>
      authedFetch<{ fears: Fear[] }>(getToken, '/api/fears').then((r) => r.fears),

    getFear: (id: string) =>
      authedFetch<{ fear: Fear }>(getToken, `/api/fears/${id}`).then((r) => r.fear),

    createFear: (input: { fear: string; truth: string; topic?: string; refs: VerseRef[] }) =>
      authedFetch<{ fear: Fear }>(getToken, '/api/fears', {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((r) => r.fear),

    updateFear: (
      id: string,
      input: Partial<{ fear: string; truth: string; topic: string; status: string; refs: VerseRef[] }>,
    ) =>
      authedFetch<{ fear: Fear }>(getToken, `/api/fears/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }).then((r) => r.fear),

    deleteFear: (id: string) =>
      authedFetch<{ ok: boolean }>(getToken, `/api/fears/${id}`, { method: 'DELETE' }),

    suggestVerses: (fear: string) =>
      authedFetch<SuggestResult>(getToken, '/api/suggest-verses', {
        method: 'POST',
        body: JSON.stringify({ fear }),
      }),

    verseText: (reference: string, translation: string) =>
      authedFetch<{ reference: string; translation: string; text: string | null; available: boolean }>(
        getToken,
        `/api/verse-text?reference=${encodeURIComponent(reference)}&translation=${encodeURIComponent(translation)}`,
      ),
  };
}

export type Api = ReturnType<typeof createApi>;
