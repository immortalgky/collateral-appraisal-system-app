import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { LOG_LEVELS, type LogLevel, type LogSearchResult } from '../types';

export interface LogsQueryParams {
  q?: string;
  from?: string;
  to?: string;
  /** Omit (or pass all four levels) to mean "no level filter". */
  levels?: LogLevel[];
  pageSize?: number;
  sortDir?: 'asc' | 'desc';
}

const DEFAULT_PAGE_SIZE = 50;

/** Shared param-building for every /admin/logs caller (the main list here, and useLiveTail's own
 * polling) — one place for the q/levels/pageSize/sortDir shape so they can't drift apart. */
export function buildParams(params: LogsQueryParams, extra: Record<string, unknown>) {
  return {
    q: params.q || undefined,
    from: params.from,
    to: params.to,
    levels:
      params.levels && params.levels.length < LOG_LEVELS.length
        ? params.levels.join(',')
        : undefined,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    sortDir: params.sortDir ?? 'desc',
    ...extra,
  };
}

/**
 * Main log table — GET /admin/logs, paged backwards from the newest row via `beforeId`.
 * No total count: the backend fetches pageSize+1 rows to derive `hasMore` instead of COUNT(*),
 * so the search stays fast at 30-day ranges.
 */
export const useGetLogs = (params: LogsQueryParams, options: { enabled?: boolean } = {}) => {
  return useInfiniteQuery({
    queryKey: ['admin-logs', 'list', params],
    queryFn: async ({ pageParam, signal }): Promise<LogSearchResult> => {
      const { data } = await axios.get<LogSearchResult>('/admin/logs', {
        signal,
        params: buildParams(params, { beforeId: pageParam }),
      });
      return data;
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: lastPage =>
      lastPage.hasMore ? (lastPage.items.at(-1)?.id ?? undefined) : undefined,
    enabled: options.enabled,
    staleTime: 10_000,
    // Keeps showing the previous page while a new `to` (Live's quiet-window tick, or any other
    // param change) is in flight, instead of flashing to the loading skeleton on every query key
    // change.
    placeholderData: keepPreviousData,
  });
};

/**
 * Request trace tab — every row sharing a CorrelationId, oldest first. Small enough that it
 * never needs pagination; reuses the same endpoint the plan calls out (no dedicated endpoint).
 * Passes an explicit ±60min window around the clicked row (see `aroundRange`) rather than no
 * from/to at all — the BE defaults an omitted range to the last 24h, which misses the trace
 * entirely once the drawer is opened on an older row. Only fetches once the caller says the Trace
 * tab is actually open, not on every row click.
 */
export const useGetLogTrace = (
  correlationId: string | null,
  range: { from: string; to: string } | null,
  enabled: boolean,
) =>
  useQuery({
    queryKey: ['admin-logs', 'trace', correlationId, range],
    queryFn: async ({ signal }): Promise<LogSearchResult> => {
      const { data } = await axios.get<LogSearchResult>('/admin/logs', {
        signal,
        params: {
          q: `corr:${correlationId}`,
          from: range?.from,
          to: range?.to,
          sortDir: 'asc',
          pageSize: 200,
        },
      });
      return data;
    },
    enabled: enabled && !!correlationId && !!range,
    staleTime: 10_000,
  });
