import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { SearchByInput } from '@/shared/components/inputs';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import {
  useAppraisalSearch,
  useSmartViews,
  useSavedSearches,
  useCreateSavedSearch,
  useDeleteSavedSearch,
  exportAppraisals,
  MAX_EXPORT_ROWS,
  type AppraisalDto,
  type SmartViewDto,
  type SavedSearchDto,
} from '../api/appraisalSearch';
import {
  makeAppraisalFilters,
  makeAppraisalColumns,
  expandFilterKeys,
  APPRAISAL_DEFAULT_HIDDEN_COLUMNS,
} from '../components/search/tabConfigs';
import {
  ColumnVisibilityDropdown,
  useColumnAutoFit,
  useColumnVisibility,
  useColumnWidths,
  useRowNumberColumn,
} from '@/shared/components/columnLayout';
import type { ColumnLayoutConfig } from '@/shared/components/columnLayout';
import SearchFilterBar from '../components/search/SearchFilterBar';
import ActiveFilterChips from '../components/search/ActiveFilterChips';
import SmartViewBar from '../components/search/SmartViewBar';
import SavedSearchesDropdown from '../components/search/SavedSearchesDropdown';
import AppraisalResultsTable from '../components/search/AppraisalResultsTable';
import ActivityTrackingSlideOver from '../components/search/ActivityTrackingSlideOver';
import DataErrorState from '@/shared/components/DataErrorState';
import { useDelayedFlag } from '@/shared/hooks/useDelayedFlag';
import { MIN_SEARCH_LENGTH } from '@shared/api/search';

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
]);

/** localStorage namespace for this screen's column layout. */
const COLUMN_STORAGE_KEY = 'appraisal-list-columns';

/**
 * Which column the free-text box searches.
 *
 * 'all' is the default and keeps today's behaviour exactly: a semi-join across every searchable
 * field. The narrower options map to the dedicated backend filters, which is dramatically cheaper
 * — an appraisal-number search resolves off appraisal.Appraisals instead of dragging the whole
 * query through the view (measured on 105k rows: 1,401 ms for the OR across three columns against
 * 71 ms for the pinned one).
 */
const SEARCH_FIELDS = ['all', 'appraisalNumber', 'customerName', 'requestNumber'] as const;
type SearchField = (typeof SEARCH_FIELDS)[number];

const SEARCH_FIELD_ICONS: Record<SearchField, string> = {
  all: 'magnifying-glass',
  appraisalNumber: 'building',
  customerName: 'user',
  requestNumber: 'file-lines',
};

const isSearchField = (v: string | null): v is SearchField =>
  v !== null && (SEARCH_FIELDS as readonly string[]).includes(v);

