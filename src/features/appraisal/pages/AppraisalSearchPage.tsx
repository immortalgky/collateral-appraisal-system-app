import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SearchCategory } from '@shared/types/search';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { useFullSearchQuery } from '../api/search';
import { tabConfigs } from '../components/search/tabConfigs';
import SearchFilterBar from '../components/search/SearchFilterBar';
import SearchResultsTable from '../components/search/SearchResultsTable';

// Keys that are not filters
const NON_FILTER_KEYS = new Set(['tab', 'q', 'page', 'pageSize']);

/** Build URL params from current state */
function buildParams(
  tab: string,
  q: string,
  page: number,
  pageSize: number,
  filters: Record<string, string>,
): Record<string, string> {
  const params: Record<string, string> = { tab };
  if (q) params.q = q;
  if (page > 0) params.page = String(page);
  if (pageSize !== 25) params.pageSize = String(pageSize);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params[key] = value;
  });
  return params;
}

function AppraisalSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL params (only on mount)
  const initRef = useRef({
    tab: (searchParams.get('tab') as SearchCategory) || 'requests',
    q: searchParams.get('q') || '',
    page: Number(searchParams.get('page')) || 0,
    pageSize: Number(searchParams.get('pageSize')) || 25,
    filters: (() => {
      const f: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        if (!NON_FILTER_KEYS.has(key) && value) f[key] = value;
      });
      return f;
    })(),
  });

  const init = initRef.current;

  // Local state
  const [activeTab, setActiveTab] = useState<SearchCategory>(init.tab);
  const [searchTerm, setSearchTerm] = useState(init.q);
  const [debouncedSearch, setDebouncedSearch] = useState(init.q);
  const [hasSearched, setHasSearched] = useState(init.q.length >= 2);
  const [pageNumber, setPageNumber] = useState(init.page);
  const [pageSize, setPageSize] = useState(init.pageSize);
  const [filters, setFilters] = useState<Record<string, string>>(init.filters);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchTerm.length >= 2) {
        setHasSearched(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page on search/filter/tab change
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, filters, activeTab]);

  // Sync all state to URL (single effect)
  useEffect(() => {
    const params = buildParams(activeTab, debouncedSearch, pageNumber, pageSize, filters);
    setSearchParams(params, { replace: true });
  }, [activeTab, debouncedSearch, pageNumber, pageSize, filters, setSearchParams]);

  const currentTabConfig = tabConfigs.find(t => t.key === activeTab) ?? tabConfigs[0];

  // API query
  const { data, isLoading } = useFullSearchQuery({
    q: debouncedSearch,
    filter: activeTab,
    pageNumber,
    pageSize,
    ...filters,
  });

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleTabChange = (tab: SearchCategory) => {
    setActiveTab(tab);
    setFilters({});
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setHasSearched(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.length >= 2) {
      setDebouncedSearch(searchTerm);
      setHasSearched(true);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 gap-3">
      {/* Header */}
      <div className="shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">Appraisal Search</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Search across requests, customers, and properties
        </p>
      </div>

      {/* Search Input */}
      <div className="shrink-0">
        <div className="relative">
          <Icon
            style="solid"
            name="magnifying-glass"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by keyword..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon style="solid" name="xmark" className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex items-center border-b border-gray-200">
        {tabConfigs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {!hasSearched ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Icon style="regular" name="magnifying-glass" className="size-12 text-gray-300" />
          <p className="text-gray-500 font-medium">Search to get started</p>
          <p className="text-xs text-gray-400">Enter at least 2 characters to search</p>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="shrink-0">
            <SearchFilterBar
              filters={currentTabConfig.filters}
              values={filters}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
            />
          </div>

          {/* Results Table */}
          <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            <SearchResultsTable
              columns={currentTabConfig.columns}
              items={items}
              isLoading={isLoading}
            />

            {/* Pagination */}
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
        </>
      )}
    </div>
  );
}

export default AppraisalSearchPage;
