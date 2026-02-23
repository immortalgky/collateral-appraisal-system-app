import { useQuery } from '@tanstack/react-query';
import type { Parameter } from '../types/api';
import axios from './axiosInstance';
import { useParameterStore } from '../store';

export const PARAMETERS_QUERY_KEY = ['parameters'] as const;

/**
 * Fetches all parameters from GET /parameters and hydrates the Zustand store.
 *
 * Caching strategy:
 * - staleTime: Infinity + gcTime: Infinity = data cached in memory for the entire session
 * - Data is never refetched until page refresh
 *
 * For longer caching across page refreshes, add @tanstack/query-sync-storage-persister
 * to persist the query cache to localStorage.
 */
export const useParametersQuery = () => {
  return useQuery({
    queryKey: PARAMETERS_QUERY_KEY,
    queryFn: async (): Promise<Parameter[]> => {
      const { data } = await axios.get<Parameter[]>('/parameters');
      // Hydrate Zustand store inside queryFn to avoid extra render cycle
      useParameterStore.getState().setParameters(data);
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
