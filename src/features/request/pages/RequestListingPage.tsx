import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useRelativeTime } from '@/shared/hooks/useFormatters';
import { formatDate } from '@/shared/utils/dateUtils';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import { useDeleteRequest, useGetRequests } from '../api';
import { isRequestSubmitted, PRE_SUBMIT_STATUSES } from '../utils/status';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Badge from '@/shared/components/Badge';
import Input from '@/shared/components/Input';
import Dropdown from '@/shared/components/inputs/Dropdown';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import SortableTh from '@/features/taskMonitor/components/SortableTh';
import type { SortDir } from '@/features/taskMonitor/types';

// Columns the backend can order by (GetMyRequestsQueryHandler). Priority and channel are not
// here on purpose: the API falls back to created-date order for them, so a sort icon on those
// headers would claim an order the rows are not in.
type SortField = 'requestNumber' | 'customerName' | 'status' | 'purpose' | 'createdAt';
type Sort = { field: SortField; dir: SortDir };

// What the API returns when no sort is sent, and so what the header shows as active.
const DEFAULT_SORT: Sort = { field: 'createdAt', dir: 'desc' };

interface StatusSegmentsProps {
  value: string;
  counts: Record<string, number | undefined>;
  onChange: (status: string) => void;
}

/** "All / Draft / New" as one control. The status names come from the request page's status labels. */
function StatusSegments({ value, counts, onChange }: StatusSegmentsProps) {
  const { t } = useTranslation('request');
  const options = [
    { value: '', label: t('filters.statusAll') },
    ...PRE_SUBMIT_STATUSES.map(status => ({
      value: status,
      label: t(`page.header.status.${status.toLowerCase()}`, { defaultValue: status }),
    })),
  ];

  return (
    <div
      role="group"
      aria-label={t('filters.statusGroup')}
      className="inline-flex rounded-full bg-(--palette-surface-3)/80 p-1 text-sm"
    >
      {options.map(option => {
        const active = option.value === value;
        const count = counts[option.value];
        return (
          <button
            key={option.value || 'all'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={clsx(
              'flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-[calc(0.25rem+1px)] font-medium whitespace-nowrap transition-colors select-none',
              active
                ? 'bg-primary text-white shadow-[0_2px_6px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]'
                : 'text-(--palette-gray-600) hover:text-(--palette-ink)',
            )}
          >
            {option.label}
            {count !== undefined && (
              <span
                className={clsx(
                  'text-xs tabular-nums',
                  active ? 'text-white/80' : 'text-(--palette-gray-400)',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RequestListingPage() {
  const { t } = useTranslation(['request', 'common']);
  const navigate = useNavigate();
  const formatRelativeTime = useRelativeTime();

  // Pagination state
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');

  // Explicit sort chosen by the user; null = the API default, which the header shows as active.
  const [sort, setSort] = useState<Sort | null>(null);
  const activeSort = sort ?? DEFAULT_SORT;

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });
  const deleteRequest = useDeleteRequest();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when filters or sorting change
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, statusFilter, purposeFilter, sort]);

  // Build request params
  const requestParams = {
    pageNumber,
    pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    purpose: purposeFilter || undefined,
    sortBy: sort?.field,
    sortDirection: sort?.dir,
  };

  // Fetch requests - backend handles filtering and sorting
  const {
    data,
    isLoading: isQueryLoading,
    isFetching,
    isError,
    error,
  } = useGetRequests(requestParams);

  // useGetRequests already unwrapped the { result } envelope
  const requests = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // First load vs refetch
  const isFirstLoad = isQueryLoading && requests.length === 0;
  const isRefetching = isFetching && !isFirstLoad;

  // Segment counts. The API returns no per-status totals, so a count is only shown where it is
  // exact: every row is on this page (no status filter, one page) gives all three; otherwise only
  // the selected segment, whose count is the filtered total.
  const segmentCounts = useMemo(() => {
    const counts: Record<string, number | undefined> = {};
    if (!data) return counts;
    const wholeResultOnPage = !statusFilter && totalCount === requests.length;
    if (wholeResultOnPage) {
      counts[''] = totalCount;
      for (const status of PRE_SUBMIT_STATUSES) counts[status] = 0;
      for (const req of requests) {
        if (req.status) counts[req.status] = (counts[req.status] ?? 0) + 1;
      }
    } else {
      counts[statusFilter] = totalCount;
    }
    return counts;
  }, [data, requests, statusFilter, totalCount]);

  const purposeParams = useParametersByGroup('AppraisalPurpose');
  const purposeOptions = useMemo(
    () => purposeParams.map(p => ({ value: p.code, label: p.description, id: p.code })),
    [purposeParams],
  );
  const purposeLabel = (code: string | null | undefined) =>
    code ? (purposeParams.find(p => p.code === code)?.description ?? code) : '';

  const openRequest = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const handleRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, requestId: string) => {
    // Enter on the link or the delete button inside the row belongs to them.
    if (e.key === 'Enter' && e.target === e.currentTarget) openRequest(requestId);
  };

  const handleDelete = (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, id: requestId });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.id) {
      deleteRequest.mutate(deleteConfirm.id, {
        onSuccess: () => {
          setDeleteConfirm({ isOpen: false, id: null });
          toast.success(t('toasts.requestDeleted'));
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || t('toasts.requestDeleteListFailed'));
        },
      });
    }
  };

  // SortableTh cycles asc -> desc -> cleared. Cleared means the default, which is created date
  // descending; when that is already what the header shows, a clear would change nothing, so
  // created date flips to ascending instead.
  const handleSortChange = (field: string | undefined, dir: SortDir | undefined) => {
    if (!field || !dir) {
      setSort(activeSort.field === DEFAULT_SORT.field ? { ...DEFAULT_SORT, dir: 'asc' } : null);
      return;
    }
    const next = { field: field as SortField, dir };
    setSort(next.field === DEFAULT_SORT.field && next.dir === DEFAULT_SORT.dir ? null : next);
  };

  const sortProps = {
    activeSortKey: activeSort.field,
    activeSortDir: activeSort.dir,
    onSortChange: handleSortChange,
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPurposeFilter('');
  };

  const hasFilters = Boolean(searchTerm || statusFilter || purposeFilter);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-(--palette-gray-600)">{t('page.failedToLoad')}</p>
        <p className="text-sm text-(--palette-gray-400)">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Compact Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-(--palette-ink)">{t('page.title')}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-(--palette-surface-3) text-(--palette-gray-600) rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-(--palette-gray-500) mt-0.5">{t('page.subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => navigate('/requests/new')}>
          <Icon style="solid" name="plus" className="size-3.5 mr-1.5" />
          {t('page.newRequest')}
        </Button>
      </div>

      {/* Filters: status segments, search, purpose */}
      <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusSegments value={statusFilter} counts={segmentCounts} onChange={setStatusFilter} />

        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="cursor-pointer text-xs font-medium text-(--palette-primary-text) hover:underline"
            >
              {t('filters.clear')}
            </button>
          )}
          <div className="w-72">
            <Input
              leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
              placeholder={t('filters.searchPlaceholder')}
              aria-label={t('filters.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-56">
            <Dropdown
              options={purposeOptions}
              value={purposeFilter}
              onChange={(value: string | null) => setPurposeFilter(value ?? '')}
              placeholder={t('filters.allPurpose')}
              aria-label={t('filters.allPurpose')}
              showValuePrefix={false}
            />
          </div>
        </div>
      </div>

      {/* Table card: fills the page height, rows scroll inside it under a sticky header and the
          pagination stays pinned at the bottom. The minimum keeps a few rows visible on a short
          screen; below it the page's own scroll container takes over instead of crushing the table. */}
      <div className="flex min-h-[16rem] flex-1 flex-col overflow-hidden rounded-lg border border-(--palette-line) bg-(--palette-surface)">
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <table className="w-full min-w-[52rem] shrink-0 text-table">
            <thead className="bg-(--palette-surface-2) sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-(--palette-line)">
                <SortableTh
                  label={t('columns.requestNumber')}
                  sortKey="requestNumber"
                  {...sortProps}
                />
                <SortableTh label={t('columns.customer')} sortKey="customerName" {...sortProps} />
                <SortableTh label={t('columns.status')} sortKey="status" {...sortProps} />
                <SortableTh label={t('columns.purpose')} sortKey="purpose" {...sortProps} />
                <SortableTh label={t('columns.channel')} />
                <SortableTh label={t('columns.createdAt')} sortKey="createdAt" {...sortProps} />
                <SortableTh label={t('columns.actions')} className="w-16 text-center!" />
              </tr>
            </thead>
            <tbody
              className={clsx(
                'divide-y divide-(--palette-line-soft)',
                isRefetching && 'opacity-50 pointer-events-none',
              )}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-24' },
                    { width: 'w-28' },
                    { width: 'w-20' },
                    { width: 'w-32' },
                    { width: 'w-16' },
                    { width: 'w-20' },
                    { width: 'w-6' },
                  ]}
                  rows={Math.min(pageSize, 8)}
                />
              ) : requests.length === 0 ? null : (
                requests.map(request => {
                  const created = request.createdAt ? formatRelativeTime(request.createdAt) : null;
                  const purpose = purposeLabel(request.purpose);
                  return (
                    <tr
                      key={request.id}
                      tabIndex={0}
                      onClick={() => request.id && openRequest(request.id)}
                      onKeyDown={e => request.id && handleRowKeyDown(e, request.id)}
                      className="cursor-pointer transition-colors hover:bg-(--palette-surface-2) even:bg-(--palette-surface-2)/50 focus-visible:bg-primary/5! focus-visible:outline-none! focus-visible:[&>td:first-child]:shadow-[inset_3px_0_0_var(--color-primary)]"
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          {request.id && request.requestNumber ? (
                            <Link
                              to={`/requests/${request.id}`}
                              onClick={e => e.stopPropagation()}
                              className="font-medium text-(--palette-primary-text) hover:underline"
                            >
                              {request.requestNumber}
                            </Link>
                          ) : (
                            <span className="text-(--palette-gray-400)">—</span>
                          )}
                          {request.priority?.toLowerCase() === 'high' && (
                            <Badge tone="yellow" className="whitespace-nowrap">
                              {t('page.header.urgent')}
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {request.customerName ? (
                          <div className="flex max-w-[16rem] flex-col">
                            <span
                              className="truncate text-(--palette-ink)"
                              title={request.customerName}
                            >
                              {request.customerName}
                            </span>
                            {request.contactNumber && (
                              <span className="truncate text-xs text-(--palette-gray-500)">
                                {request.contactNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-(--palette-gray-400)">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge type="status" value={request.status} className="whitespace-nowrap">
                          {request.status
                            ? t(`page.header.status.${request.status.toLowerCase()}`, {
                                defaultValue: request.status,
                              })
                            : '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-(--palette-ink)">
                        {purpose ? (
                          <div className="max-w-[16rem] truncate" title={purpose}>
                            {purpose}
                          </div>
                        ) : (
                          <span className="text-(--palette-gray-400)">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {request.channel ? (
                          <Badge tone="gray" className="whitespace-nowrap">
                            <ParameterDisplay group="CHANNEL" code={request.channel} />
                          </Badge>
                        ) : (
                          <span className="text-(--palette-gray-400)">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap text-(--palette-gray-500)">
                        {created && request.createdAt ? (
                          <time
                            dateTime={request.createdAt}
                            title={formatDate(request.createdAt, 'dd/MM/yyyy HH:mm')}
                          >
                            {created.relative}
                          </time>
                        ) : (
                          <span className="text-(--palette-gray-400)">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center">
                          {/* Deleting a submitted request would orphan its appraisal task; the
                              backend rejects it too, this just keeps the action out of reach. */}
                          {!isRequestSubmitted(request.status) && (
                            <button
                              type="button"
                              onClick={e => request.id && handleDelete(e, request.id)}
                              className="flex size-6 cursor-pointer items-center justify-center rounded-md text-(--palette-gray-400) transition-colors hover:bg-danger/10 hover:text-danger"
                              title={t('actions.delete')}
                              aria-label={t('actions.delete')}
                            >
                              <Icon style="regular" name="trash-can" className="text-sm" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {!isFirstLoad && requests.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <Icon
                style="regular"
                name="folder-open"
                className="text-3xl text-(--palette-gray-300)"
              />
              <p className="text-sm font-medium text-(--palette-ink)">
                {hasFilters ? t('empty.noMatch') : t('empty.noRequests')}
              </p>
              {hasFilters ? (
                <>
                  <p className="text-xs text-(--palette-gray-500)">
                    {t('empty.noRequestsFiltered')}
                  </p>
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    {t('filters.clear')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-(--palette-gray-500)">{t('empty.noRequestsCreate')}</p>
                  <Button size="sm" onClick={() => navigate('/requests/new')}>
                    <Icon style="solid" name="plus" className="size-3.5 mr-1.5" />
                    {t('page.newRequest')}
                  </Button>
                </>
              )}
            </div>
          )}
          {/* Refetch spinner overlay */}
          {isRefetching && (
            <div className="flex justify-center py-2">
              <Icon
                style="solid"
                name="spinner"
                className="size-4 text-(--palette-primary-text) animate-spin"
              />
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
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
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title={t('confirm.deleteRequestTitle')}
        message={t('confirm.deleteRequestMessage')}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />
    </div>
  );
}

export default RequestListingPage;
