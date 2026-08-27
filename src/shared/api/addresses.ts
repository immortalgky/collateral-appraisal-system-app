import { useQuery } from '@tanstack/react-query';
import type { ThaiAddress } from '../data/thaiAddresses';
import { mockThaiAddresses } from '../data/thaiAddresses';
import axios from './axiosInstance';
import { useAddressStore } from '../store';

export const ADDRESSES_QUERY_KEY = ['addresses'] as const;

/**
 * Outside development a failed fetch must surface as an error rather than quietly hydrating the
 * store with the 30-row mock list — that made a backend outage look identical to a genuinely thin
 * result set in the address pickers. In dev the mock keeps the UI usable without a running API.
 */
const handleAddressFetchFailure = (
  hydrate: (addresses: ThaiAddress[]) => void,
  error: unknown,
): ThaiAddress[] => {
  if (!import.meta.env.DEV) {
    throw error instanceof Error ? error : new Error('Failed to load address master data');
  }
  hydrate(mockThaiAddresses);
  return mockThaiAddresses;
};

/**
 * Fetches Thai addresses from both title and DOPA endpoints and hydrates the Zustand store.
 *
 * Caching strategy:
 * - staleTime: Infinity + gcTime: Infinity = data cached in memory for the entire session
 * - Data is never refetched until page refresh
 */
export const useAddressesQuery = () => {
  const titleQuery = useQuery({
    queryKey: ['addresses', 'title'],
    queryFn: async (): Promise<ThaiAddress[]> => {
      const hydrate = useAddressStore.getState().setTitleAddresses;
      let data: ThaiAddress[] | undefined;
      try {
        ({ data } = await axios.get<ThaiAddress[]>('/parameters/addresses/title'));
      } catch (error) {
        return handleAddressFetchFailure(hydrate, error);
      }
      if (!Array.isArray(data) || data.length === 0) {
        return handleAddressFetchFailure(hydrate, new Error('Title address master is empty'));
      }
      hydrate(data);
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const dopaQuery = useQuery({
    queryKey: ['addresses', 'dopa'],
    queryFn: async (): Promise<ThaiAddress[]> => {
      const hydrate = useAddressStore.getState().setDopaAddresses;
      let data: ThaiAddress[] | undefined;
      try {
        ({ data } = await axios.get<ThaiAddress[]>('/parameters/addresses/dopa'));
      } catch (error) {
        return handleAddressFetchFailure(hydrate, error);
      }
      if (!Array.isArray(data) || data.length === 0) {
        return handleAddressFetchFailure(hydrate, new Error('DOPA address master is empty'));
      }
      hydrate(data);
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  return { titleQuery, dopaQuery };
};
