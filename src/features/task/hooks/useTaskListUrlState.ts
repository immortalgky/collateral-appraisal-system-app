import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { TaskDateType, TaskFilterParams } from '../types';
import {
  readStoredTab,
  TAB_ACTIVITY_PARAM,
  resolveInitialTab,
  writeStoredTab,
  type ActiveTab,
} from '../config/resolveInitialTab';
import { saveTaskListUrl } from '../utils/taskReturn';

const TASK_FILTER_KEYS: (keyof TaskFilterParams)[] = [
  'appraisalNumber',
  'customerName',
  'status',
  'pendingTaskStatus',
  'slaStatus',
  'assigneeUserId',
  'activityId',
  'purpose',
  'channel',
  'dateType',
  'dateFrom',
  'dateTo',
  'assignedFrom',
  'assignedTo',
  'appointmentFrom',
  'appointmentTo',
  'requestedFrom',
  'requestedTo',
];

const taskTypeKey = (tab: ActiveTab) => TAB_ACTIVITY_PARAM[tab];

/**
 * The old single date range (`dateType` + `dateFrom`/`dateTo`: an older link, a dashboard drill-down,
 * the activity page's dialog) as one of the three separate ranges the list filters by, so the rest
 * of the page only knows those. No type means assigned, as it always did.
 *
 * `legacyWins` says which is the newer word. Read from an address, a range already set under its own
 * keys wins (`false`). Written from code (a dialog applying), the legacy range is what the user just
 * chose, so it REPLACES that range, both ends, and a write with no dates leaves it cleared.
 */
export function normalizeLegacyDates(f: TaskFilterParams, legacyWins = false): TaskFilterParams {
  if (!f.dateType && !f.dateFrom && !f.dateTo) return f;
  const { dateType, dateFrom, dateTo, ...rest } = f;
  const range = dateType === 'appointment' || dateType === 'requested' ? dateType : 'assigned';
  const from = `${range}From` as const;
  const to = `${range}To` as const;
  const out: TaskFilterParams = { ...rest };
  if (legacyWins && (dateFrom || dateTo)) {
    delete out[from];
    delete out[to];
  }
  if (dateFrom && !out[from]) out[from] = dateFrom;
  if (dateTo && !out[to]) out[to] = dateTo;
  return out;
}

/**
 * The inverse, for a dialog that models ONE range: the first of the three that is set, as
 * `dateType` + `dateFrom`/`dateTo`, with that range taken out of the values (so applying changes
 * it and nothing is left behind). The other ranges stay in the values: the dialog does not show
 * them, and applying must not drop them. The activity page's dialog is seeded with it.
 */
export function toLegacyRange(f: TaskFilterParams): TaskFilterParams {
  const ranges = ['assigned', 'appointment', 'requested'] as const;
  const range = ranges.find(r => f[`${r}From`] || f[`${r}To`]);
  if (!range) return f;
  const out: TaskFilterParams = { ...f };
  delete out[`${range}From`];
  delete out[`${range}To`];
  return { ...out, dateType: range, dateFrom: f[`${range}From`], dateTo: f[`${range}To`] };
}

const readFiltersFromSearchParams = (sp: URLSearchParams): TaskFilterParams => {
  const out: TaskFilterParams = {};
  for (const key of TASK_FILTER_KEYS) {
    const v = sp.get(key);
    if (v) {
      if (key === 'dateType') {
        if (v === 'assigned' || v === 'appointment' || v === 'requested') {
          out.dateType = v as TaskDateType;
        }
      } else {
        (out as Record<string, string>)[key] = v;
      }
    }
  }
  return out;
};

function resolveFromUrl(
  sp: URLSearchParams,
  pageActivityId: string | undefined,
  userId: string | undefined,
) {
  const keys = pageActivityId ? TASK_FILTER_KEYS.filter(k => k !== 'activityId') : TASK_FILTER_KEYS;
  const filters = normalizeLegacyDates(readFiltersFromSearchParams(sp));
  if (pageActivityId) delete filters.activityId;
  const tab = resolveInitialTab(sp, readStoredTab(userId), keys);
  // On the list page the Task Type (one id or several, comma-joined) rides under a key of its own
  // per tab. A plain `activityId` would make the router (activity page dispatch) leave this page,
  // and an id list is no activity at all.
  if (!pageActivityId) {
    const own = sp.get(taskTypeKey(tab));
    if (own) filters.activityId = own;
    else delete filters.activityId;
  }
  return {
    tab,
    filters,
    search: sp.get('search') ?? '',
  };
}

// Each tab owns its own state: the resolved URL state fills the resolved tab, the other starts empty.
function splitByTab(r: ReturnType<typeof resolveFromUrl>) {
  const pool = r.tab === 'pool';
  return {
    searchTerm: pool ? '' : r.search,
    filters: pool ? {} : r.filters,
    poolSearch: pool ? r.search : '',
    poolFilters: pool ? r.filters : {},
  };
}

