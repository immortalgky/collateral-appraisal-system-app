import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { SearchFilter, SearchResponse } from '@shared/types/search';

export const searchKeys = {
  all: ['search'] as const,
  query: (q: string, filter: SearchFilter) => ['search', q, filter] as const,
};

export function useSearchQuery(query: string, filter: SearchFilter) {
  return useQuery({
    queryKey: searchKeys.query(query, filter),
    queryFn: async (): Promise<SearchResponse> => {
      const { data } = await axios.get<SearchResponse>('/search', {
        params: { q: query, filter, limit: 5 },
      });
      return data;
    },
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
