import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { SearchCategory, SearchResultItem, SearchResponse } from '@shared/types/search';

export interface FullSearchParams {
  q?: string;
  filter: SearchCategory;
  pageNumber: number;
  pageSize: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  assignedTo?: string;
  propertyType?: string;
  region?: string;
}

export interface FullSearchResponse {
  items: SearchResultItem[];
  count: number;
}

export const fullSearchKeys = {
  all: ['full-search'] as const,
  query: (params: FullSearchParams) => ['full-search', params] as const,
};

export function useFullSearchQuery(params: FullSearchParams) {
  return useQuery({
    queryKey: fullSearchKeys.query(params),
    queryFn: async (): Promise<FullSearchResponse> => {
      const { q, filter, pageNumber, pageSize, ...filters } = params;
      // Strip undefined values from filters
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
      );

      const { data } = await axios.get<SearchResponse>('/search', {
        params: {
          q,
          filter,
          pageNumber,
          pageSize,
          ...cleanFilters,
        },
      });

      // API returns grouped results — extract the active category's items
      const items = data.results[filter] ?? [];
      const count = data.totalCount ?? items.length;

      return { items, count };
    },
    enabled: !!params.q && params.q.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
