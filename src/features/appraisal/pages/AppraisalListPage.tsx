import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import {
  useAppraisalSearch,
  useSmartViews,
  useSavedSearches,
  useCreateSavedSearch,
  useDeleteSavedSearch,
  exportAppraisals,
  type AppraisalDto,
  type SmartViewDto,
  type SavedSearchDto,
} from '../api/appraisalSearch';
import { appraisalFilters, appraisalColumns } from '../components/search/tabConfigs';
import SearchFilterBar from '../components/search/SearchFilterBar';
import ActiveFilterChips from '../components/search/ActiveFilterChips';
import SmartViewBar from '../components/search/SmartViewBar';
import SavedSearchesDropdown from '../components/search/SavedSearchesDropdown';
import AppraisalResultsTable from '../components/search/AppraisalResultsTable';
import ActivityTrackingSlideOver from '../components/search/ActivityTrackingSlideOver';

const NON_FILTER_KEYS = new Set(['search', 'page', 'pageSize', 'sortBy', 'sortDir', 'view']);
const VALID_FILTER_KEYS = new Set(appraisalFilters.map(f => f.key));

function AppraisalListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL (once on mount)
  const initRef = useRef({
    search: searchParams.get('search') || '',
    page: Number(searchParams.get('page')) || 0,
    pageSize: Number(searchParams.get('pageSize')) || 25,
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

  const [searchTerm, setSearchTerm] = useState(init.search);
  const [debouncedSearch, setDebouncedSearch] = useState(init.search);
  const [pageNumber, setPageNumber] = useState(init.page);
  const [pageSize, setPageSize] = useState(init.pageSize);
  const [sortBy, setSortBy] = useState(init.sortBy);
  const [sortDir, setSortDir] = useState(init.sortDir);
  const [filters, setFilters] = useState<Record<string, string>>(init.filters);
  const [activeViewKey, setActiveViewKey] = useState<string | null>(init.view);
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page on search/filter/sort change
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, filters, sortBy, sortDir]);

  // Sync all state to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (pageNumber > 0) params.page = String(pageNumber);
    if (pageSize !== 25) params.pageSize = String(pageSize);
    if (sortBy !== 'CreatedAt') params.sortBy = sortBy;
    if (sortDir !== 'desc') params.sortDir = sortDir;
    if (activeViewKey) params.view = activeViewKey;
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, pageNumber, pageSize, sortBy, sortDir, filters, activeViewKey, setSearchParams]);

  // Data hooks
  const { data, isLoading } = useAppraisalSearch({
    search: debouncedSearch || undefined,
    pageNumber,
    pageSize,
    sortBy,
    sortDir,
    ...filters,
  });

  const { data: smartViews = [] } = useSmartViews();
  const { data: savedSearches = [] } = useSavedSearches('appraisal');
  const createSavedSearch = useCreateSavedSearch();
  const deleteSavedSearch = useDeleteSavedSearch();

  const items = data?.result.items ?? [];
  const totalCount = data?.result.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const facets = data?.facets;

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

  const handleRowClick = (item: AppraisalDto) => {
    setSelectedAppraisalId(item.id);
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    exportAppraisals({ search: debouncedSearch || undefined, sortBy, sortDir, ...filters }, format);
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Appraisals</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalCount > 0
              ? `${totalCount.toLocaleString()} appraisals found`
              : 'Browse and search appraisals'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <div className="relative group">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-300">
              <Icon style="solid" name="arrow-down-tray" className="size-3" />
              Export
            </button>
            <div className="hidden group-hover:block absolute right-0 top-full pt-1 w-36 z-40">
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
              <button
                onClick={() => handleExport('xlsx')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
              >
                Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
              >
                CSV (.csv)
              </button>
              </div>
            </div>
          </div>
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
        <div className="relative">
          <Icon
            style="solid"
            name="magnifying-glass"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by appraisal number, customer name, or request number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearch('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon style="solid" name="xmark" className="size-4" />
            </button>
          )}
        </div>
        <SearchFilterBar
          filters={appraisalFilters}
          values={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />
      </div>

      {/* Active Filter Chips */}
      <div className="shrink-0">
        <ActiveFilterChips
          filters={filters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Facet Summary */}
      {facets && facets.status.length > 0 && (
        <div className="shrink-0 flex items-center gap-2 flex-wrap text-xs">
          {facets.status.map(f => (
            <button
              key={f.value}
              onClick={() => handleFilterChange('status', f.value)}
              className={`px-2 py-0.5 rounded-full border transition-colors ${
                filters.status === f.value
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f.value} ({f.count})
            </button>
          ))}
        </div>
      )}

      {/* Results Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <AppraisalResultsTable
          columns={appraisalColumns}
          items={items}
          isLoading={isLoading}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={handleRowClick}
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
