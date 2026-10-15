import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { presetRange, toApiDateTime } from '../utils/range';
import type { CurrentMachineMetric, SystemMetricsResult } from '../types/metrics';

export interface SystemMetricsParams {
  from: string;
  to: string;
  buckets?: number;
}

/**
 * GET /admin/system-metrics — bucketed CPU/memory/queue/p95/rpm/5xx per machine, for the strip
 * under the log histogram and the health tab's charts. `refetchInterval` is left off by default
 * (the strip doesn't poll); the health tab passes 60s, matching the server's sample rate. Keeps
 * the previous result visible while a new `to` is in flight, same reason as `useGetLogSummary` —
 * otherwise the strip flashes/unmounts on every key change.
 */
export const useGetSystemMetrics = (
  params: SystemMetricsParams,
  options: { enabled?: boolean; refetchInterval?: number } = {},
) =>
  useQuery({
    queryKey: ['system-metrics', params],
    queryFn: async ({ signal }): Promise<SystemMetricsResult> => {
      const { data } = await axios.get<SystemMetricsResult>('/admin/system-metrics', {
        signal,
        params,
      });
      return data;
    },
    enabled: options.enabled,
    refetchInterval: options.refetchInterval,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

/**
 * Health tab's own polling variant of the query above — a rolling "last `hours`" window that
 * actually slides forward on every refetch. `presetRange(hours)` (which resolves against
 * `new Date()`) runs freshly INSIDE the query function on every fetch, including each scheduled
 * refetch tick, rather than once when the component last rendered with new props. The query key
 * is kept stable on `hours`/`buckets` alone (never on the resolved from/to timestamps), so
 * react-query treats every tick as the same ongoing query instead of a brand new one.
 */
export const useGetHealthSystemMetrics = (
  hours: number,
  buckets: number,
  options: { refetchInterval?: number } = {},
) =>
  useQuery({
    queryKey: ['system-metrics', 'health', hours, buckets],
    queryFn: async ({ signal }): Promise<SystemMetricsResult> => {
      const { from, to } = presetRange(hours);
      const { data } = await axios.get<SystemMetricsResult>('/admin/system-metrics', {
        signal,
        params: { from: toApiDateTime(from), to: toApiDateTime(to), buckets },
      });
      return data;
    },
    refetchInterval: options.refetchInterval,
    staleTime: 30_000,
  });

/**
 * GET /admin/system-metrics/current — one row per machine that sampled in the last 10 minutes.
 * The health tab's per-machine cards pass `refetchInterval: 60_000` to match the server's sample
 * rate; the Logs view's strip only wants this once (for its colour registry — see
 * machineColors.unionMachineNames), so it omits the interval rather than polling a card it never
 * shows.
 */
export const useGetCurrentSystemMetrics = (
  options: { enabled?: boolean; refetchInterval?: number } = {},
) =>
  useQuery({
    queryKey: ['system-metrics', 'current'],
    queryFn: async ({ signal }): Promise<CurrentMachineMetric[]> => {
      const { data } = await axios.get<CurrentMachineMetric[]>('/admin/system-metrics/current', {
        signal,
      });
      return data;
    },
    enabled: options.enabled,
    refetchInterval: options.refetchInterval,
    staleTime: 30_000,
  });
