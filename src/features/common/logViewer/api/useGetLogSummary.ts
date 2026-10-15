import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { LogSummary } from '../types';

export interface LogSummaryParams {
  q?: string;
  from?: string;
  to?: string;
}

/** GET /admin/logs/summary — level counts, 48-bucket histogram, and top problems. Ignores
 * `levels` by design (the histogram needs every level to draw its own legend). Keeps the previous
 * result visible while a new `to`/query is in flight (Live's quiet-window tick, a re-search, a
 * bucket zoom) instead of unmounting the histogram/chips to a loading state on every key change. */
export const useGetLogSummary = (params: LogSummaryParams, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ['admin-logs', 'summary', params],
    queryFn: async ({ signal }): Promise<LogSummary> => {
      const { data } = await axios.get<LogSummary>('/admin/logs/summary', {
        signal,
        params: { q: params.q || undefined, from: params.from, to: params.to },
      });
      return data;
    },
    enabled: options.enabled,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
