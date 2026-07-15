import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

import Pagination from '@shared/components/Pagination';
import Icon from '@shared/components/Icon';
import { useDebounce } from '@shared/hooks/useDebounce';
import QuotationStatusBadge from '@features/quotation/components/QuotationStatusBadge';
import SearchByInput from '@features/quotation/components/SearchByInput';
import { DateInput, MultiSelectDropdown } from '@shared/components/inputs';
import type { ListBoxItem } from '@shared/components/inputs';
import CompanyAutocomplete from '@shared/components/inputs/CompanyAutocomplete';
import { useCompanyStore } from '@shared/store';

import { usePendingQuotations } from '../../api/monitoringApi';
import type { PendingQuotation, PendingQuotationFilter, SortDir } from '../../api/types';
import MonitoringDataTable, { type ColumnDef } from '../MonitoringDataTable';
import ActiveFilterChips, { type ActiveFilterChip } from '../ActiveFilterChips';
import { DateCell } from '../DateCell';

const QUOTATION_STATUS_OPTIONS: ListBoxItem[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Sent' },
  { value: 'UnderAdminReview', label: 'Under Admin Review' },
  { value: 'PendingRmSelection', label: 'Pending RM Selection' },
  { value: 'WinnerTentative', label: 'Winner Tentative' },
  { value: 'Negotiating', label: 'Negotiating' },
  { value: 'Finalized', label: 'Finalized' },
  { value: 'Cancelled', label: 'Cancelled' },
];

/** Slice a DateInput ISO value down to the yyyy-MM-dd slug the backend's DateOnly? binder expects. */
const toDateOnly = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : undefined);

/** Relative "N ago" label for an ISO value; null when absent/unparseable. */
const relativeAgo = (value: string | null): string | null => {
  if (!value) return null;
  try {
    return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
  } catch {
    return null;
  }
};

// Combined search box + a "search by" selector: only the chosen field is sent to the backend.
type SearchField = 'quotationNo' | 'appraisalNo' | 'customerName';
const SEARCH_FIELD_OPTIONS = [
  { value: 'quotationNo', label: 'Quotation No.', icon: 'file-invoice' },
  { value: 'appraisalNo', label: 'Appraisal No.', icon: 'building' },
  { value: 'customerName', label: 'Customer Name', icon: 'user' },
];

