import { useQuery } from '@tanstack/react-query';
import type { ThaiAddress } from '../data/thaiAddresses';
import { mockThaiAddresses } from '../data/thaiAddresses';
import axios from './axiosInstance';
import { useAddressStore } from '../store';

export const ADDRESSES_QUERY_KEY = ['addresses'] as const;

/**
 * Fetches Thai addresses from both title and DOPA endpoints and hydrates the Zustand store.
 * Falls back to mock data if the API returns an error or an empty array.
 *
 * Caching strategy:
 * - staleTime: Infinity + gcTime: Infinity = data cached in memory for the entire session
 * - Data is never refetched until page refresh
 */
export const useAddressesQuery = () => {
  const titleQuery = useQuery({
    queryKey: ['addresses', 'title'],
    queryFn: async (): Promise<ThaiAddress[]> => {
      try {
        const { data } = await axios.get<ThaiAddress[]>('/parameters/addresses/title');
        if (Array.isArray(data) && data.length > 0) {
          useAddressStore.getState().setTitleAddresses(data);
          return data;
        }
      } catch {
        // API unavailable — fall through to mock data
      }
      useAddressStore.getState().setTitleAddresses(mockThaiAddresses);
      return mockThaiAddresses;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const dopaQuery = useQuery({
    queryKey: ['addresses', 'dopa'],
    queryFn: async (): Promise<ThaiAddress[]> => {
      try {
        const { data } = await axios.get<ThaiAddress[]>('/parameters/addresses/dopa');
        if (Array.isArray(data) && data.length > 0) {
          useAddressStore.getState().setDopaAddresses(data);
          return data;
        }
      } catch {
        // API unavailable — fall through to mock data
      }
      useAddressStore.getState().setDopaAddresses(mockThaiAddresses);
      return mockThaiAddresses;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  return { titleQuery, dopaQuery };
};
