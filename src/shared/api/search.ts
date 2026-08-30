import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { SearchScope, SearchResponse } from '@shared/types/search';

/**
 * Below this the term is not selective enough to be worth a round trip: every appraisal number in
 * the system starts with the same two digits, so a 2-character query matches essentially every row.
 * The server enforces the same minimum and returns 400 under it.
 */
export const MIN_SEARCH_LENGTH = 3;

export const searchKeys = {
  all: ['search'] as const,
  query: (q: string, scope: SearchScope) => ['search', q, scope] as const,
};

export function useSearchQuery(query: string, scope: SearchScope) {
  return useQuery({
    queryKey: searchKeys.query(query, scope),
    queryFn: async ({ signal }): Promise<SearchResponse> => {
      // Pass React Query's signal through: typing fast abandons requests, and without this the
      // server keeps executing every one of them to completion.
      const { data } = await axios.get<SearchResponse>('/search', {
        params: { q: query, scope, limit: 8 },
        signal,
      });
      return data;
    },
    enabled: query.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
