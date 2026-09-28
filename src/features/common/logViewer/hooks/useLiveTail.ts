import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { buildParams } from '../api/useGetLogs';
import type { LogLevel, LogListItem, LogSearchResult } from '../types';
import { LIVE_WINDOW_HOURS, presetRange, toApiDateTime } from '../utils/range';
import { mergeLiveBuffer, nextDrainStep } from '../utils/liveTail';

const MAX_DRAIN_CALLS_PER_TICK = 5;
const BUFFER_CAP = 500;

interface UseLiveTailOptions {
  enabled: boolean;
  q: string;
  levels: LogLevel[];
  /** Don't start polling until the surrounding view's own data is real for these filters, not
   * keepPreviousData placeholder content left over from whatever was showing before. */
  listIsReady: boolean;
}

async function fetchLivePage(
  q: string,
  levels: LogLevel[],
  extra: Record<string, unknown>,
  signal: AbortSignal,
): Promise<LogSearchResult> {
  const { data } = await axios.get<LogSearchResult>('/admin/logs', {
    signal,
    params: buildParams({ q, levels, pageSize: 200, sortDir: 'desc' }, extra),
  });
  return data;
}

/**
 * Owns every piece of Live-tail state — the buffer, the polling cursor, the quiet-window seed,
 * and the bounded drain — in one place, so every way Live can turn off (the button, a tag click,
 * a preset, a zoom, ...) resets it the SAME way instead of each caller having to remember to
 * clean up by hand.
 *
 * The cursor lives in a ref, not state — it's read (and mutated) by the query function itself,
 * never rendered directly, and keeping it out of the query key means every 5s tick hits the SAME
 * ongoing cache entry rather than spawning a new one per batch.
 */
export function useLiveTail({ enabled, q, levels, listIsReady }: UseLiveTailOptions) {
  const [buffer, setBuffer] = useState<LogListItem[]>([]);
  const cursorRef = useRef<number | null>(null);

  // One place, covers every exit path: Live turning off (however it happened) or the filters
  // changing underneath an ongoing session both mean "start over".
  useEffect(() => {
    setBuffer([]);
    cursorRef.current = null;
  }, [enabled, q, levels]);

  const { data, dataUpdatedAt } = useQuery({
    // Stable per {q, levels} — never the cursor or a timestamp, so every 5s tick is the same
    // ongoing query instead of a new cache entry per batch.
    queryKey: ['admin-logs', 'live-tail', q, levels],
    queryFn: async ({ signal }): Promise<LogListItem[]> => {
      if (cursorRef.current == null) {
        // Quiet window — search a fresh sliding "last 15 minutes" ending now, resolved fresh
        // inside the query function on every tick (not once when the component last rendered),
        // so it's a real sliding window rather than one frozen "now".
        const { from, to } = presetRange(LIVE_WINDOW_HOURS);
        const page = await fetchLivePage(
          q,
          levels,
          { from: toApiDateTime(from), to: toApiDateTime(to) },
          signal,
        );
        cursorRef.current = nextDrainStep(page.items, false, null, 0, 1).cursor;
        return page.items;
      }
      // Seeded — drain forward from the cursor, bounded so one tick can never run away.
      const collected: LogListItem[] = [];
      let cursor: number | null = cursorRef.current;
      let shouldContinue = true;
      let calls = 0;
      while (shouldContinue) {
        const page = await fetchLivePage(q, levels, { afterId: cursor }, signal);
        calls++;
        if (page.items.length > 0) collected.push(...page.items);
        ({ cursor, shouldContinue } = nextDrainStep(
          page.items,
          page.hasMore,
          cursor,
          calls,
          MAX_DRAIN_CALLS_PER_TICK,
        ));
      }
      cursorRef.current = cursor;
      return collected;
    },
    enabled: enabled && listIsReady,
    refetchInterval: 5_000,
    staleTime: 0,
  });

  const lastAppliedRef = useRef(0);
  useEffect(() => {
    if (!data?.length) return;
    if (dataUpdatedAt === lastAppliedRef.current) return;
    lastAppliedRef.current = dataUpdatedAt;
    setBuffer(prev => mergeLiveBuffer(prev, data, BUFFER_CAP));
  }, [data, dataUpdatedAt]);

  return { items: buffer };
}