function AppraisalListPage() {
  const { t } = useTranslation(['appraisal', 'common']);
  // Memoized because these feed the column-layout hooks: rebuilding the array every render would
  // hand useColumnVisibility a new config identity each time. Translating 16 labels on every
  // render is wasted work regardless.
  const appraisalFilters = useMemo(() => makeAppraisalFilters(t), [t]);
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
    sortBy: searchParams.get('sortBy') || 'CreatedAt',
    sortDir: searchParams.get('sortDir') || 'desc',
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
    if (sortBy !== 'CreatedAt') params.sortBy = sortBy;
    if (sortDir !== 'desc') params.sortDir = sortDir;
    if (activeViewKey) params.view = activeViewKey;
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
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

  const { data, isLoading, isFetching, isError, error, refetch } = useAppraisalSearch({
    ...searchParam,
    pageNumber,
    pageSize,
    sortBy,
    sortDir,
    ...filters,
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
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
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

  const handleSmartView = (view: SmartViewDto) => {
    setFilters(view.filters);
    setActiveViewKey(view.key);
    setSearchTerm('');
    setDebouncedSearch('');
  };

  const handleLoadSavedSearch = (search: SavedSearchDto) => {
    try {
      const parsed = JSON.parse(search.filtersJson);
      setFilters(parsed);
      if (search.sortBy) setSortBy(search.sortBy);
      if (search.sortDir) setSortDir(search.sortDir);
      setActiveViewKey(null);
    } catch {
      /* ignore invalid JSON */
    }
  };

  const handleSaveSearch = (name: string) => {
    createSavedSearch.mutate({
      name,
      entityType: 'appraisal',
      filtersJson: JSON.stringify(filters),
      sortBy: sortBy !== 'CreatedAt' ? sortBy : undefined,
      sortDir: sortDir !== 'desc' ? sortDir : undefined,
    });
  };

  // ── Column layout ───────────────────────────────────────────────────────────
  const tableRef = useRef<HTMLTableElement>(null);

  const columnConfig = useMemo<ColumnLayoutConfig<string>>(
    () => ({
      columns: appraisalColumns.map(c => c.key),
      // The appraisal number is the row's identity and its link target — pinning anything else
      // would leave a scrolled-right table with no way back to the record.
      stickyColumn: 'appraisalNumber',
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
    alwaysVisible,
    toggleColumn,
    reorderColumns,
    resetToDefault,
  } = useColumnVisibility(COLUMN_STORAGE_KEY, columnConfig);
  const { widths, setWidth, resetWidths } = useColumnWidths(COLUMN_STORAGE_KEY, columnConfig);
  const { showRowNumber, toggleRowNumber } = useRowNumberColumn(COLUMN_STORAGE_KEY);
  const getAutoFitWidth = useColumnAutoFit(tableRef, { leadingCells: showRowNumber ? 1 : 0 });

  const filterLabels = useMemo(
    () => Object.fromEntries(filterKeys.map(f => [f.key, f.label])),
    [filterKeys],
  );

  const filterValueOptions = useMemo(
    () =>
      Object.fromEntries(
        appraisalFilters.filter(f => f.options?.length).map(f => [f.key, f.options!]),
      ),
    [appraisalFilters],
  );

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
      })),
    [t],
  );

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

  const handleExport = async (format: 'xlsx' | 'csv') => {
    // The server caps the file at MAX_EXPORT_ROWS in the current sort order and says nothing about
    // it. Downloading 10,000 of 105,475 rows without a word is the worst outcome: the file opens,
    // looks complete, and is wrong.
    if (
      totalCount > MAX_EXPORT_ROWS &&
      !window.confirm(
        t('list.exportTruncatedWarning', {
          total: totalCount.toLocaleString(),
          max: MAX_EXPORT_ROWS.toLocaleString(),
        }),
      )
    ) {
      return;
    }

    setIsExporting(true);
    try {
      await exportAppraisals(
        { search: debouncedSearch || undefined, sortBy, sortDir, ...filters },
        format,
      );
    } catch {
      // Previously this promise was dropped, so a failed or timed-out export was indistinguishable
      // from a slow one — nothing appeared and nothing said why.
      toast.error(t('list.exportFailed'));
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
          <h3 className="text-sm font-semibold text-gray-900">{t('list.title')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalCount > 0
              ? t('list.countFound', { count: totalCount.toLocaleString() })
              : t('list.browseHint')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export — a real menu rather than `hidden group-hover:block`, which could not be
              opened from the keyboard at all and vanished the moment the pointer left the button. */}
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
        <SmartViewBar views={smartViews} activeViewKey={activeViewKey} onSelect={handleSmartView} />
      </div>

      {/* Search + Filters */}
      <div className="shrink-0 flex flex-col gap-2">
        {/* Search + the table's own control, on one row.
            SearchByInput is the app's existing scoped-search pill (quotation listing, external
            invitations, monitoring's pending-quotation section all use it) — same field selector
            with an icon per option and a check on the active one. Reused rather than rebuilt, so
            this box behaves and looks like every other scoped search in the product. */}
        {/* items-stretch so the picker matches the search pill's height instead of sitting 2px
            short of it; pr-1 keeps its count badge, which hangs outside the button, clear of the
            page's overflow-x-hidden edge. */}
        <div className="flex items-stretch gap-2 pr-1">
          <SearchByInput
            className="flex-1 min-w-0"
            options={searchFieldOptions}
            field={searchField}
            onFieldChange={v => setSearchField(isSearchField(v) ? v : 'all')}
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t(`list.searchPlaceholderBy.${searchField}`)}
            endAdornment={
              isSearchPending ? (
                <Icon style="solid" name="spinner" className="size-4 animate-spin text-primary" />
              ) : (
                searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setDebouncedSearch('');
                    }}
                    aria-label={t('common:actions.clear')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Icon style="solid" name="xmark" className="size-4" />
                  </button>
                )
              )
            }
          />
          <SearchFilterBar
            collapsible
            filters={appraisalFilters}
            values={filters}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
          />
          <ColumnVisibilityDropdown
            orderedColumns={orderedColumns}
            hidden={hidden}
            alwaysVisible={alwaysVisible}
            labels={columnLabels}
            onToggle={toggleColumn}
            onReorder={reorderColumns}
            onReset={() => {
              // Reset must clear widths too: a user who has hidden a column and dragged another
              // one wide reads "Reset" as "put the table back", not "put half of it back".
              resetToDefault();
              resetWidths();
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
        </div>
        <p id="appraisal-search-hint" className="text-xs text-gray-400 dark:text-gray-500">
          {isSearchTooShort
            ? t('list.searchTooShort', { count: MIN_SEARCH_LENGTH })
            : t('list.searchPrefixHint')}
        </p>
      </div>

      {/* Active Filter Chips */}
      <div className="shrink-0">
        <ActiveFilterChips
          filters={filters}
          labels={filterLabels}
          valueOptions={filterValueOptions}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Results Table */}
      {/* min-w-0: a flex child defaults to min-width:auto, so without it this card refuses to
          shrink below the table's own width. With user-set column widths the table is ~2,200px
          wide, which pushed the card past the viewport and put a scrollbar on the page instead of
          inside the table. */}
      <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
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
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={handleRowClick}
          pageNumber={servedPageNumber}
          pageSize={servedPageSize}
          isStale={isFetching && !showSkeleton}
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

      <ActivityTrackingSlideOver
        appraisalId={selectedAppraisalId}
        onClose={() => setSelectedAppraisalId(null)}
      />
    </div>
  );
}

export default AppraisalListPage;
