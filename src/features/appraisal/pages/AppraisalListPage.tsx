import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHasPermission } from '@/shared/hooks/useHasPermission';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import { SearchByInput } from '@/shared/components/inputs';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import GroupSidebar from '@/shared/components/GroupSidebar';
import {
  useAppraisalSearch,
  useAppraisalSearchCounts,
  useAppraisalGroups,
  useSmartViews,
  useSavedSearches,
  useCreateSavedSearch,
  useDeleteSavedSearch,
  exportAppraisals,
  MAX_EXPORT_ROWS,
  type AppraisalDto,
  type AppraisalGroupBy,
  type SmartViewDto,
  type SavedSearchDto,
} from '../api/appraisalSearch';
import {
  makeAppraisalFilters,
  makeAppraisalColumns,
  expandFilterKeys,
  effectiveSort,
  nextAppraisalSort,
  APPRAISAL_DEFAULT_HIDDEN_COLUMNS,
} from '../components/search/tabConfigs';
import {
  ColumnVisibilityDropdown,
  neutralToolButtonClass,
  useColumnAutoFit,
  useColumnVisibility,
  useColumnWidths,
  useRowNumberColumn,
} from '@/shared/components/columnLayout';
import type { ColumnLayoutConfig } from '@/shared/components/columnLayout';
import FilterChipBar from '../components/search/FilterChipBar';
import { needsOwnRow } from '../components/search/chipOverflow';
import SearchSuggest from '../components/search/SearchSuggest';
import AppraisalEmptyState from '../components/search/AppraisalEmptyState';
import SmartViewBar from '../components/search/SmartViewBar';
import SavedSearchesDropdown from '../components/search/SavedSearchesDropdown';
import AppraisalResultsTable from '../components/search/AppraisalResultsTable';
import ActivityTrackingSlideOver from '../components/search/ActivityTrackingSlideOver';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import DataErrorState from '@/shared/components/DataErrorState';
import { useDelayedFlag } from '@/shared/hooks/useDelayedFlag';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import {
  KEYBOARD_RING,
  KEYBOARD_RING_PLAIN,
  NO_OUTLINE,
  usePointerMode,
} from '@/shared/hooks/usePointerMode';
import { useAuthStore } from '@/features/auth/store';
import { MIN_SEARCH_LENGTH } from '@shared/api/search';
import { useAppraisalTypeLabel, useProvinceName } from '@/shared/hooks/useCodeLabels';

// `q` is accepted as an inbound alias for `search` so a link built by the global search bar works
// either way. It is normalised to `search` on mount and never written back, so the canonical URL
// stays single-form.
const NON_FILTER_KEYS = new Set([
  'search',
  'q',
  'searchField',
  'page',
  'pageSize',
  'sortBy',
  'sortDir',
  'view',
  // Deep-links straight into the activity slide-over. The global search bar sends a credit user
  // here rather than to /appraisals/{id}: they have no access to the workspace, so that route
  // would only bounce them to '/'. Read on mount, then stripped from the URL — it is a one-shot
  // instruction, not a piece of view state, and leaving it behind would re-open the panel on
  // every refresh after the user had closed it.
  'appraisal',
]);

/** localStorage namespace for this screen's column layout. */
const COLUMN_STORAGE_KEY = 'appraisal-list-columns';

/**
 * Version of the saved column order and visibility. Bump (any new random code) whenever a change to
 * the default columns should reset everyone's saved order and visibility: every toggle in the column
 * picker saves the whole order, so without a new key the new defaults would never reach anyone who
 * has touched it.
 * Only visibility uses it — widths, density and the row-number switch keep COLUMN_STORAGE_KEY,
 * so those preferences survive a reset.
 */
const COLUMN_LAYOUT_VERSION = 'd5ba1671';

/**
 * Which column the free-text box searches.
 *
 * 'all' is the default and keeps today's behaviour exactly: a semi-join across every searchable
 * field. The narrower options map to the dedicated backend filters in AppraisalFilterBuilder.
 *
 * Only 'appraisalNumber' is dramatically cheaper: it is the one pinned filter that leaves
 * `requiresView` false, so the count resolves off appraisal.Appraisals instead of dragging the
 * whole query through the view (measured on 105k rows: 1,401 ms for the OR across three columns
 * against 71 ms pinned). 'customerName' and 'requestNumber' both set `requiresView = true` and
 * still run a leading-wildcard LIKE over a column the view's APPLYs compute, so they are narrower
 * in RESULTS but not necessarily faster — do not sell them to the user as a speed-up.
 *
 * All three pinned filters are `LIKE '%' + @x + '%'`, i.e. substring. That differs from 'all',
 * which goes through the glob helper (prefix by default, leading `*` to widen) — hence the two
 * hint strings below.
 */
const SEARCH_FIELDS = ['all', 'appraisalNumber', 'customerName', 'requestNumber'] as const;
type SearchField = (typeof SEARCH_FIELDS)[number];

const SEARCH_FIELD_ICONS: Record<SearchField, string> = {
  all: 'magnifying-glass',
  appraisalNumber: 'building',
  customerName: 'user',
  requestNumber: 'file-lines',
};

/**
 * Each scope's tint, the way the top bar's quick search tints its scope: only the SELECTED scope
 * shows its hue (number blue, customer purple, request number amber — the top bar's own palette);
 * every unselected chip is the same plain gray, and "all" selected stays the neutral gray.
 * `chip` is a chip at rest, `chipActive` the scope in use (a stronger fill and a ring), `pill` the
 * box's pill while that scope is selected. Whole class strings, because Tailwind
 * scans source text and cannot see a built-up `bg-${hue}-100`.
 */
const NEUTRAL_CHIP = 'bg-gray-50 text-gray-600 hover:bg-gray-100';

const SEARCH_FIELD_TONES: Record<SearchField, { chip: string; chipActive: string; pill: string }> =
  {
    all: {
      chip: NEUTRAL_CHIP,
      chipActive: 'bg-gray-200 text-gray-600 ring-1 ring-inset ring-gray-300',
      pill: 'bg-gray-100 text-gray-500',
    },
    appraisalNumber: {
      chip: NEUTRAL_CHIP,
      chipActive: 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-300',
      pill: 'bg-blue-100 text-blue-700',
    },
    customerName: {
      chip: NEUTRAL_CHIP,
      chipActive: 'bg-purple-100 text-purple-700 ring-1 ring-inset ring-purple-300',
      pill: 'bg-purple-100 text-purple-700',
    },
    requestNumber: {
      chip: NEUTRAL_CHIP,
      chipActive: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300',
      pill: 'bg-amber-100 text-amber-800',
    },
  };

