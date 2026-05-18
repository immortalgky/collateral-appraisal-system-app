import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import Button from '@/shared/components/Button';
import Pagination from '@/shared/components/Pagination';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { DateInput, Dropdown } from '@/shared/components/inputs';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceRowActionsMenu from '../components/InvoiceRowActionsMenu';
import InvoiceListTabs from '../components/InvoiceListTabs';
import { useGetInvoices, useDeleteInvoice } from '../api/invoice';

interface InvoiceFilterValues {
  search?: string;
  status?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  paidDateFrom?: string;
  paidDateTo?: string;
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

/** DateInput emits a full ISO string; the backend's DateOnly binder only parses yyyy-MM-dd. */
const toDateOnly = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : undefined);

type Tab = 'unpaid' | 'paid';

/** Count non-empty filter values */
const countActiveFilters = (f: InvoiceFilterValues): number =>
  [f.search, f.status, f.invoiceDateFrom, f.invoiceDateTo, f.paidDateFrom, f.paidDateTo].filter(
    Boolean,
  ).length;

/**
 * Sortable column header — matches the project-standard sort affordance from the
 * task list (ActivityTaskTable). Click the whole <th>, primary-colored text + single
 * chevron when active, dual-arrow ghost icon when inactive.
 */
const SortableTh = ({
  field,
  sortBy,
  sortDir,
  onSort,
  align = 'left',
  children,
}: {
  field: string;
  sortBy: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (f: string) => void;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}) => {
  const isActive = sortBy === field;
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const flexAlign =
    align === 'right' ? 'flex-row-reverse' : align === 'center' ? 'justify-center' : '';
  const iconName = isActive ? (sortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort';
  return (
    <th
      onClick={() => onSort(field)}
      className={`font-medium px-4 py-2.5 whitespace-nowrap select-none cursor-pointer hover:text-gray-900 ${alignCls} ${
        isActive ? 'text-primary' : 'text-gray-600'
      }`}
    >
      <div className={`inline-flex items-center gap-1 ${flexAlign}`}>
        <span>{children}</span>
        <Icon
          style="solid"
          name={iconName}
          className={`size-2.5 ${isActive ? 'text-primary' : 'text-gray-300'}`}
        />
      </div>
    </th>
  );
};

const ExtInvoiceListPage = () => {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('invoice');
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = (searchParams.get('tab') as Tab | null) ?? 'unpaid';

  const setTab = (next: Tab) => {
    setSearchParams({ tab: next }, { replace: true });
    setPageNumber(0);
    // Reset status filter when switching tabs so a history-only status doesn't leak
    setFilters(f => ({ ...f, status: undefined }));
  };

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<InvoiceFilterValues>({});

  /** Server-side sort. Whitelisted: invoiceNumber, sentDate, paidDate, totalAmount,
   *  totalItems, status. Three-stage cycle: unsorted → asc → desc → unsorted. */
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (field: string) => {
    if (sortBy !== field) {
      setSortBy(field);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortBy(null);
      setSortDir('asc');
    }
    setPageNumber(0);
  };

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();

  useEffect(() => {
    setPageNumber(0);
  }, [filters]);

  // Debounce the single search bar to avoid a request per keystroke
  const debouncedSearch = useDebounce(filters.search, 300);

  // Tab drives status: Paid tab → include status=Paid. Unpaid tab → exclude Paid (so
  // Pending drafts AND Sent invoices both show up). The dropdown's explicit value overrides
  // when set on the Unpaid tab.
  const tabStatus = tab === 'paid' ? 'Paid' : undefined;
  const statusParam = filters.status ?? tabStatus;
  // Only apply the exclude when no explicit status is selected on the Unpaid tab — otherwise
  // an explicit status filter could conflict with the exclude.
  const excludeStatusParam =
    tab === 'unpaid' && !filters.status ? 'Paid' : undefined;

  // Map filter date fields to API params (DateOnly = yyyy-MM-dd).
  // Invoice Date applies on both tabs; Paid Date is History-only.
  const sentDateFrom = toDateOnly(filters.invoiceDateFrom);
  const sentDateTo = toDateOnly(filters.invoiceDateTo);
  const paidDateFrom = tab === 'paid' ? toDateOnly(filters.paidDateFrom) : undefined;
  const paidDateTo = tab === 'paid' ? toDateOnly(filters.paidDateTo) : undefined;

  const { data, isLoading, isFetching, isError, error } = useGetInvoices({
    pageNumber,
    pageSize,
    status: statusParam,
    excludeStatus: excludeStatusParam,
    sentDateFrom,
    sentDateTo,
    paidDateFrom,
    paidDateTo,
    search: debouncedSearch || undefined,
    sortBy: sortBy ?? undefined,
    sortDir: sortBy ? sortDir : undefined,
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const grandItemCount = data?.grandItemCount ?? 0;
  const grandTotalAmount = data?.grandTotalAmount ?? 0;

  // Sidecar count query for the OPPOSITE tab. Respects search + date filters
  // so the badge reflects what the user would see if they switched tabs.
  // - On Unpaid → count opposite (Paid) via status=Paid.
  // - On Paid → count opposite (Unpaid) via excludeStatus=Paid (Pending + Sent).
  const otherTabStatus = tab === 'unpaid' ? 'Paid' : undefined;
  const otherTabExcludeStatus = tab === 'paid' ? 'Paid' : undefined;
  const { data: otherTabData } = useGetInvoices({
    pageNumber: 0,
    pageSize: 1,
    status: otherTabStatus,
    excludeStatus: otherTabExcludeStatus,
    sentDateFrom: toDateOnly(filters.invoiceDateFrom),
    sentDateTo: toDateOnly(filters.invoiceDateTo),
    paidDateFrom: tab === 'unpaid' ? toDateOnly(filters.paidDateFrom) : undefined,
    paidDateTo: tab === 'unpaid' ? toDateOnly(filters.paidDateTo) : undefined,
    search: debouncedSearch || undefined,
  });
  const otherTabCount = otherTabData?.grandItemCount;

  const tabCounts = {
    unpaid: tab === 'unpaid' ? grandItemCount : otherTabCount,
    paid: tab === 'paid' ? grandItemCount : otherTabCount,
  };

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;
  const activeFilterCount = countActiveFilters(filters);

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    deleteInvoice(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

  // Status options depend on active tab
  const statusOptions =
    tab === 'unpaid'
      ? [
          { value: 'Pending', label: t('status.Pending') },
          { value: 'Sent', label: t('status.Sent') },
        ]
      : [{ value: 'Paid', label: t('status.Paid') }];

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">{t('errors.loadFailed')}</p>
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
            <h3 className="text-sm font-semibold text-gray-900">{t('list.title')}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('list.subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => navigate('/ext/invoices/new')}>
          <Icon style="solid" name="plus" className="size-3.5 mr-1.5" />
          {t('list.createInvoice')}
        </Button>
      </div>

      {/* Filter bar + tabs on the right */}
      <div className="shrink-0 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-72">
            <Input
              placeholder={t('filter.searchPlaceholder')}
              value={filters.search ?? ''}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined }))}
              leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
            />
          </div>
          <div className="w-40">
            <DateInput
              label={t('filter.invoiceDateFrom')}
              value={filters.invoiceDateFrom ?? null}
              onChange={val => setFilters(f => ({ ...f, invoiceDateFrom: val ?? undefined }))}
              placeholder="dd/mm/yyyy"
            />
          </div>
          <div className="w-40">
            <DateInput
              label={t('filter.invoiceDateTo')}
              value={filters.invoiceDateTo ?? null}
              onChange={val => setFilters(f => ({ ...f, invoiceDateTo: val ?? undefined }))}
              placeholder="dd/mm/yyyy"
            />
          </div>
          {tab === 'paid' && (
            <>
              <div className="w-40">
                <DateInput
                  label={t('filter.paidDateFrom')}
                  value={filters.paidDateFrom ?? null}
                  onChange={val => setFilters(f => ({ ...f, paidDateFrom: val ?? undefined }))}
                  placeholder="dd/mm/yyyy"
                />
              </div>
              <div className="w-40">
                <DateInput
                  label={t('filter.paidDateTo')}
                  value={filters.paidDateTo ?? null}
                  onChange={val => setFilters(f => ({ ...f, paidDateTo: val ?? undefined }))}
                  placeholder="dd/mm/yyyy"
                />
              </div>
            </>
          )}
          {tab === 'unpaid' && (
            <div className="w-40">
              <Dropdown
                label={t('filter.status')}
                placeholder={t('filter.statusPlaceholder')}
                options={statusOptions}
                value={filters.status ?? undefined}
                showValuePrefix={false}
                onChange={(val: string | null) =>
                  setFilters(f => ({ ...f, status: val ?? undefined }))
                }
              />
            </div>
          )}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
              <Icon style="regular" name="xmark" className="size-3.5 mr-1" />
              {t('list.clearFilters')}
            </Button>
          )}
        </div>
        <InvoiceListTabs value={tab} onChange={setTab} counts={tabCounts} />
      </div>

      {/* Table card */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-56" />
              <col className="w-36" />
              {tab === 'paid' && <col className="w-36" />}
              <col className="w-24" />
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-12" />
            </colgroup>
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                <SortableTh field="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                  {t('list.col.invoiceNumber')}
                </SortableTh>
                <SortableTh field="sentDate" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                  {t('list.col.sentDate')}
                </SortableTh>
                {tab === 'paid' && (
                  <SortableTh field="paidDate" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                    {t('list.col.paidDate')}
                  </SortableTh>
                )}
                <SortableTh field="totalItems" align="center" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                  {t('list.col.totalItems')}
                </SortableTh>
                <SortableTh field="totalAmount" align="right" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                  {t('list.col.totalAmount')}
                </SortableTh>
                <SortableTh field="status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                  {t('list.col.status')}
                </SortableTh>
                <th className="px-4 py-2.5" />
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
                    ...(tab === 'paid' ? [{ width: 'w-24' }] : []),
                    { width: 'w-10' },
                    { width: 'w-28' },
                    { width: 'w-20' },
                    { width: 'w-8' },
                  ]}
                  rows={5}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'paid' ? 7 : 6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">{t('list.empty')}</p>
                      <p className="text-xs text-gray-400">
                        {activeFilterCount > 0 ? t('list.tryFilters') : t('list.emptyHint')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 even:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate(
                        item.status === 'Pending'
                          ? `/ext/invoices/${item.id}/edit`
                          : `/ext/invoices/${item.id}`,
                      )
                    }
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-primary">
                        {item.invoiceNumber ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {formatLocaleDate(item.sentDate, i18n.language)}
                    </td>
                    {tab === 'paid' && (
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {formatLocaleDate(item.paidDate, i18n.language)}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-center text-gray-600 tabular-nums">
                      {item.itemCount}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
                      {formatCurrency(item.totalAmount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <InvoiceStatusBadge status={item.status} viewContext="external" />
                    </td>
                    <td
                      className="px-4 py-2.5 text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <InvoiceRowActionsMenu
                        actions={
                          item.status === 'Pending'
                            ? [
                                {
                                  label: t('list.actions.edit'),
                                  icon: 'pen-to-square',
                                  onClick: () => navigate(`/ext/invoices/${item.id}/edit`),
                                },
                                {
                                  label: t('list.actions.delete'),
                                  icon: 'trash',
                                  variant: 'danger',
                                  onClick: () => setDeleteId(item.id),
                                },
                              ]
                            : [
                                {
                                  label: t('list.actions.view'),
                                  icon: 'eye',
                                  onClick: () => navigate(`/ext/invoices/${item.id}`),
                                },
                              ]
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {isRefetching && (
            <div className="flex justify-center py-2">
              <Icon style="solid" name="spinner" className="size-4 text-primary animate-spin" />
            </div>
          )}
        </div>

        {/* Pinned grand-total row — sits below the scroll area, aligned to table columns */}
        {items.length > 0 && (
          <div className="shrink-0 border-t-2 border-gray-300 bg-gray-50">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-56" />
                <col className="w-36" />
                {tab === 'paid' && <col className="w-36" />}
                <col className="w-24" />
                <col className="w-40" />
                <col className="w-32" />
                <col className="w-12" />
              </colgroup>
              <tbody>
                <tr>
                  <td
                    colSpan={tab === 'paid' ? 3 : 2}
                    className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide"
                  >
                    {t('list.grandTotal')}
                  </td>
                  <td className="px-4 py-2.5 text-center font-semibold text-gray-900 tabular-nums">
                    {grandItemCount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-primary tabular-nums whitespace-nowrap">
                    {formatCurrency(grandTotalAmount)}
                  </td>
                  <td />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}


        {/* Pagination */}
        {totalCount > 0 && (
          <div className="shrink-0 border-t border-gray-200">
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

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => (isDeleting ? undefined : setDeleteId(null))}
        onConfirm={handleDeleteConfirm}
        title={t('list.deleteConfirm.title')}
        message={t('list.deleteConfirm.message')}
        confirmText={t('list.deleteConfirm.confirm')}
        cancelText={t('list.deleteConfirm.cancel')}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ExtInvoiceListPage;
