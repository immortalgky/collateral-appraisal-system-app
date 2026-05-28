import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Icon from '@shared/components/Icon';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Pagination from '@shared/components/Pagination';
import DataErrorState from '@shared/components/DataErrorState';
import { useGetLogs } from '../api/useGetLogs';
import LogDetailDrawer from '../components/LogDetailDrawer';
import type { LogItem, LogLevel } from '../types';
import { logLevelBadgeClass } from '../types';

const PAGE_SIZE = 20;

const TABLE_SKELETON_COLUMNS = [
  { width: 'w-32' },
  { width: 'w-20' },
  { width: 'w-56' },
  { width: 'w-28' },
  { width: 'w-28' },
  { width: 'w-28' },
  { width: 'w-28' },
];

// The sink only persists Information and above (restrictedToMinimumLevel: Information),
// so Verbose/Debug are intentionally omitted — they can never match a stored row.
const LEVEL_OPTIONS: { value: LogLevel | ''; label: string }[] = [
  { value: '', label: 'All levels' },
  { value: 'Information', label: 'Information' },
  { value: 'Warning', label: 'Warning' },
  { value: 'Error', label: 'Error' },
  { value: 'Fatal', label: 'Fatal' },
];

const LogViewerPage = () => {
  const { t } = useTranslation('logAdmin');

  // ─── Filter state ───────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [level, setLevel] = useState<LogLevel | ''>('');
  const [correlationId, setCorrelationId] = useState('');
  const [appraisalId, setAppraisalId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [entityId, setEntityId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  // Drawer state
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  // Debounce message search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPageIndex(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 0 on filter changes (non-debounced ones)
  useEffect(() => {
    setPageIndex(0);
  }, [level, correlationId, appraisalId, requestId, entityId, fromDate, toDate]);

  const hasFilters =
    searchInput || level || correlationId || appraisalId || requestId || entityId || fromDate || toDate;

  const clearFilters = () => {
    setSearchInput('');
    setLevel('');
    setCorrelationId('');
    setAppraisalId('');
    setRequestId('');
    setEntityId('');
    setFromDate('');
    setToDate('');
  };

  const { data, isLoading, isError, refetch } = useGetLogs({
    pageNumber: pageIndex,
    pageSize: PAGE_SIZE,
    level: level || undefined,
    search: debouncedSearch || undefined,
    correlationId: correlationId || undefined,
    appraisalId: appraisalId || undefined,
    requestId: requestId || undefined,
    entityId: entityId || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  });

  const logs = data?.items ?? [];
  const totalCount = data?.count ?? 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        icon="file-lines"
        iconColor="blue"
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-2">
          {/* Message search */}
          <div className="relative min-w-48">
            <Icon
              name="magnifying-glass"
              style="regular"
              className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Level select */}
          <select
            value={level}
            onChange={e => setLevel(e.target.value as LogLevel | '')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            {LEVEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* CorrelationId */}
          <input
            type="text"
            value={correlationId}
            onChange={e => setCorrelationId(e.target.value)}
            placeholder={t('filters.correlationIdPlaceholder')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-40"
          />

          {/* AppraisalId */}
          <input
            type="text"
            value={appraisalId}
            onChange={e => setAppraisalId(e.target.value)}
            placeholder={t('filters.appraisalIdPlaceholder')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-40"
          />

          {/* RequestId */}
          <input
            type="text"
            value={requestId}
            onChange={e => setRequestId(e.target.value)}
            placeholder={t('filters.requestIdPlaceholder')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-40"
          />

          {/* EntityId */}
          <input
            type="text"
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            placeholder={t('filters.entityIdPlaceholder')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-36"
          />

          {/* From date */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{t('filters.from')}</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* To date */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{t('filters.to')}</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('filters.clear')}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {t('columns.timeStamp')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('columns.level')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('columns.message')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {t('columns.correlationId')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {t('columns.appraisalId')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {t('columns.requestId')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {t('columns.entityId')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableRowSkeleton columns={TABLE_SKELETON_COLUMNS} rows={8} />
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-4">
                    <DataErrorState
                      variant="inline"
                      title={t('error.failedToLoad')}
                      onRetry={refetch}
                    />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                    <Icon name="file-lines" style="regular" className="size-8 mx-auto mb-2 opacity-40" />
                    <p>{t('emptyState')}</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap tabular-nums text-xs">
                      {new Date(log.timeStamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {log.level ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${logLevelBadgeClass[log.level]}`}
                        >
                          {log.level}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span
                        title={log.message ?? undefined}
                        className="block truncate text-gray-900"
                      >
                        {log.message ?? <span className="text-gray-300">—</span>}
                      </span>
                      {log.exception && (
                        <span className="block truncate text-xs text-danger mt-0.5" title={log.exception}>
                          {log.exception}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-28">
                      <span className="block truncate" title={log.correlationId ?? undefined}>
                        {log.correlationId ?? <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-28">
                      <span className="block truncate" title={log.appraisalId ?? undefined}>
                        {log.appraisalId ?? <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-28">
                      <span className="block truncate" title={log.requestId ?? undefined}>
                        {log.requestId ?? <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-28">
                      <span className="block truncate" title={log.entityId ?? undefined}>
                        {log.entityId ?? <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalCount > 0 && (
          <Pagination
            currentPage={pageIndex}
            totalPages={Math.ceil(totalCount / PAGE_SIZE)}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPageIndex}
            showPageSizeSelector={false}
          />
        )}
      </div>

      {/* Detail drawer */}
      <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};

export default LogViewerPage;
