import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@features/auth/store';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { TaskDateType, TaskFilterParams } from '../types';
import {
  readStoredTab,
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
];

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
  const filters = readFiltersFromSearchParams(sp);
  if (pageActivityId) delete filters.activityId;
  const tab = resolveInitialTab(sp, readStoredTab(userId), keys);
  // On the list page the Pool Task Type rides under `poolActivityId`, which the router
  // (activity page dispatch) does not read.
  if (tab === 'pool' && !pageActivityId) {
    const pa = sp.get('poolActivityId');
    if (pa) filters.activityId = pa;
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
  const [filters, setFilters] = useState<TaskFilterParams>(init.filters);

  const [poolSearch, setPoolSearch] = useState(init.poolSearch);
  const debouncedPoolSearch = useDebounce(poolSearch, 400);
  const [poolFilters, setPoolFilters] = useState<TaskFilterParams>(init.poolFilters);

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
      setFilters(seed.filters);
      setPoolSearch(seed.poolSearch);
      setPoolFilters(seed.poolFilters);
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
      else if (v) next.set(personal ? key : 'poolActivityId', String(v));
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
