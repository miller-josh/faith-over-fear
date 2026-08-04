import { useAuth } from '@clerk/clerk-react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { createApi, type BibleSummary } from '../lib/api.ts';
import type { Fear } from '../lib/types.ts';

// Binds the API client to the current Clerk session.
function useApi() {
  const { getToken } = useAuth();
  return useMemo(() => createApi(() => getToken()), [getToken]);
}

const fearsKey = ['fears'] as const;
const fearKey = (id: string) => ['fear', id] as const;

export function useFears(): UseQueryResult<Fear[]> {
  const api = useApi();
  return useQuery({ queryKey: fearsKey, queryFn: api.listFears });
}

export function useFear(id: string | undefined): UseQueryResult<Fear> {
  const api = useApi();
  return useQuery({
    queryKey: fearKey(id ?? ''),
    queryFn: () => api.getFear(id as string),
    enabled: !!id,
  });
}

export function useCreateFear() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createFear,
    onSuccess: (fear) => {
      qc.invalidateQueries({ queryKey: fearsKey });
      qc.setQueryData(fearKey(fear.id), fear);
    },
  });
}

export function useUpdateFear() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Parameters<typeof api.updateFear>[1] & { id: string }) =>
      api.updateFear(id, input),
    onSuccess: (fear) => {
      qc.invalidateQueries({ queryKey: fearsKey });
      qc.setQueryData(fearKey(fear.id), fear);
    },
  });
}

export function useDeleteFear() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteFear(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: fearsKey });
      qc.removeQueries({ queryKey: fearKey(id) });
    },
  });
}

export function useSuggestVerses() {
  const api = useApi();
  return useMutation({ mutationFn: (fear: string) => api.suggestVerses(fear) });
}

// Lists the Bible versions the server's API.Bible key can see (with their ids).
export function useBibles(): UseQueryResult<BibleSummary[]> {
  const api = useApi();
  return useQuery({ queryKey: ['bibles'], queryFn: api.listBibles, staleTime: 5 * 60_000, retry: false });
}

// Fetches the text of one reference in one translation, cached by react-query so
// switching a verse back to a translation already viewed is instant.
export function useVerseTextLoader() {
  const api = useApi();
  const qc = useQueryClient();
  return (reference: string, translation: string) =>
    qc.fetchQuery({
      queryKey: ['verse-text', reference, translation],
      queryFn: () => api.verseText(reference, translation),
      staleTime: Infinity,
    });
}
