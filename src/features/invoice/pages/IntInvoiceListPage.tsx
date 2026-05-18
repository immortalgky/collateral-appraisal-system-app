import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import Pagination from '@/shared/components/Pagination';
import Button from '@/shared/components/Button';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { DateInput, Dropdown } from '@/shared/components/inputs';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceRowActionsMenu from '../components/InvoiceRowActionsMenu';
import InvoiceListTabs from '../components/InvoiceListTabs';
import CompanyAutocomplete from '@features/appraisal/components/search/CompanyAutocomplete';
import { useGetInvoices } from '../api/invoice';

interface InvoiceFilterValues {
  search?: string;
  /** Company GUID picked via CompanyAutocomplete. */
  companyId?: string;
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

/** Count non-empty filter values */
const countActiveFilters = (f: InvoiceFilterValues): number =>
  [
    f.search,
    f.companyId,
    f.status,
    f.invoiceDateFrom,
    f.invoiceDateTo,
    f.paidDateFrom,
    f.paidDateTo,
  ].filter(Boolean).length;

const IntInvoiceListPage = () => {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('invoice');
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = (searchParams.get('tab') as Tab | null) ?? 'unpaid';

  const setTab = (next: Tab) => {
    setSearchParams({ tab: next }, { replace: true });
    setPageNumber(0);
    setSelectedIds(new Set());
    // Reset status filter when switching tabs
    setFilters(f => ({ ...f, status: undefined }));
  };

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<InvoiceFilterValues>({});
  /** Group-by criterion. Add new keys here as new criteria are supported. */
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const groupByCompany = groupBy === 'company';

  /** Server-side sort. Whitelisted backend columns: invoiceNumber, companyName,
   *  sentDate, paidDate, totalAmount, totalItems, status. Three-stage cycle:
   *  unsorted → asc → desc → unsorted. */
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

  // Bulk selection state. PO + paid date inputs live on the bulk-payment screen.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lockedCompanyId, setLockedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    setPageNumber(0);
    setSelectedIds(new Set());
    setLockedCompanyId(null);
  }, [filters, tab]);

  // Debounce text-input filters
  const debouncedSearch = useDebounce(filters.search, 300);

  // Tab drives status: Unpaid tab → status=Sent (internal only sees Sent on the
  // unpaid side); Paid tab → status=Paid. Dropdown override applies when set.
  const tabStatus = tab === 'unpaid' ? 'Sent' : 'Paid';
  const statusParam = filters.status ?? tabStatus;

  // Invoice Date applies on both tabs; Paid Date is History-only. DateOnly = yyyy-MM-dd.
  const sentDateFrom = toDateOnly(filters.invoiceDateFrom);
  const sentDateTo = toDateOnly(filters.invoiceDateTo);
  const paidDateFrom = tab === 'paid' ? toDateOnly(filters.paidDateFrom) : undefined;
  const paidDateTo = tab === 'paid' ? toDateOnly(filters.paidDateTo) : undefined;

  const { data, isLoading, isFetching, isError, error } = useGetInvoices({
    pageNumber,
    pageSize,
    status: statusParam,
    companyId: filters.companyId,
    sentDateFrom,
    sentDateTo,
    paidDateFrom,
    paidDateTo,
    search: debouncedSearch || undefined,
    groupBy: groupBy ?? undefined,
    sortBy: sortBy ?? undefined,
    sortDir: sortBy ? sortDir : undefined,
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const grandItemCount = data?.grandItemCount ?? 0;
  const grandTotalAmount = data?.grandTotalAmount ?? 0;

  // Per-group subtotals (current page only). Keyed by `companyId` so two
  // companies with the same display name (or a null name) don't merge.
  const groupSubtotals = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    if (!groupByCompany) return map;
    for (const item of items) {
      const prev = map.get(item.companyId) ?? { count: 0, total: 0 };
      map.set(item.companyId, { count: prev.count + 1, total: prev.total + item.totalAmount });
    }
    return map;
  }, [items, groupByCompany]);

  // Sidecar count query for the OPPOSITE tab. Respects company/search/date filters.
  const otherTabStatus = tab === 'unpaid' ? 'Paid' : 'Sent';
  const { data: otherTabData } = useGetInvoices({
    pageNumber: 0,
    pageSize: 1,
    status: otherTabStatus,
    companyId: filters.companyId,
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

  const toggleRow = (id: string, companyId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setLockedCompanyId(null);
      } else {
        next.add(id);
        setLockedCompanyId(companyId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setLockedCompanyId(null);
  };

  // Toggle selection of a batch of row ids belonging to the same company.
  // If they're all already selected, deselects them; otherwise selects them
  // and locks the company. Used by the header "select all" and per-group
  // checkboxes.
  const handleToggleBatch = (companyId: string, ids: string[]) => {
    if (ids.length === 0) return;
    const allSelected = ids.every(id => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) {
      ids.forEach(id => next.delete(id));
      setSelectedIds(next);
      if (next.size === 0) setLockedCompanyId(null);
    } else {
      ids.forEach(id => next.add(id));
      setSelectedIds(next);
      setLockedCompanyId(companyId);
    }
  };

  // Pre-compute per-company id buckets for the visible items so group/header
  // checkboxes can flip all of a company's rows in one click. Keyed by
  // `companyId` (display name can collide or be null).
  const companyBuckets = useMemo(() => {
    const map = new Map<string, { companyId: string; companyName: string | null; ids: string[] }>();
    for (const item of items) {
      const bucket = map.get(item.companyId) ?? {
        companyId: item.companyId,
        companyName: item.companyName,
        ids: [],
      };
      bucket.ids.push(item.id);
      map.set(item.companyId, bucket);
    }
    return map;
  }, [items]);

  // The "target" company for the table's header select-all checkbox.
  // Honours the existing lock if set; otherwise picks the first visible group.
  const headerTarget =
    lockedCompanyId !== null
      ? companyBuckets.get(lockedCompanyId)
      : Array.from(companyBuckets.values())[0];
  const headerAllSelected =
    headerTarget !== undefined &&
    headerTarget.ids.length > 0 &&
    headerTarget.ids.every(id => selectedIds.has(id));
  const headerSomeSelected =
    headerTarget !== undefined &&
    !headerAllSelected &&
    headerTarget.ids.some(id => selectedIds.has(id));

  // Move on to the payment screen — single invoice → its detail page,
  // multiple → bulk-payment page (we forward the selected rows via location state).
  const handleProceedToPayment = () => {
    const selected = items.filter(i => selectedIds.has(i.id));
    if (selected.length === 0) return;
    if (selected.length === 1) {
      navigate(`/admin/invoices/${selected[0].id}`);
      return;
    }
    // All selected invoices share a company (enforced via lockedCompanyId);
    // the bulk-payment page fetches bank info from one of the detail records.
    navigate('/admin/invoices/bulk-payment', {
      state: { invoices: selected },
    });
  };

  const lockedCompanyName =
    lockedCompanyId !== null
      ? items.find(i => i.companyId === lockedCompanyId)?.companyName ?? null
      : null;

  // Status options depend on active tab
  const statusOptions =
    tab === 'unpaid'
      ? [{ value: 'Sent', label: t('status.Sent') }]
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
          <p className="text-xs text-gray-500 mt-0.5">{t('internal.subtitle')}</p>
        </div>
      </div>

      {/* Filter bar + tabs on the right.
          Right pane (Group by + Tabs) is pinned top-right and never wraps below;
          filters wrap to additional rows on the left when they can't fit on a single line. */}
      <div className="shrink-0 flex items-start gap-4">
        <div className="flex-1 min-w-0 flex flex-wrap items-end gap-2">
          <div className="w-72">
            <Input
              placeholder={t('filter.searchPlaceholder')}
              value={filters.search ?? ''}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined }))}
              leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
            />
          </div>
          <div className="w-64">
            <CompanyAutocomplete
              value={filters.companyId ?? ''}
              onChange={id => setFilters(f => ({ ...f, companyId: id || undefined }))}
              placeholder={t('filter.companySearch')}
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
        <div className="shrink-0 flex items-end gap-2">
          <div className="w-40">
            <Dropdown
              label={t('list.groupBy')}
              placeholder={t('list.groupByNone')}
              options={[{ value: 'company', label: t('list.groupByCompany') }]}
              value={groupBy ?? undefined}
              showValuePrefix={false}
              onChange={(val: string | null) => setGroupBy(val || null)}
            />
          </div>
          <InvoiceListTabs value={tab} onChange={setTab} counts={tabCounts} />
        </div>
      </div>

      {/* Table card */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              {tab === 'unpaid' && <col className="w-10" />}
              <col className="w-48" />
              {!groupByCompany && <col className="w-48" />}
              <col className="w-36" />
              {tab === 'paid' && <col className="w-32" />}
              <col className="w-24" />
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-16" />
            </colgroup>
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                {tab === 'unpaid' && (
                  <th className="text-left px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={headerAllSelected}
                      ref={el => {
                        if (el) el.indeterminate = headerSomeSelected;
                      }}
                      disabled={!headerTarget}
                      onChange={() => {
                        if (headerTarget) handleToggleBatch(headerTarget.companyId, headerTarget.ids);
                      }}
                      aria-label={t('list.selectAll')}
                      className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </th>
                )}
                <SortableTh field="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                  {t('list.col.invoiceNumber')}
                </SortableTh>
                {!groupByCompany && (
                  <SortableTh field="companyName" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                    {t('list.col.companyName')}
                  </SortableTh>
                )}
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
                    ...(tab === 'unpaid' ? [{ width: 'w-6' }] : []),
                    { width: 'w-28' },
                    ...(!groupByCompany ? [{ width: 'w-32' }] : []),
                    { width: 'w-24' },
                    ...(tab === 'paid' ? [{ width: 'w-24' }] : []),
                    { width: 'w-10' },
                    { width: 'w-28' },
                    { width: 'w-20' },
                    { width: 'w-16' },
                  ]}
                  rows={5}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      (tab === 'unpaid' ? 1 : 0) + (groupByCompany ? 0 : 1) + (tab === 'paid' ? 1 : 0) + 6
                    }
                    className="text-center py-16"
                  >
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
                items.map((item, idx) => {
                  const isSelected = selectedIds.has(item.id);
                  const isDisabled =
                    tab === 'unpaid' &&
                    lockedCompanyId !== null &&
                    item.companyId !== lockedCompanyId;
                  const isFirstInGroup =
                    groupByCompany &&
                    (idx === 0 || items[idx - 1].companyId !== item.companyId);
                  const isLastInGroup =
                    groupByCompany &&
                    (idx === items.length - 1 ||
                      items[idx + 1].companyId !== item.companyId);
                  const subtotal = isLastInGroup
                    ? groupSubtotals.get(item.companyId)
                    : undefined;
                  // Group header spans every column EXCEPT the checkbox column
                  // (which gets its own group select-all checkbox on Unpaid).
                  const headerNameColSpan =
                    (tab === 'paid' ? 1 : 0) + 6;
                  const groupBucket = isFirstInGroup
                    ? companyBuckets.get(item.companyId)
                    : undefined;
                  const groupAllSelected =
                    !!groupBucket &&
                    groupBucket.ids.every(id => selectedIds.has(id));
                  const groupSomeSelected =
                    !!groupBucket &&
                    !groupAllSelected &&
                    groupBucket.ids.some(id => selectedIds.has(id));
                  const groupCheckboxDisabled =
                    !!groupBucket &&
                    lockedCompanyId !== null &&
                    groupBucket.companyId !== lockedCompanyId &&
                    !groupAllSelected &&
                    !groupSomeSelected;

                  return (
                    <Fragment key={item.id}>
                      {isFirstInGroup && (
                        <tr className="bg-gray-50/80 border-t border-gray-200">
                          {tab === 'unpaid' && (
                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={groupAllSelected}
                                ref={el => {
                                  if (el) el.indeterminate = groupSomeSelected;
                                }}
                                disabled={groupCheckboxDisabled}
                                onChange={() => {
                                  if (groupBucket)
                                    handleToggleBatch(groupBucket.companyId, groupBucket.ids);
                                }}
                                onClick={e => e.stopPropagation()}
                                aria-label={t('list.selectAll')}
                                className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                          )}
                          <td
                            colSpan={headerNameColSpan}
                            className="px-4 py-2.5 text-xs font-semibold text-gray-700 tracking-tight"
                          >
                            <Icon
                              style="solid"
                              name="building"
                              className="size-3 text-gray-400 mr-1.5 inline"
                            />
                            {item.companyName ?? '—'}
                          </td>
                        </tr>
                      )}
                      <tr
                        className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary/5' : ''} ${isDisabled ? 'opacity-40' : 'cursor-pointer'}`}
                        onClick={() => navigate(`/admin/invoices/${item.id}`)}
                      >
                        {tab === 'unpaid' && (
                          <td
                            className="px-4 py-2.5"
                            onClick={e => {
                              // Stop the row click from navigating. Only the input
                              // itself toggles selection — clicks elsewhere in the
                              // cell are absorbed (no toggle, no navigation).
                              e.stopPropagation();
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => toggleRow(item.id, item.companyId)}
                              onClick={e => e.stopPropagation()}
                              className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                        )}
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-primary">
                            {item.invoiceNumber ?? '—'}
                          </span>
                        </td>
                        {!groupByCompany && (
                          <td className="px-4 py-2.5 text-gray-700">
                            {item.companyName ?? '—'}
                          </td>
                        )}
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
                          <InvoiceStatusBadge status={item.status} viewContext="internal" />
                        </td>
                        <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                          <InvoiceRowActionsMenu
                            actions={[
                              {
                                label: t('list.actions.view'),
                                icon: 'eye',
                                onClick: () => navigate(`/admin/invoices/${item.id}`),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                      {subtotal && (
                        <tr className="bg-gray-50/60 border-t border-gray-100">
                          {tab === 'unpaid' && <td />}
                          <td
                            colSpan={tab === 'paid' ? 3 : 2}
                            className="px-4 py-1.5 text-[11px] font-medium text-gray-500 italic"
                          >
                            {t('list.subtotal')}
                          </td>
                          <td className="px-4 py-1.5 text-center text-xs font-semibold text-gray-700 tabular-nums">
                            {subtotal.count}
                          </td>
                          <td className="px-4 py-1.5 text-right text-xs font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                            {formatCurrency(subtotal.total)}
                          </td>
                          <td />
                          <td />
                        </tr>
                      )}
                    </Fragment>
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

        {/* Pinned grand-total row — sits below the scroll area, aligned to table columns */}
        {items.length > 0 && (
          <div className="shrink-0 border-t-2 border-gray-300 bg-gray-50">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                {tab === 'unpaid' && <col className="w-10" />}
                <col className="w-48" />
                {!groupByCompany && <col className="w-48" />}
                <col className="w-36" />
                {tab === 'paid' && <col className="w-32" />}
                <col className="w-24" />
                <col className="w-40" />
                <col className="w-32" />
                <col className="w-16" />
              </colgroup>
              <tbody>
                <tr>
                  {tab === 'unpaid' && <td />}
                  <td
                    colSpan={
                      (groupByCompany ? 0 : 1) + (tab === 'paid' ? 1 : 0) + 2
                    }
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

      {/* Floating bulk action bar — gallery-style sticky bottom dock */}
      {tab === 'unpaid' && selectedIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-2.5 bg-white border border-gray-200 rounded-full shadow-[0_8px_24px_-4px_rgba(0,0,0,0.15),0_4px_8px_-2px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-4 fade-in duration-200"
          role="region"
          aria-label={t('internal.markPaidTitle')}
        >
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            <span className="text-primary font-semibold">{selectedIds.size}</span>{' '}
            {t('internal.selected')}
            {lockedCompanyName && (
              <span className="text-gray-500 font-normal"> · {lockedCompanyName}</span>
            )}
          </span>
          <span className="h-5 w-px bg-gray-200" />
          <Button size="sm" onClick={handleProceedToPayment}>
            <Icon style="solid" name="circle-check" className="size-3.5 mr-1.5" />
            {t('internal.markAsPaid')}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            <Icon style="regular" name="xmark" className="size-3.5 mr-1" />
            {t('list.clearFilters')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default IntInvoiceListPage;
