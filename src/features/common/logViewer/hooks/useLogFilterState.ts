import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LOG_LEVELS, type LogLevel } from '../types';
import {
  DEFAULT_RANGE_HOURS,
  isPresetHours,
  toApiDateTime,
  validateRange,
  type RangeState,
} from '../utils/range';

/** A custom range read from a shared link isn't trustworthy — the URL could be stale (beyond
 * retention by now), hand-edited, or just malformed — so it goes through the same `validateRange`
 * check the custom-range popover uses, falling back to the default preset rather than handing an
 * invalid range straight to the queries. */
export function parseInitialRange(searchParams: URLSearchParams): RangeState {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (validateRange(fromDate, toDate) == null) {
      return { kind: 'custom', from: fromDate, to: toDate };
    }
  }
  const hours = Number(searchParams.get('range'));
  return { kind: 'preset', hours: isPresetHours(hours) ? hours : DEFAULT_RANGE_HOURS, nonce: 0 };
}

function parseInitialLevels(searchParams: URLSearchParams): Set<LogLevel> {
  const raw = searchParams.get('levels');
  if (!raw) return new Set(LOG_LEVELS);
  const valid = raw.split(',').filter((l): l is LogLevel => (LOG_LEVELS as string[]).includes(l));
  return valid.length > 0 ? new Set(valid) : new Set(LOG_LEVELS);
}

export type LogViewerTab = 'logs' | 'health';

/**
 * Holds the log viewer's shareable filter state (query, range, levels) and keeps it mirrored to
 * the URL, the same way AppraisalListPage does — read once on mount, then a single effect
 * rebuilds the query string from state on every change so "copy link" always reproduces the view.
 */
export function useLogFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initRef = useRef({
    q: searchParams.get('q') ?? '',
    levels: parseInitialLevels(searchParams),
    range: parseInitialRange(searchParams),
    view: (searchParams.get('view') === 'health' ? 'health' : 'logs') as LogViewerTab,
  });
  const init = initRef.current;

  const [appliedQuery, setAppliedQuery] = useState(init.q);
  const [levels, setLevels] = useState<Set<LogLevel>>(init.levels);
  const [range, setRange] = useState<RangeState>(init.range);
  const [view, setView] = useState<LogViewerTab>(init.view);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (view === 'health') params.view = 'health';
    if (appliedQuery) params.q = appliedQuery;
    if (levels.size < LOG_LEVELS.length) params.levels = [...levels].join(',');
    if (range.kind === 'preset') {
      if (range.hours !== DEFAULT_RANGE_HOURS) params.range = String(range.hours);
    } else {
      params.from = toApiDateTime(range.from);
      params.to = toApiDateTime(range.to);
    }
    setSearchParams(params, { replace: true });
  }, [view, appliedQuery, levels, range, setSearchParams]);

  return { appliedQuery, setAppliedQuery, levels, setLevels, range, setRange, view, setView };
}