/**
 * Filters drawn as a button even when unset — the ones reached for on most visits. The company
 * stands in for "assignee": it is the only assignee the list can offer as a choice (internal
 * appraisers have a user code but no picker here).
 */
const PINNED_FILTERS = [
  'status',
  'priority',
  'purpose',
  'assigneeCompanyId',
  'province',
  'appointment',
];

/**
 * Fields the group rail can group by. Each is also a filter key of the list, which is how picking a
 * group works: it sets that filter.
 */
const GROUP_FIELDS: readonly AppraisalGroupBy[] = [
  'status',
  'slaStatus',
  'priority',
  'province',
  'assignmentType',
];

const RECENT_KEY = 'appraisal-search-recent';
/** A stored list, or [] when it is missing, blocked, corrupt or not a list of strings. */
const readRecent = (key: string): string[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
const RECENT_MAX = 5;

const isSearchField = (v: string | null): v is SearchField =>
  v !== null && (SEARCH_FIELDS as readonly string[]).includes(v);

/**
 * Reads a stored sort that predates the "unsorted" state.
 *
 * Before sorting had an off position, an ascending CreatedAt sort was stored as
 * `{sortBy: undefined, sortDir: 'asc'}` — which now reads as unsorted and would quietly return
 * newest-first, the opposite of what was saved. A direction with no field means CreatedAt in that
 * direction. Written once because two copies of this rule, in the URL reader and the saved-search
 * loader, would eventually disagree.
 *
 * The SLA column used to sort by `slaStatus` and now sorts by `slaDueDate`: a link or saved search
 * holding the old field is read as the new one, so its header still shows as the active sort.
 */
const restoreSort = (sortBy: string | null | undefined, sortDir: string | null | undefined) =>
  sortBy
    ? {
        sortBy: sortBy.toLowerCase() === 'slastatus' ? 'slaDueDate' : sortBy,
        sortDir: sortDir || 'desc',
      }
    : sortDir
      ? { sortBy: 'CreatedAt', sortDir }
      : { sortBy: '', sortDir: 'desc' };

function AppraisalListPage() {
  const { t } = useTranslation(['appraisal', 'common']);
  // Memoized because these feed the column-layout hooks: rebuilding the array every render would
  // hand useColumnVisibility a new config identity each time. Translating 16 labels on every
  // render is wasted work regardless.
  // The column set is the SAME for everyone. Trimming it for credit-side users was tried and
  // reverted: this is one shared screen, and a reader who knows the table is worse off when
  // columns silently move. Whatever those users must not receive is withheld by the server
  // (AppraisalFieldScope), so the affected cells simply render as "—".
  //
  // Export below is the exception, and it is a real control rather than presentation.
  const canExport = useHasPermission('APPRAISAL_VIEW');
  // The group and column buttons beside the filter bar: the keyboard ring only, never after the mouse.
  const { pointerMode: toolsPointer, onPointerDownCapture: onToolsPointerDown } = usePointerMode();
  const { pointerMode: searchPointer, onPointerDownCapture: onSearchPointerDown } =
    usePointerMode();

  const appraisalTypeLabel = useAppraisalTypeLabel();
  // The type filter reads its wording from the AppraisalType parameter too, so the chip and the
  // row say the same thing. i18n stays as the fallback while the parameter store loads.
  const appraisalFilters = useMemo(
    () =>
      makeAppraisalFilters(t).map(f =>
        f.key === 'appraisalType'
          ? {
              ...f,
              options: f.options?.map(o => ({
                ...o,
                label: appraisalTypeLabel(o.value) ?? o.label,
              })),
            }
          : f,
      ),
    [t, appraisalTypeLabel],
  );
  const appraisalColumns = useMemo(() => makeAppraisalColumns(t), [t]);
  /**
   * The keys the URL and the chips speak. Expanded from the filter list because a date-range
   * control owns two of them — see expandFilterKeys.
   */
  const filterKeys = useMemo(
    () => expandFilterKeys(appraisalFilters, t('common:range.from'), t('common:range.to')),
    [appraisalFilters, t],
  );
  const VALID_FILTER_KEYS = useMemo(() => new Set(filterKeys.map(f => f.key)), [filterKeys]);
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL (once on mount)
  const initRef = useRef({
    search: searchParams.get('search') || searchParams.get('q') || '',
    page: Number(searchParams.get('page')) || 0,
    pageSize: Number(searchParams.get('pageSize')) || 25,
    searchField: (isSearchField(searchParams.get('searchField'))
      ? searchParams.get('searchField')
      : 'all') as SearchField,
    // '' is the unsorted state — the server falls back to CreatedAt DESC, which the header shows
    // as the active sort. Held as empty rather than as 'CreatedAt' so a default load sends and
    // writes nothing, and "off" stays a state a click can return to.
    ...restoreSort(searchParams.get('sortBy'), searchParams.get('sortDir')),
    view: searchParams.get('view') || null,
    filters: (() => {
      const f: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        if (!NON_FILTER_KEYS.has(key) && value && VALID_FILTER_KEYS.has(key)) f[key] = value;
      });
      return f;
    })(),
  });
  const init = initRef.current;

  const [searchField, setSearchField] = useState<SearchField>(init.searchField);
  const [searchTerm, setSearchTerm] = useState(init.search);
  const [debouncedSearch, setDebouncedSearch] = useState(init.search);
  const [pageNumber, setPageNumber] = useState(init.page);
  const [pageSize, setPageSize] = useState(init.pageSize);
  const [sortBy, setSortBy] = useState(init.sortBy);
  const [sortDir, setSortDir] = useState(init.sortDir);
  const [filters, setFilters] = useState<Record<string, string>>(init.filters);
  const [activeViewKey, setActiveViewKey] = useState<string | null>(init.view);
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<AppraisalGroupBy | null>(null);
  const [density, setDensity] = useLocalStorage<'comfortable' | 'compact'>(
    `${COLUMN_STORAGE_KEY}-density`,
    'comfortable',
  );
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(-1);
  // Whether the text box has the focus: the "/" hint is only shown while it does not.
  const [boxFocused, setBoxFocused] = useState(false);
  // Where the filter bar goes: beside the search as one line, or — when it cannot be one line
  // there — on a full-width row below it. `filterNeed` is the width the bar takes on one line
  // (reported by the bar), `room` what is left beside the search once the tools and the search's
  // own width are taken out of the row.
  const rowRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [filterNeed, setFilterNeed] = useState(0);
  const [rowRoom, setRowRoom] = useState<number | null>(null);
  const [filtersOwnRow, setFiltersOwnRow] = useState(false);
  // Per user: recent terms are often customer names, and a branch PC is shared between officers.
  const currentUsername = useAuthStore(s => s.user?.username);
  // Re-read whenever the key changes: useLocalStorage reads once at mount, so a username that
  // resolved late would keep showing — and then saving over — another key's list.
  const recentKey = currentUsername ? `${RECENT_KEY}:${currentUsername}` : null;
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    setRecentSearches(recentKey ? readRecent(recentKey) : []);
  }, [recentKey]);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  /** Set when a suggestion opens the slide-over; swallows the focus it returns on close. */
  const skipFocusOpen = useRef(false);
  const provinceName = useProvinceName();

  /**
   * Open the activity panel for `?appraisal=`, then strip it from the URL.
   *
   * An EFFECT, not a mount-time read of initRef. The global search bar sends a caller who cannot
   * open the workspace here, and that caller is very often ALREADY on this page — clicking a
   * result then changes the query string without remounting the route, so anything read once at
   * mount never runs and the click appears to do nothing at all.
   *
   * The parameter must not survive: it is a one-shot instruction, not view state. Left in the URL
   * it re-opens the panel on every reload after the user has closed it, and the same appraisal
   * cannot be opened from search twice in a row because the URL never changes the second time.
   *
   * The invariant that removes it: the sync effect below is the ONLY writer of this query string,
   * and it re-runs on this navigation because `setSearchParams` is in its dependency array and
   * react-router gives that callback a new identity on every `location.search` change. It then
   * rebuilds the string from state, in which `appraisal` has no place — so it is dropped.
   *
   * ⚠ That is load-bearing. Anyone who stabilises `setSearchParams` — a ref wrapper, a useEvent
   * shim, or a react-router version that memoises on a ref rather than on `searchParams` — breaks
   * the strip and brings both symptoms back. If that happens, remove the parameter explicitly
   * here rather than adding a second writer, which is what caused the fight this replaced.
   */
  useEffect(() => {
    const deepLinked = searchParams.get('appraisal');
    if (!deepLinked) return;
    setSelectedAppraisalId(deepLinked);
    // Reads the parameter; does NOT remove it. The sync effect below owns this query string and
    // rebuilds it from state, which drops `appraisal` on its own. Having both write the URL made
    // them fight: react-router rebuilds `setSearchParams` whenever `location.search` changes, so
    // the sync effect — which depends on it — re-ran on this very navigation and put the parameter
    // straight back. The panel then reopened on every refresh, and clicking the same search result
    // a second time did nothing, because the URL never changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('appraisal')]);

  // Debounce search input.
  //
  // Terms below the minimum are never sent. The server matches nothing on them — every appraisal
  // number shares its first two digits, so a shorter term is not a search — and a request would
  // come back as an ordinary empty page, indistinguishable from "no such appraisal". The hint
  // below the box says so instead.
  const isSearchTooShort =
    searchTerm.trim().length > 0 && searchTerm.trim().length < MIN_SEARCH_LENGTH;
  useEffect(() => {
    const term = searchTerm.trim();
    const next = term.length >= MIN_SEARCH_LENGTH ? searchTerm : '';
    const timer = setTimeout(() => setDebouncedSearch(next), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page on search/filter/sort change
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, searchField, filters, sortBy, sortDir]);

  // Sync all state to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    // Only when it is doing something: 'all' is the default, and writing it would put a parameter
    // in every shared link that means "no change".
    if (searchField !== 'all') params.searchField = searchField;
    if (pageNumber > 0) params.page = String(pageNumber);
    if (pageSize !== 25) params.pageSize = String(pageSize);
    if (sortBy) params.sortBy = sortBy;
    if (sortBy && sortDir !== 'desc') params.sortDir = sortDir;
    if (activeViewKey) params.view = activeViewKey;
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
    // Rebuilt from state, wholesale. Safe for the filters — they live in state, seeded from the
    // URL at mount — and it is what strips the one-shot `?appraisal=` the global search bar
    // arrives with. A merge that preserved `appraisal` put it back on every sync and left the
    // panel reopening on refresh.
    setSearchParams(params, { replace: true });
  }, [
    debouncedSearch,
    searchField,
    pageNumber,
    pageSize,
    sortBy,
    sortDir,
    filters,
    activeViewKey,
    setSearchParams,
  ]);

  // Data hooks
  // The term goes to exactly one parameter — either the broad `search` or the pinned column — so
  // the backend never sees both and cannot AND them together.
  const searchParam = useMemo(() => {
    const term = debouncedSearch || undefined;
    if (!term) return {};
    return searchField === 'all' ? { search: term } : { [searchField]: term };
  }, [debouncedSearch, searchField]);

  /**
   * Filters minus the ones that hold nothing.
   *
   * A chip whose values were all unticked stays on screen (so its panel does not close under the
   * cursor) by keeping its key with an empty value — which has no business travelling to the API
   * as `?status=`.
   */
  const activeFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
    [filters],
  );

  const { data, isLoading, isFetching, isPlaceholderData, isError, error, refetch } =
    useAppraisalSearch({
      ...searchParam,
      pageNumber,
      pageSize,
      // Unsorted sends neither: the API orders by CreatedAt DESC when SortBy is missing.
      sortBy: sortBy || undefined,
      sortDir: sortBy ? sortDir : undefined,
      ...activeFilters,
    });

  // Loading feedback: true only while a request is in flight (not during typing/debounce)
  const isSearchPending = isFetching;

  // The table skeleton shows immediately on the first load — there is nothing else to put on
  // screen — but on a refetch it waits until the request has actually been slow. Typical
  // responses are a few hundred milliseconds, and a skeleton that appears and vanishes inside
  // that reads as the screen glitching rather than as feedback. `keepPreviousData` holds the
  // previous page in the meantime, and the search box keeps its own spinner throughout.
  const isSlowRefetch = useDelayedFlag(isFetching && !isLoading, 250);
  const showSkeleton = isLoading || isSlowRefetch;

  const { data: smartViews = [] } = useSmartViews();
  const { data: savedSearches = [] } = useSavedSearches('appraisal');
  const createSavedSearch = useCreateSavedSearch();
  const deleteSavedSearch = useDeleteSavedSearch();

  // What the header marks as sorted: the user's choice, or — when there is none — the order the API
  // falls back to. `sortBy` stays '' for "no choice" so nothing extra is sent or written to the URL.
  const shownSort = effectiveSort(sortBy, sortDir);

  const items = data?.result.items ?? [];
  const totalCount = data?.result.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // The running row number has to be derived from the response these rows came in, not from the
  // local paging state. `keepPreviousData` means `items` lags one fetch behind, so after clicking
  // "next page" the local pageNumber is already 1 while the rows on screen are still page 0's —
  // numbering them 26-50 until the new page lands. The server echoes back the page it served, so
  // the numbers and the rows always agree. Note pageSize is echoed as the *effective* size, which
  // the API clamps, so this also stays right when a caller asks for more than the maximum.
  const servedPageNumber = data?.result.pageNumber ?? 0;
  const servedPageSize = data?.result.pageSize ?? pageSize;

  // Handlers
  /**
   * Three states per column, cycled by clicking: ascending → descending → off.
   *
   * "Off" is not "sort by Created again" — it clears the choice, so the list goes back to whatever
   * order the server gives by default, and the header then shows that default as the active sort
   * (see `shownSort`). nextAppraisalSort holds the rule, including the default column's own cycle.
   */
  const handleSort = (field: string) => {
    const next = nextAppraisalSort(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setActiveViewKey(null);
  };

  const handleRemoveFilter = (key: string) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setActiveViewKey(null);
  };

  const handleClearFilters = () => {
    setFilters({});
    setActiveViewKey(null);
  };

  const handleSelectAll = () => {
    handleClearFilters();
    setSearchTerm('');
    setDebouncedSearch('');
  };

  /**
   * Picking a group filters the list to it through that field's own filter, so it shows as a chip
   * and clears like one. Picking the active group again clears it.
   */
  const handleGroupSelect = (key: string | null) => {
    if (!groupBy) return;
    if (key === null) handleRemoveFilter(groupBy);
    else handleFilterChange(groupBy, key);
  };

  const handleSmartView = (view: SmartViewDto) => {
    setFilters(view.filters);
    setActiveViewKey(view.key);
    setSearchTerm('');
    setDebouncedSearch('');
  };

  const handleLoadSavedSearch = (search: SavedSearchDto) => {
    try {
      const parsed = JSON.parse(search.filtersJson) as Record<string, string>;
      // Through the same whitelist the URL uses. The chip bar draws from the FilterField list, so a
      // stored key with no field (a renamed filter, or backend-valid ones like district/channel
      // that this screen never offered) would reach the API while drawing no chip — a filter the
      // user cannot see, let alone remove.
      setFilters(
        Object.fromEntries(
          Object.entries(parsed).filter(([k, v]) => v !== '' && VALID_FILTER_KEYS.has(k)),
        ),
      );
      // Assigned unconditionally: a search saved while unsorted carries no sortBy, and skipping
      // the call left whatever the user happened to be sorting by still applied.
      //
      // The migration guards searches written before sorting had an "off" state: back then an
      // ascending CreatedAt sort was stored as {sortBy: undefined, sortDir: 'asc'}, which now reads
      // as unsorted and would quietly return newest-first — the opposite of what was saved.
      const sort = restoreSort(search.sortBy, search.sortDir);
      setSortBy(sort.sortBy);
      setSortDir(sort.sortDir);
      setActiveViewKey(null);
    } catch {
      /* ignore invalid JSON */
    }
  };

  const handleSaveSearch = (name: string) => {
    createSavedSearch.mutate({
      name,
      entityType: 'appraisal',
      // activeFilters, not filters: a chip whose values were all unticked is a live UI state, not
      // a filter. Stored, it came back on every load as a "Status: Any" chip that filtered nothing
      // and could not be explained.
      filtersJson: JSON.stringify(activeFilters),
      sortBy: sortBy || undefined,
      sortDir: sortBy && sortDir !== 'desc' ? sortDir : undefined,
    });
  };

  // ── Column layout ───────────────────────────────────────────────────────────
  const tableRef = useRef<HTMLTableElement>(null);

  const columnConfig = useMemo<ColumnLayoutConfig<string>>(
    () => ({
      columns: appraisalColumns.map(c => c.key),
      // The appraisal number is the row's identity and its link target, so it is forced to
      // index 0 and cannot be hidden — and AppraisalResultsTable holds it (with the row number)
      // in place while the table scrolls sideways.
      pinnedColumn: 'appraisalCustomer',
      defaultWidths: Object.fromEntries(
        appraisalColumns.filter(c => c.width).map(c => [c.key, c.width!]),
      ),
      defaultHidden: APPRAISAL_DEFAULT_HIDDEN_COLUMNS,
    }),
    [appraisalColumns],
  );

  const {
    visibleColumns,
    orderedColumns,
    hidden,
    hiddenBeyondDefault,
    isCustomized,
    alwaysVisible,
    toggleColumn,
    reorderColumns,
    resetToDefault,
  } = useColumnVisibility(`${COLUMN_STORAGE_KEY}@${COLUMN_LAYOUT_VERSION}`, columnConfig);
  const { widths, setWidth, resetWidths, hasCustomWidths } = useColumnWidths(
    COLUMN_STORAGE_KEY,
    columnConfig,
  );
  const { showRowNumber, toggleRowNumber } = useRowNumberColumn(COLUMN_STORAGE_KEY);
  const getAutoFitWidth = useColumnAutoFit(tableRef, { leadingCells: showRowNumber ? 1 : 0 });

  /**
   * Icons follow what the quotation listing already uses for the same concepts, so the two
   * scoped-search boxes in the product read the same way.
   */
  const searchFieldOptions = useMemo(
    () =>
      SEARCH_FIELDS.map(f => ({
        value: f,
        label: t(`list.searchFieldOptions.${f}`),
        icon: SEARCH_FIELD_ICONS[f],
        chip: SEARCH_FIELD_TONES[f].chip,
        chipActive: SEARCH_FIELD_TONES[f].chipActive,
        pillClass: SEARCH_FIELD_TONES[f].pill,
      })),
    [t],
  );

  // ── Search suggestions ──────────────────────────────────────────────────────
  const addRecent = (term: string) => {
    const v = term.trim();
    if (v.length < MIN_SEARCH_LENGTH || !recentKey) return;
    const next = [v, ...recentSearches.filter(r => r !== v)].slice(0, RECENT_MAX);
    setRecentSearches(next);
    try {
      localStorage.setItem(recentKey, JSON.stringify(next));
    } catch {
      // Storage blocked or full: the list still works for this visit.
    }
  };

  // The table's own result answers the box once it has caught up with what is typed. Until then
  // (debounce, or keepPreviousData still showing the last term) the panel shows a spinner rather
  // than rows that belong to a different search.
  const isSuggestSettled =
    Boolean(debouncedSearch) &&
    debouncedSearch.trim() === searchTerm.trim() &&
    !isPlaceholderData &&
    !isFetching;

  const otherFields = useMemo(() => SEARCH_FIELDS.filter(f => f !== searchField), [searchField]);
  // Untrimmed, as searchParam sends it — otherwise a trailing space makes the count disagree with
  // the table the user lands on after picking that field.
  const otherCounts = useAppraisalSearchCounts(
    debouncedSearch,
    otherFields,
    activeFilters,
    suggestOpen && Boolean(debouncedSearch),
  );
  // Other fields' counts answer the debounced term; while the box is ahead of it they describe a
  // different search, so they read as loading. (Not memoised: otherCounts is new every render.)
  const fieldCounts = {
    ...(debouncedSearch.trim() === searchTerm.trim() ? otherCounts : {}),
    // null on error (renders "—"), not the 0 an errored query leaves in totalCount.
    [searchField]: isError ? null : isSuggestSettled ? totalCount : undefined,
  };

  // Also on settling: the spinner row gives way to result rows, so an index would point elsewhere.
  useEffect(() => setSuggestIndex(-1), [searchTerm, suggestOpen, isSuggestSettled]);

  const closeSuggest = () => {
    setSuggestOpen(false);
    setSuggestIndex(-1);
  };

  const handleSearchKeyDown = (e: ReactKeyboardEvent) => {
    // Anywhere in the panel (a scope chip, a result row): Esc closes it and hands focus back to the
    // box, without reopening it.
    if (
      e.key === 'Escape' &&
      e.target instanceof HTMLElement &&
      e.target.closest('[data-suggest-panel]')
    ) {
      closeSuggest();
      skipFocusOpen.current = true;
      searchWrapRef.current?.querySelector('input')?.focus();
      return;
    }
    // Only the text box drives the panel — the field picker's menu handles its own arrows.
    if (!(e.target instanceof HTMLInputElement)) return;
    // An IME (Chinese, Japanese…) uses Enter and the arrows to pick a candidate — not ours.
    if (e.nativeEvent.isComposing) return;
    const rows = Array.from(
      searchWrapRef.current?.querySelectorAll<HTMLElement>('[data-suggest-item]') ?? [],
    );
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestOpen(true);
      if (rows.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      // From no selection, Up goes to the last row, not the one before it.
      setSuggestIndex(i =>
        i < 0 ? (step > 0 ? 0 : rows.length - 1) : (i + step + rows.length) % rows.length,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestIndex >= 0 && rows[suggestIndex]) {
        rows[suggestIndex].click();
        return;
      }
      addRecent(searchTerm);
      closeSuggest();
    } else if (e.key === 'Escape') {
      closeSuggest();
      e.target.blur();
    }
  };

  // Room beside the search: the row less the tools, the two gaps and the search's MIN width
  // (22rem). The search grows to fill whatever the chips leave, so measuring against its grown
  // width would always push the filters below; against its minimum, they stay beside it whenever
  // they fit with it at that. Observed, so a resized window or a tools cluster that gains a button
  // moves the filters in the same frame.
  useEffect(() => {
    const row = rowRef.current;
    const tools = toolsRef.current;
    if (!row || !tools) return;
    const read = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 14;
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      setRowRoom(
        Math.floor(row.clientWidth - tools.getBoundingClientRect().width - gap * 2 - rem * 22),
      );
    };
    read();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read);
    ro?.observe(row);
    ro?.observe(tools);
    return () => ro?.disconnect();
  }, []);
  useEffect(() => {
    if (rowRoom === null) return;
    setFiltersOwnRow(was => needsOwnRow(filterNeed, rowRoom, was));
  }, [filterNeed, rowRoom]);

  // ── Keyboard: "/" to search, j/k to walk the rows ──────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || selectedAppraisalId) return;
      // Only from the page itself or from inside the table. Anywhere else — a text box, an open
      // filter panel or menu (portalled, so not under this page) — the keys belong to that control.
      const el = e.target as HTMLElement | null;
      const fromPage = !el || el === document.body || Boolean(tableRef.current?.contains(el));
      if (e.key === '/') {
        // From anywhere on the page except while typing (a text box, select or contenteditable)
        // or inside a dialog, menu or popover panel: those own their keys. Unlike j/k it does not
        // need the focus to be on the body or the table — a button just clicked is fine.
        const typing = el?.closest(
          'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
        );
        const inOverlay = el?.closest(
          '[role="dialog"], [role="menu"], [id^="headlessui-popover-panel"]',
        );
        // A dialog that is open owns the keyboard even when the focus is not inside it (the app's
        // ConfirmDialog is a native <dialog> with no role and no focus trap, and it only exists
        // while it is open). A closed <dialog> kept in the DOM (no `open`) does not count.
        const modalOpen = document.querySelector(
          'dialog[open], dialog.modal-open, [role="dialog"], [role="alertdialog"]',
        );
        if (typing || inOverlay || modalOpen) return;
        e.preventDefault();
        searchWrapRef.current?.querySelector('input')?.focus();
        return;
      }
      if (!fromPage) return;
      if (e.key === 'j' || e.key === 'k') {
        const rows = Array.from(
          tableRef.current?.querySelectorAll<HTMLElement>('tbody tr[tabindex]') ?? [],
        );
        if (rows.length === 0) return;
        const at = rows.indexOf(document.activeElement as HTMLElement);
        const next =
          at < 0 ? 0 : Math.min(rows.length - 1, Math.max(0, at + (e.key === 'j' ? 1 : -1)));
        rows[next].focus();
        rows[next].scrollIntoView({ block: 'nearest' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedAppraisalId]);

  // ── Grouping ────────────────────────────────────────────────────────────────
  // The counts follow the list's filters and search — except the grouped field's own filter, which
  // is what picking a group sets: counted with it, the rail would shrink to the one group picked.
  const groupParams = useMemo(
    () => ({
      ...searchParam,
      ...Object.fromEntries(Object.entries(activeFilters).filter(([k]) => k !== groupBy)),
    }),
    [searchParam, activeFilters, groupBy],
  );
  const {
    data: groupsData,
    isLoading: groupsLoading,
    isError: groupsError,
  } = useAppraisalGroups(groupBy, groupParams);

  const groupLabel = (field: AppraisalGroupBy, key: string): string => {
    if (!key) return t('list.groupBy.empty');
    switch (field) {
      case 'status':
        return t(`list.status.${key}`, { defaultValue: key });
      case 'slaStatus':
        return t(`list.sla.${key}`, { defaultValue: key });
      case 'priority':
        return t(`list.priority.${key}`, { defaultValue: key });
      case 'province':
        return provinceName(key);
      case 'assignmentType':
        return t(`list.assignmentType.${key}`, { defaultValue: key });
    }
  };

  const columnLabels = useMemo(
    () => Object.fromEntries(appraisalColumns.map(c => [c.key, c.label])),
    [appraisalColumns],
  );

  // Only the visible columns reach the table, in user order — the table itself needs no knowledge
  // of hiding or reordering, and its cell rendering is untouched.
  const orderedVisibleColumns = useMemo(
    () =>
      visibleColumns
        .map(key => appraisalColumns.find(c => c.key === key))
        .filter((c): c is NonNullable<typeof c> => c !== undefined),
    [visibleColumns, appraisalColumns],
  );

  const handleRowClick = (item: AppraisalDto) => {
    setSelectedAppraisalId(item.id);
  };

  const [isExporting, setIsExporting] = useState(false);

  // The export waiting for the user's answer on the truncation warning (null: no dialog).
  const [pendingExport, setPendingExport] = useState<'xlsx' | 'csv' | null>(null);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    // The server caps the file at MAX_EXPORT_ROWS in the current sort order and says nothing about
    // it. Downloading 10,000 of 105,475 rows without a word is the worst outcome: the file opens,
    // looks complete, and is wrong. So past the cap it asks first (the dialog below runs it).
    if (totalCount > MAX_EXPORT_ROWS) {
      setPendingExport(format);
      return;
    }
    await runExport(format);
  };

  const runExport = async (format: 'xlsx' | 'csv') => {
    setIsExporting(true);
    try {
      // searchParam, not `search:` — otherwise pinning the scope to "Appraisal no." showed three
      // rows on screen and exported every row matching the broad three-column OR. totalCount, which
      // the truncation warning is measured against, describes the on-screen set.
      await exportAppraisals(
        {
          ...searchParam,
          sortBy: sortBy || undefined,
          sortDir: sortBy ? sortDir : undefined,
          ...activeFilters,
        },
        format,
      );
    } catch (error) {
      // Previously this promise was dropped, so a failed or timed-out export was indistinguishable
      // from a slow one — nothing appeared and nothing said why.
      //
      // The server's own line wins when there is one. blobTransfer.recoverProblemDetails parses the
      // ProblemDetails out of the error Blob into `apiError.detail` precisely so a refusal can say
      // why — the export answers a caller without the workspace permission with a sentence written
      // for them — and swallowing it here left that message unreachable on every path.
      // Only a 403. CustomExceptionHandler's catch-all arm puts `exception.Message` verbatim into
      // ProblemDetails.detail for anything it does not map, and this export builds a workbook over
      // the whole result set — a SqlException or an OutOfMemoryException would otherwise put table
      // and column names in a toast. A 403 is the one status whose message is written for the
      // caller (ForbiddenException), so that is the only one trusted here.
      const apiError = (error as { apiError?: { status?: number; detail?: string } })?.apiError;
      const detail = apiError?.status === 403 ? apiError.detail : undefined;
      toast.error(detail || t('list.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  if (isError) {
    return (
      <DataErrorState
        title={t('common:status.failedToLoad')}
        message={(error as Error)?.message}
        onRetry={refetch}
      />
    );
  }

  // overflow-x-hidden on the root: the app shell's content area is overflow-y-auto, and CSS
  // promotes the other axis to auto alongside it — so anything that pokes past this page's width
  // turns into a scrollbar across the bottom of the whole screen instead of inside the table. The
  // table has its own horizontal scroll; nothing above it should ever scroll sideways.
  // Safe for the popovers here: the column picker and the search-scope menu are HeadlessUI
  // `anchor` panels, so they render in a portal rather than inside this box.
  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-x-hidden gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{t('list.title')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalCount > 0
              ? t('list.countFound', { count: totalCount.toLocaleString() })
              : t('list.browseHint')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export — a real menu rather than `hidden group-hover:block`, which could not be
              opened from the keyboard at all and vanished the moment the pointer left the button.

              Hidden for tracking-only users: they can see every appraisal in the bank, so an
              unrestricted 10,000-row spreadsheet is the collateral book leaving in one click.
              The server refuses the call as well — this only removes the dead button. */}
          {canExport && (
            <Popover className="relative">
              <PopoverButton
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-300 disabled:opacity-50 disabled:cursor-wait outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* 'arrow-down-tray' is a heroicons name and renders as nothing against this
                  project's FontAwesome sprite. 'file-export' is what the other Export buttons in
                  the app use (ValuationDocumentChecklist, GenerateReappraisalTestPage). */}
                <Icon
                  style="solid"
                  name={isExporting ? 'spinner' : 'file-export'}
                  className={`size-3 ${isExporting ? 'animate-spin text-primary' : 'text-emerald-600'}`}
                />
                {t('list.export')}
              </PopoverButton>
              <PopoverPanel
                anchor="bottom end"
                className="z-40 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
              >
                {({ close }) => (
                  <>
                    <button
                      onClick={() => {
                        close();
                        void handleExport('xlsx');
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                    >
                      {t('list.exportXlsx')}
                    </button>
                    <button
                      onClick={() => {
                        close();
                        void handleExport('csv');
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                    >
                      {t('list.exportCsv')}
                    </button>
                  </>
                )}
              </PopoverPanel>
            </Popover>
          )}
          {/* Saved Searches */}
          <SavedSearchesDropdown
            savedSearches={savedSearches}
            onLoad={handleLoadSavedSearch}
            onSave={handleSaveSearch}
            onDelete={id => deleteSavedSearch.mutate(id)}
          />
        </div>
      </div>

      {/* Smart Views */}
      <div className="shrink-0">
        <SmartViewBar
          views={smartViews}
          activeViewKey={activeViewKey}
          onSelect={handleSmartView}
          onSelectAll={handleSelectAll}
          isAllActive={
            !activeViewKey && !debouncedSearch && Object.keys(activeFilters).length === 0
          }
        />
      </div>

      {/* Search + Filters */}
      <div className="shrink-0 flex flex-col gap-2">
        {/* Search + the table's own control, on one row.
            SearchByInput is the app's existing scoped-search pill (quotation listing, external
            invitations, monitoring's pending-quotation section all use it) — same field selector
            with an icon per option and a check on the active one. Reused rather than rebuilt, so
            this box behaves and looks like every other scoped search in the product. */}
        {/* One row: search, then the filters, then the table's own controls. The filters get the
            middle: the pinned chips always show (wrapping inside it if they alone are too wide), and
            the added ones that do not fit fold into FilterChipBar's "More +N" chip rather than
            making the row taller. However many there are, they never take width from the search —
            which keeps its own floor.
            Under lg there is no room beside the search, so the filters drop to their own line.
            pr-1 keeps the controls' count badge, which hangs outside the button, clear of the
            page's overflow-x-hidden edge. */}
        <div
          ref={rowRef}
          className={`flex items-start gap-2 pr-1 ${filtersOwnRow ? 'flex-wrap' : 'max-lg:flex-wrap'}`}
        >
          {/* The wrapper owns the suggestion panel: focus anywhere inside opens it, focus leaving
              closes it, and the text box's keys drive it (see handleSearchKeyDown). The listeners
              only catch events bubbling up from the input and the panel's buttons — the
              landmark itself is never the target. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            ref={searchWrapRef}
            role="search"
            className={`relative flex ${
              filtersOwnRow
                ? 'order-1 min-w-[16rem] max-w-none flex-1'
                : 'min-w-[22rem] flex-1 max-lg:order-1 max-lg:min-w-[16rem]'
            }`}
            // The text box only: the field picker's button (and its portalled menu, whose events
            // bubble here through React) would otherwise open the panel under its own menu.
            onFocus={e => {
              if (!(e.target instanceof HTMLInputElement)) return;
              setBoxFocused(true);
              if (skipFocusOpen.current) {
                skipFocusOpen.current = false;
                return;
              }
              setSuggestOpen(true);
            }}
            onBlur={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setBoxFocused(false);
                closeSuggest();
              }
            }}
            onKeyDown={handleSearchKeyDown}
            onPointerDownCapture={onSearchPointerDown}
          >
            <SearchByInput
              variant="pill"
              className="flex-1 min-w-0"
              options={searchFieldOptions}
              field={searchField}
              onFieldChange={v => setSearchField(isSearchField(v) ? v : 'all')}
              // The pill opens the suggestion panel, whose chips switch the scope — the same as the top
              // bar's quick search. Focus goes to the box so the user can keep typing.
              fieldAriaLabel={t('list.suggest.scope')}
              fieldExpanded={suggestOpen}
              onFieldClick={() => {
                searchWrapRef.current?.querySelector('input')?.focus();
                setSuggestOpen(true);
              }}
              value={searchTerm}
              onChange={v => {
                setSearchTerm(v);
                // Enter closes the panel without moving focus, so onFocus would not reopen it.
                setSuggestOpen(true);
              }}
              placeholder={t(`list.searchPlaceholderBy.${searchField}`)}
              // Both: the static syntax sentence (sr-only, beside this box) and, when it is
              // on screen, the reason nothing is happening. Without the second, a screen-reader user
              // typing two characters is told the syntax and never told why the list did not move.
              describedBy={
                isSearchTooShort
                  ? 'appraisal-search-hint appraisal-search-too-short'
                  : 'appraisal-search-hint'
              }
              endAdornment={
                isSearchPending ? (
                  <Icon style="solid" name="spinner" className="size-4 animate-spin text-primary" />
                ) : searchTerm ? (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setDebouncedSearch('');
                    }}
                    aria-label={t('common:actions.clear')}
                    style={NO_OUTLINE}
                    className={`rounded text-gray-400 hover:text-gray-600 ${
                      searchPointer ? '' : KEYBOARD_RING_PLAIN
                    }`}
                  >
                    <Icon style="solid" name="xmark" className="size-4" />
                  </button>
                ) : (
                  // The key that jumps here, in the top bar's badge style; gone while typing
                  // or focused (the top bar hides its ⌘K hint on focus too), so it never sits
                  // under the clear button.
                  !boxFocused && (
                    <kbd
                      aria-hidden="true"
                      className="pointer-events-none rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400"
                    >
                      /
                    </kbd>
                  )
                )
              }
            />
            {suggestOpen && (
              // mousedown is swallowed so a click on a row does not blur the input first — where a
              // button takes no focus on click (Safari), that blur would close the panel before the
              // click landed.
              <div role="presentation" onMouseDown={e => e.preventDefault()}>
                <SearchSuggest
                  term={searchTerm}
                  isSettled={isSuggestSettled}
                  failed={isError}
                  minLength={MIN_SEARCH_LENGTH}
                  items={isSuggestSettled ? items.slice(0, 5) : []}
                  fieldOptions={searchFieldOptions}
                  field={searchField}
                  counts={fieldCounts}
                  recent={recentSearches}
                  activeIndex={suggestIndex}
                  onPickItem={item => {
                    addRecent(searchTerm);
                    closeSuggest();
                    // The slide-over hands focus back to the input when it closes (Headless UI
                    // restores from its own focus history, so blurring here does not prevent it).
                    // That returning focus must not reopen the panel the user just used.
                    skipFocusOpen.current = true;
                    setSelectedAppraisalId(item.id);
                  }}
                  onChangeField={field => setSearchField(isSearchField(field) ? field : 'all')}
                  onPickField={field => {
                    setSearchField(isSearchField(field) ? field : 'all');
                    addRecent(searchTerm);
                    closeSuggest();
                  }}
                  onPickRecent={term => setSearchTerm(term)}
                />
              </div>
            )}
          </div>
          {/* The syntax sentence the input's aria-describedby points at. The tips themselves now
              open with the box, in the panel above. */}
          <span id="appraisal-search-hint" className="sr-only">
            {searchField === 'all' ? t('list.searchPrefixHint') : t('list.searchSubstringHint')}
          </span>
          {/* Drawn like the column picker beside it — a square icon button, a count badge when it
              is doing something, a titled panel — so the two table controls read as one pair. */}
          <FilterChipBar
            className={`relative flex min-h-[2.5357rem] min-w-0 flex-wrap content-center items-center gap-2 ${
              filtersOwnRow
                ? 'order-3 basis-full'
                : 'shrink grow-0 basis-auto max-lg:order-3 max-lg:basis-full'
            }`}
            onOneLineWidth={setFilterNeed}
            availableWidth={filtersOwnRow ? undefined : (rowRoom ?? undefined)}
            filters={appraisalFilters}
            values={filters}
            onChange={handleFilterChange}
            onRemove={handleRemoveFilter}
            onClear={handleClearFilters}
            pinned={PINNED_FILTERS}
          />
          {/* Both are 35.5px tall, like the search: a definite height is what lets their h-full
              buttons match it. */}
          <div
            ref={toolsRef}
            className={`flex h-[2.5357rem] shrink-0 items-stretch gap-2 ${filtersOwnRow ? 'order-2' : 'max-lg:order-2'}`}
            onPointerDownCapture={onToolsPointerDown}
          >
            <Menu as="div" className="relative h-full shrink-0">
              <MenuButton
                style={NO_OUTLINE}
                title={
                  groupBy
                    ? t('list.groupBy.current', { label: columnLabels[groupBy] })
                    : t('list.groupBy.label')
                }
                aria-label={t('list.groupBy.label')}
                className={`${neutralToolButtonClass(Boolean(groupBy))} ${
                  toolsPointer ? '' : KEYBOARD_RING
                }`}
              >
                <Icon style="solid" name="layer-group" className="size-4" />
              </MenuButton>
              <MenuItems
                anchor="bottom end"
                className="z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg focus:outline-none"
              >
                <div className="border-b border-gray-100 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t('list.groupBy.label')}
                </div>
                <div className="py-1">
                  {[null, ...GROUP_FIELDS].map(field => {
                    const on = groupBy === field;
                    return (
                      <MenuItem key={field ?? 'none'}>
                        <button
                          type="button"
                          onClick={() => setGroupBy(field)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm data-focus:bg-gray-50 ${
                            on ? 'font-medium text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          <span className="flex-1">
                            {field ? columnLabels[field] : t('list.groupBy.none')}
                          </span>
                          {on && (
                            <Icon style="solid" name="check" className="size-3.5 text-gray-600" />
                          )}
                        </button>
                      </MenuItem>
                    );
                  })}
                </div>
              </MenuItems>
            </Menu>
            <ColumnVisibilityDropdown
              focusRing={toolsPointer ? 'none' : 'ring'}
              neutralButton
              checkboxes
              orderedColumns={orderedColumns}
              hidden={hidden}
              alwaysVisible={alwaysVisible}
              labels={columnLabels}
              hiddenBeyondDefault={hiddenBeyondDefault}
              onToggle={toggleColumn}
              onReorder={reorderColumns}
              // Reset touches visibility, order, widths and the row-number switch, so it stays live
              // whenever any of the four differs from the default — not just when a column is hidden.
              canReset={isCustomized || hasCustomWidths || !showRowNumber || density === 'compact'}
              onReset={() => {
                // Everything the picker can change, or "Reset" is a button that visibly does
                // nothing when the only thing switched off is the row-number column.
                resetToDefault();
                resetWidths();
                if (!showRowNumber) toggleRowNumber();
                setDensity('comfortable');
              }}
              extraToggles={[
                {
                  key: 'rowNumber',
                  label: t('common:columns.rowNumber'),
                  checked: showRowNumber,
                  onChange: toggleRowNumber,
                },
              ]}
            />
            {/* Row density, beside the other two tools: it is a switch, not a setting buried in the
                columns panel. Pressed = compact, one line per row. */}
            <button
              type="button"
              aria-pressed={density === 'compact'}
              // A toggle keeps one name and says its state with aria-pressed: pressed is compact.
              aria-label={t('list.density.compact')}
              title={`${t('list.density.title')}: ${t(`list.density.${density}`)}`}
              onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
              style={NO_OUTLINE}
              className={`${neutralToolButtonClass(density === 'compact')} ${
                toolsPointer ? '' : KEYBOARD_RING_PLAIN
              }`}
            >
              <Icon
                style="solid"
                name={density === 'compact' ? 'grip-lines' : 'bars'}
                className="size-4"
              />
            </button>
          </div>
        </div>
        {/* Kept mounted (sr-only) while the panel shows the same message, so aria-describedby
            still resolves and the live region still announces. */}
        {isSearchTooShort && (
          <p
            id="appraisal-search-too-short"
            aria-live="polite"
            className={suggestOpen ? 'sr-only' : 'text-xs text-amber-600'}
          >
            {t('list.searchTooShort', { count: MIN_SEARCH_LENGTH })}
          </p>
        )}
      </div>

      {/* Results Table */}
      {/* min-w-0: a flex child defaults to min-width:auto, so without it this card refuses to
          shrink below the table's own width. With user-set column widths the table is ~2,200px
          wide, which pushed the card past the viewport and put a scrollbar on the page instead of
          inside the table. */}
      <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex">
        {groupBy && (
          <GroupSidebar
            caption={t('list.groupBy.label')}
            title={columnLabels[groupBy]}
            groups={(groupsData?.groups ?? []).map(g => ({
              ...g,
              label: groupLabel(groupBy, g.key),
              // "None" has no filter that means it, so it is counted but cannot be picked.
              disabled: g.key === '',
            }))}
            isLoading={groupsLoading}
            // A filter can hold several values ("Pending,Assigned", or a quick view's): all of them
            // are marked, not just a single exact match.
            activeKeys={activeFilters[groupBy]?.split(',') ?? []}
            onSelect={g => handleGroupSelect(g ? g.key : null)}
            emptyLabel={t('list.empty')}
            isError={groupsError}
            errorLabel={t('list.groupBy.error')}
            // Totals only: the list's SLA column and filters already say what is overdue.
            showBreached={false}
            showAtRisk={false}
          />
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppraisalResultsTable
            columns={orderedVisibleColumns}
            layout={{
              visibleColumns,
              widths,
              setWidth,
              getAutoFitWidth,
              showRowNumber,
              tableRef,
            }}
            items={items}
            isLoading={showSkeleton}
            sortBy={shownSort.by}
            sortDir={shownSort.dir}
            onSort={handleSort}
            onRowClick={handleRowClick}
            pageNumber={servedPageNumber}
            pageSize={servedPageSize}
            isStale={isFetching && !showSkeleton}
            density={density}
            pinnedColumn={columnConfig.pinnedColumn}
            searchTerm={debouncedSearch}
            searchField={searchField}
            emptyState={
              <AppraisalEmptyState
                isFiltered={Boolean(debouncedSearch) || Object.keys(activeFilters).length > 0}
                actions={[
                  ...(debouncedSearch && searchField !== 'all'
                    ? [
                        {
                          key: 'searchAll',
                          label: t('list.emptyActions.searchAll'),
                          onClick: () => setSearchField('all'),
                        },
                      ]
                    : []),
                  ...(activeViewKey
                    ? [
                        {
                          key: 'exitView',
                          label: t('list.emptyActions.exitView'),
                          onClick: handleClearFilters,
                        },
                      ]
                    : Object.keys(activeFilters).length > 0
                      ? [
                          {
                            key: 'clearFilters',
                            label: t('list.emptyActions.clearFilters'),
                            onClick: handleClearFilters,
                          },
                        ]
                      : []),
                  ...(debouncedSearch &&
                  searchField === 'all' &&
                  !debouncedSearch.trim().startsWith('*')
                    ? [
                        {
                          key: 'wildcard',
                          label: t('list.emptyActions.tryWildcard', {
                            term: `*${debouncedSearch.trim()}`,
                          }),
                          onClick: () => setSearchTerm(`*${debouncedSearch.trim()}`),
                        },
                      ]
                    : []),
                ]}
              />
            }
          />
          <Pagination
            currentPage={pageNumber}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPageNumber}
            onPageSizeChange={size => {
              setPageSize(size);
              setPageNumber(0);
            }}
          />
        </div>
      </div>

      <ActivityTrackingSlideOver
        appraisalId={selectedAppraisalId}
        onClose={() => setSelectedAppraisalId(null)}
      />
      <ConfirmDialog
        isOpen={pendingExport !== null}
        onClose={() => setPendingExport(null)}
        onConfirm={() => {
          const format = pendingExport;
          setPendingExport(null);
          if (format) void runExport(format);
        }}
        title={t('list.exportTruncatedTitle')}
        message={t('list.exportTruncatedWarning', {
          total: totalCount.toLocaleString(),
          max: MAX_EXPORT_ROWS.toLocaleString(),
        })}
        confirmText={t('common:actions.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="warning"
      />
    </div>
  );
}

export default AppraisalListPage;
