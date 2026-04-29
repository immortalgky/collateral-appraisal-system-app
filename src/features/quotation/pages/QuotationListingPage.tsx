import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Input from '@/shared/components/Input';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { DateInput } from '@/shared/components/inputs';
import { formatLocaleDate, formatLocaleDateTime } from '@/shared/utils/dateUtils';
import QuotationStatusBadge from '../components/QuotationStatusBadge';
import { useCancelQuotation, useGetQuotations, type QuotationListItem } from '../api/quotation';
import { QuotationStatusSchema } from '../schemas/quotation';

/** Slice a DatePickerInput ISO value (`2026-04-28T00:00:00+07:00`) down to the
    `yyyy-MM-dd` slug the backend's `DateOnly?` query binder expects. */
const toDateOnly = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10) : undefined;

const QUOTATION_STATUS_OPTIONS = QuotationStatusSchema.options;

const TERMINAL_STATUSES = new Set(['Finalized', 'Cancelled', 'Closed']);

interface RowActionsMenuProps {
  canDelete: boolean;
  onDelete: () => void;
}

const RowActionsMenu = ({ canDelete, onDelete }: RowActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Row actions"
      >
        <Icon name="ellipsis-vertical" style="solid" className="size-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={e => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px]">
            {canDelete ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setOpen(false);
                  onDelete();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <Icon name="trash" style="solid" className="size-3.5 shrink-0" />
                Delete
              </button>
            ) : (
              <div className="px-3 py-2 text-xs text-gray-400 italic">No actions available</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

function QuotationListingPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  // Pagination state
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Filter state — date filters store ISO from DatePickerInput; sliced to yyyy-MM-dd at the API boundary.
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState<string | null>(null);
  const [dueDateTo, setDueDateTo] = useState<string | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Delete confirmation state — backed by the existing /cancel endpoint
  // (Cancel is the soft-delete path; idempotent for non-terminal statuses).
  const [pendingDelete, setPendingDelete] = useState<QuotationListItem | null>(null);
  const { mutate: cancelQuotation, isPending: isCancelling } = useCancelQuotation(
    pendingDelete?.id ?? '',
  );

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    cancelQuotation(
      { reason: 'Deleted from list' },
      { onSuccess: () => setPendingDelete(null) },
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, statusFilter, dueDateFrom, dueDateTo]);

  const { data, isLoading, isFetching, isError, error } = useGetQuotations({
    pageNumber,
    pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    dueDateFrom: toDateOnly(dueDateFrom),
    dueDateTo: toDateOnly(dueDateTo),
  });

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;

  const hasFilters = searchTerm || statusFilter || dueDateFrom || dueDateTo;

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setDueDateFrom(null);
    setDueDateTo(null);
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">Failed to load quotations</p>
        <p className="text-sm text-gray-400">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Quotations</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Manage and track quotation requests</p>
        </div>
        <Button size="sm" onClick={() => navigate('/quotations/new')}>
          <Icon style="solid" name="plus" className="size-3.5 mr-1.5" />
          New Quotation
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 flex items-end gap-3 pb-1 flex-wrap">
        {/* Search */}
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Quotation number or requester"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
          />
        </div>

        {/* Status Filter — kept as native select; shared Dropdown renders "value - label" which is wrong here. */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white min-w-36 hover:border-gray-300"
        >
          <option value="">All statuses</option>
          {QUOTATION_STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Cut Off Time — From */}
        <div className="w-40">
          <DateInput
            label="Cut Off From"
            value={dueDateFrom}
            onChange={setDueDateFrom}
            placeholder="dd/mm/yyyy"
          />
        </div>

        {/* Cut Off Time — To */}
        <div className="w-40">
          <DateInput
            label="Cut Off To"
            value={dueDateTo}
            onChange={setDueDateTo}
            placeholder="dd/mm/yyyy"
          />
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" size="xs" onClick={handleClearFilters}>
            <Icon style="solid" name="xmark" className="size-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Quotation #</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Status</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Cut Off Time</th>
                <th className="text-center font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  No of Appraisal
                </th>
                <th className="text-center font-medium text-gray-600 px-4 py-2.5">Response</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Created Date
                </th>
                <th className="w-10 px-4 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-gray-100 ${isRefetching ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-28' },
                    { width: 'w-24' },
                    { width: 'w-32' },
                    { width: 'w-12' },
                    { width: 'w-12' },
                    { width: 'w-24' },
                    { width: 'w-6' },
                  ]}
                  rows={5}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">No quotations found</p>
                      <p className="text-xs text-gray-400">
                        {hasFilters ? 'Try different filters' : 'Create your first quotation'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const canDelete = !TERMINAL_STATUSES.has(item.status);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/quotations/${item.id}`)}
                      className="hover:bg-gray-50 even:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-primary">{item.quotationNumber}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <QuotationStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {formatLocaleDateTime(item.dueDate, i18n.language)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600 tabular-nums">
                        {item.totalAppraisals}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600 tabular-nums">
                        {item.totalQuotationsReceived}/{item.totalCompaniesInvited}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {formatLocaleDate(item.requestDate, i18n.language)}
                      </td>
                      <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                        <RowActionsMenu
                          canDelete={canDelete}
                          onDelete={() => setPendingDelete(item)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {isRefetching && (
            <div className="flex justify-center py-2">
              <Icon style="solid" name="spinner" className="size-4 text-primary animate-spin" />
            </div>
          )}
        </div>

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

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={() => (isCancelling ? undefined : setPendingDelete(null))}
        onConfirm={handleConfirmDelete}
        title="Delete quotation?"
        message={
          pendingDelete
            ? `Quotation ${pendingDelete.quotationNumber} will be cancelled and removed from active lists. This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="danger"
        isLoading={isCancelling}
      />
    </div>
  );
}

export default QuotationListingPage;
