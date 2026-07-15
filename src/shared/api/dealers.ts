import { useQuery } from '@tanstack/react-query';
import type { Dealer } from '../types/api';
import axios from './axiosInstance';
import { useDealerStore } from '../store';

export const DEALERS_QUERY_KEY = ['dealers'] as const;

/**
 * Fetches all dealers from GET /dealers and hydrates the Zustand store.
 *
 * Caching strategy:
 * - staleTime: Infinity + gcTime: Infinity = data cached in memory for the entire session
 * - Data is never refetched until page refresh
 *
 * For longer caching across page refreshes, add @tanstack/query-sync-storage-persister
 * to persist the query cache to localStorage.
 */
export const useDealersQuery = () => {
  return useQuery({
    queryKey: DEALERS_QUERY_KEY,
    queryFn: async (): Promise<Dealer[]> => {
      const { data } = await axios.get<Dealer[]>('/dealers');
      // Hydrate Zustand store inside queryFn to avoid extra render cycle
      useDealerStore.getState().setDealers(data);
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