/**
 * Tab + search + filters of a task list (My / Pool), mirrored in the URL so drill-downs,
 * shareable links and returns from a task land on the same list.
 * `pageActivityId` is set on the per-activity page: it is the page identity, so it is always
 * the `activityId` in the URL (a Task Type filter there stays in memory) and it does not
 * count as a drill-down when resolving the tab.
 * Each tab holds its own state in memory only; the URL carries the active tab's state.
 * An external navigation (sidebar link, activity A to B) re-seeds the state from the new URL.
 */
export function useTaskListUrlState(pageActivityId?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname, key: locationKey, state: locationState } = useLocation();
  const navigationType = useNavigationType();
  // If the user isn't loaded yet there is no stored lookup, so we open on My (or the URL tab).
  const userId = useAuthStore(s => s.user?.id);

  // Resolved once on mount.
  const [init] = useState(() => {
    const r = resolveFromUrl(searchParams, pageActivityId, userId);
    return { tab: r.tab, ...splitByTab(r) };
  });

  const [activeTab, setActiveTabState] = useState<ActiveTab>(init.tab);
  const setActiveTab = useCallback(
    (tab: ActiveTab) => {
      setActiveTabState(tab);
      writeStoredTab(userId, tab);
    },
    [userId],
  );

  const [searchTerm, setSearchTerm] = useState(init.searchTerm);
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [filters, setFiltersRaw] = useState<TaskFilterParams>(init.filters);
  // Whatever sets the filters (the activity page's dialog still writes a legacy date range)
  // arrives in the three-range shape.
  const setFilters = useCallback(
    (next: SetStateAction<TaskFilterParams>) =>
      setFiltersRaw(prev =>
        normalizeLegacyDates(typeof next === 'function' ? next(prev) : next, true),
      ),
    [],
  );

  const [poolSearch, setPoolSearch] = useState(init.poolSearch);
  const debouncedPoolSearch = useDebounce(poolSearch, 400);
  const [poolFilters, setPoolFiltersRaw] = useState<TaskFilterParams>(init.poolFilters);
  const setPoolFilters = useCallback(
    (next: SetStateAction<TaskFilterParams>) =>
      setPoolFiltersRaw(prev =>
        normalizeLegacyDates(typeof next === 'function' ? next(prev) : next, true),
      ),
    [],
  );

  const lastKey = useRef(locationKey);
  const lastSaved = useRef('');

  useEffect(() => {
    const navigated = locationKey !== lastKey.current;
    lastKey.current = locationKey;
    // Our own writes carry `taskListOwn`; a new location without it came from outside. Back and
    // Forward land on older entries that carry the tag too, so a POP always counts as external.
    const own = !!(locationState as { taskListOwn?: boolean } | null)?.taskListOwn;
    if (navigated && (navigationType === 'POP' || !own)) {
      // Navigated from outside: take the new URL as the source instead of overwriting it.
      const r = resolveFromUrl(searchParams, pageActivityId, userId);
      const seed = splitByTab(r);
      setActiveTabState(r.tab);
      setSearchTerm(seed.searchTerm);
      setFiltersRaw(seed.filters);
      setPoolSearch(seed.poolSearch);
      setPoolFiltersRaw(seed.poolFilters);
      return;
    }
    const personal = activeTab === 'personal';
    // Wait for the typing to settle: the URL follows the debounced search.
    if (personal ? searchTerm !== debouncedSearch : poolSearch !== debouncedPoolSearch) return;
    const search = personal ? debouncedSearch : debouncedPoolSearch;
    const tabFilters = personal ? filters : poolFilters;
    const next = new URLSearchParams();
    next.set('tab', activeTab);
    if (search) next.set('search', search);
    for (const key of TASK_FILTER_KEYS) {
      const v = tabFilters[key];
      if (key !== 'activityId') {
        if (v) next.set(key, String(v));
      } else if (pageActivityId) next.set(key, pageActivityId);
      else if (v) next.set(taskTypeKey(activeTab), String(v));
    }
    const nextStr = next.toString();
    // Only write when the string actually differs — avoids an endless loop.
    if (nextStr !== searchParams.toString()) {
      setSearchParams(next, { replace: true, state: { taskListOwn: true } });
    }
    const url = `${pathname}?${nextStr}`;
    if (url !== lastSaved.current) {
      if (saveTaskListUrl(url)) lastSaved.current = url;
    }
  }, [
    activeTab,
    searchTerm,
    debouncedSearch,
    poolSearch,
    debouncedPoolSearch,
    filters,
    poolFilters,
    pageActivityId,
    searchParams,
    pathname,
    locationKey,
    locationState,
    navigationType,
    userId,
    setSearchParams,
  ]);

  return {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    filters,
    setFilters,
    poolSearch,
    setPoolSearch,
    debouncedPoolSearch,
    poolFilters,
    setPoolFilters,
  };
}