const COLUMNS: ColumnDef<PendingQuotation>[] = [
  {
    key: 'quotationNumber',
    label: 'Quotation Number',
    sortKey: 'QuotationNumber',
    render: row => (
      <span className="text-sm font-medium text-primary">{row.quotationNumber ?? '—'}</span>
    ),
  },
  {
    key: 'customerName',
    label: 'Customer Name',
    sortKey: 'CustomerName',
    render: row => (
      <div className="max-w-[180px]" title={row.customerNames ?? undefined}>
        <span className="inline-block max-w-full truncate align-bottom text-xs text-gray-700">
          {row.customerName ?? '—'}
        </span>
        {row.customerCount > 1 && (
          <span className="ml-1 text-[10px] text-gray-400">+{row.customerCount - 1}</span>
        )}
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: row =>
      row.status ? (
        <QuotationStatusBadge status={row.status} />
      ) : (
        <span className="text-gray-400 text-xs">—</span>
      ),
  },
  {
    key: 'cutOffTime',
    label: 'Cut Off Time',
    sortKey: 'CutOffTime',
    className: '!text-center',
    render: row => <DateCell value={row.cutOffTime} withTime />,
  },
  {
    key: 'totalAppraisals',
    label: 'No of Appraisal(s)',
    sortKey: 'TotalAppraisals',
    className: '!text-center',
    render: row => <span className="text-xs tabular-nums">{row.totalAppraisals}</span>,
  },
  {
    key: 'totalQuotationsReceived',
    label: 'Response',
    sortKey: 'TotalQuotationsReceived',
    className: '!text-center',
    render: row => (
      <span className="text-xs tabular-nums">
        {row.totalQuotationsReceived}/{row.totalCompaniesInvited}
      </span>
    ),
  },
  {
    key: 'rmUsername',
    label: 'RM',
    sortKey: 'RmUsername',
    render: row => (
      <div className="leading-tight">
        <div className="text-xs text-gray-700">{row.rmUsername ?? '—'}</div>
        {row.rmFullName && <div className="text-[10px] text-gray-400">{row.rmFullName}</div>}
      </div>
    ),
  },
  {
    key: 'requestDate',
    label: 'Created At',
    sortKey: 'RequestDate',
    render: row => {
      const sub = [row.requestedBy, relativeAgo(row.requestDate)].filter(Boolean).join(' · ');
      return (
        <div className="flex flex-col gap-0.5">
          <DateCell value={row.requestDate} withTime />
          {sub && <span className="text-[10px] text-gray-400">{sub}</span>}
        </div>
      );
    },
  },
];

interface PendingQuotationSectionProps {
  onCountChange?: (count: number) => void;
}

function PendingQuotationSection({ onCountChange }: PendingQuotationSectionProps) {
  const { t } = useTranslation('monitoring');
  const navigate = useNavigate();

  const [searchField, setSearchField] = useState<SearchField>('quotationNo');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<SortDir | undefined>();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [cutOffTimeFrom, setCutOffTimeFrom] = useState<string | null>(null);
  const [cutOffTimeTo, setCutOffTimeTo] = useState<string | null>(null);
  const [appraisalCompanyFilter, setAppraisalCompanyFilter] = useState('');

  const companies = useCompanyStore(s => s.companies);

  const term = debouncedSearch || undefined;
  const filter: PendingQuotationFilter = {
    quotationNo: searchField === 'quotationNo' ? term : undefined,
    appraisalNo: searchField === 'appraisalNo' ? term : undefined,
    customerName: searchField === 'customerName' ? term : undefined,
    status: statusFilter.length ? statusFilter : undefined,
    page,
    pageSize,
    sortBy,
    sortDir,
    ...(cutOffTimeFrom && { cutOffTimeFrom: toDateOnly(cutOffTimeFrom) }),
    ...(cutOffTimeTo && { cutOffTimeTo: toDateOnly(cutOffTimeTo) }),
    appraisalCompanyId: appraisalCompanyFilter || undefined,
  };

  const { data, isLoading, isError, error } = usePendingQuotations(filter);

  const rows = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const hasFilters =
    !!search ||
    statusFilter.length > 0 ||
    !!cutOffTimeFrom ||
    !!cutOffTimeTo ||
    !!appraisalCompanyFilter;

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter([]);
    setCutOffTimeFrom(null);
    setCutOffTimeTo(null);
    setAppraisalCompanyFilter('');
    setPage(0);
  };

  const activeChips: ActiveFilterChip[] = [
    ...statusFilter.map(v => ({
      key: `status-${v}`,
      label: `Status: ${QUOTATION_STATUS_OPTIONS.find(o => o.value === v)?.label ?? v.replace(/([a-z])([A-Z])/g, '$1 $2')}`,
      onClear: () => {
        setStatusFilter(prev => prev.filter(x => x !== v));
        setPage(0);
      },
    })),
    ...(cutOffTimeFrom
      ? [
          {
            key: 'cutOffTimeFrom',
            label: `Cut Off From: ${toDateOnly(cutOffTimeFrom) ?? ''}`,
            onClear: () => {
              setCutOffTimeFrom(null);
              setPage(0);
            },
          },
        ]
      : []),
    ...(cutOffTimeTo
      ? [
          {
            key: 'cutOffTimeTo',
            label: `Cut Off To: ${toDateOnly(cutOffTimeTo) ?? ''}`,
            onClear: () => {
              setCutOffTimeTo(null);
              setPage(0);
            },
          },
        ]
      : []),
    ...(appraisalCompanyFilter
      ? [
          {
            key: 'appraisalCompanyId',
            label: `Company: ${companies.find(c => c.id === appraisalCompanyFilter)?.companyName ?? appraisalCompanyFilter}`,
            onClear: () => {
              setAppraisalCompanyFilter('');
              setPage(0);
            },
          },
        ]
      : []),
  ];

  const handleView = (row: PendingQuotation) => {
    navigate(`/quotations/${row.id}`);
  };

  useEffect(() => {
    if (!isLoading && data != null) {
      onCountChange?.(totalCount);
    }
  }, [isLoading, data, totalCount, onCountChange]);

  return (
    <div className="flex flex-col min-w-0">
      <ActiveFilterChips
        chips={activeChips}
        onClearAll={hasFilters ? handleClearFilters : undefined}
      />

      {/* Inline filter bar */}
      <div className="shrink-0 mb-3 flex flex-wrap items-end gap-2">
        {/* Search — one bar: "search by" selector + input */}
        <div className="w-[24rem]">
          <SearchByInput
            options={SEARCH_FIELD_OPTIONS}
            field={searchField}
            onFieldChange={v => {
              setSearchField(v as SearchField);
              setPage(0);
            }}
            value={search}
            onChange={v => {
              setSearch(v);
              setPage(0);
            }}
            placeholder="Search..."
            className="w-full"
          />
        </div>

        {/* Status filter */}
        <div className="shrink-0">
          <MultiSelectDropdown
            options={QUOTATION_STATUS_OPTIONS}
            value={statusFilter}
            onChange={v => {
              setStatusFilter(v);
              setPage(0);
            }}
            placeholder={t('common.status')}
            showValuePrefix={false}
          />
        </div>

        {/* Cut Off From */}
        <div className="w-40">
          <DateInput
            value={cutOffTimeFrom}
            onChange={v => {
              setCutOffTimeFrom(v);
              setPage(0);
            }}
            placeholder="Cut Off From"
          />
        </div>

        {/* Cut Off To */}
        <div className="w-40">
          <DateInput
            value={cutOffTimeTo}
            onChange={v => {
              setCutOffTimeTo(v);
              setPage(0);
            }}
            placeholder="Cut Off To"
          />
        </div>

        {/* Company (invited appraisal company) */}
        <div className="w-56">
          <CompanyAutocomplete
            value={appraisalCompanyFilter}
            onChange={(v: string) => {
              setAppraisalCompanyFilter(v);
              setPage(0);
            }}
            placeholder="All companies"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition-all"
          >
            <Icon style="solid" name="xmark" className="size-3.5" />
            {t('common.clearAll')}
          </button>
        )}
      </div>

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
            <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
          </div>
          <p className="text-sm font-medium text-gray-800">{t('common.loadError')}</p>
          <p className="text-xs text-gray-400">{(error as Error)?.message}</p>
        </div>
      )}

      {/* Table */}
      {!isError && (
        <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <MonitoringDataTable
            columns={COLUMNS}
            rows={rows}
            isLoading={isLoading}
            onView={handleView}
            getRowKey={r => r.id}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(key, dir) => {
              setSortBy(key);
              setSortDir(dir);
              setPage(0);
            }}
            emptyLabel={t('common.noRecords')}
            emptyDescription={t('common.noRecordsDesc')}
          />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={size => {
              setPageSize(size);
              setPage(0);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default PendingQuotationSection;
