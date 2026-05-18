import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Pagination from '@shared/components/Pagination';
import Icon from '@shared/components/Icon';
import { useDebounce } from '@shared/hooks/useDebounce';

import { useMonitoredPeople } from '../api/taskMonitor';
import PeopleMonitorTable from '../components/PeopleMonitorTable';
import type { GetMonitoredPeopleParams, SortDir } from '../types';

function TaskMonitorPage() {
  const { t } = useTranslation('nav');
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebounce(search, 400);
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<SortDir | undefined>(undefined);

  const handleSortChange = (key: string | undefined, dir: SortDir | undefined) => {
    setSortBy(key);
    setSortDir(dir);
    setPageNumber(0);
  };

  // Sync search to URL
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set('search', debouncedSearch);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  // Reset to page 0 when search changes
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch]);

  const queryParams: GetMonitoredPeopleParams = {
    search: debouncedSearch || undefined,
    sortBy,
    sortDir,
    page: pageNumber,
    pageSize,
  };

  const { data, isLoading, isError, error } = useMonitoredPeople(queryParams);

  const people = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* ── Page header ── */}
      <div className="shrink-0 mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">{t('taskMonitor.title')}</h2>
          {!isLoading && totalCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full tabular-nums">
              {totalCount}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{t('taskMonitor.description')}</p>
      </div>

      {/* ── Search bar ── */}
      <div className="shrink-0 mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Icon
            style="solid"
            name="magnifying-glass"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search user code or name..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
          />
        </div>
      </div>

      {/* ── Error state ── */}
      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
            <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">Failed to load monitored people</p>
            <p className="text-xs text-gray-400 mt-0.5">{(error as Error)?.message}</p>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {!isError && (
        <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <PeopleMonitorTable
            people={people}
            isLoading={isLoading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={handleSortChange}
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
      )}
    </div>
  );
}

export default TaskMonitorPage;
