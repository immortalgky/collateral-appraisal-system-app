import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Pagination from '@shared/components/Pagination';
import Icon from '@shared/components/Icon';
import { useDebounce } from '@shared/hooks/useDebounce';
import QuotationStatusBadge from '@features/quotation/components/QuotationStatusBadge';
import { DateInput, MultiSelectDropdown } from '@shared/components/inputs';
import type { ListBoxItem } from '@shared/components/inputs';
import Input from '@shared/components/Input';

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
    label: 'No of Appraisal',
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
    className: '!text-center',
    render: row => <span className="text-xs text-gray-700">{row.rmUsername ?? '—'}</span>,
  },
  {
    key: 'requestedBy',
    label: 'Created By',
    sortKey: 'RequestedBy',
    className: '!text-center max-w-[180px] truncate',
    render: row => <span className="text-xs text-gray-700">{row.requestedBy ?? '—'}</span>,
  },
  {
    key: 'requestDate',
    label: 'Created At',
    sortKey: 'RequestDate',
    render: row => <DateCell value={row.requestDate} withTime withAgo />,
  },
];

interface PendingQuotationSectionProps {
  onCountChange?: (count: number) => void;
}

function PendingQuotationSection({ onCountChange }: PendingQuotationSectionProps) {
  const { t } = useTranslation('monitoring');
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<SortDir | undefined>();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [cutOffTimeFrom, setCutOffTimeFrom] = useState<string | null>(null);
  const [cutOffTimeTo, setCutOffTimeTo] = useState<string | null>(null);

  const filter: PendingQuotationFilter = {
    search: debouncedSearch || undefined,
    status: statusFilter.length ? statusFilter : undefined,
    page,
    pageSize,
    sortBy,
    sortDir,
    ...(cutOffTimeFrom && { cutOffTimeFrom: toDateOnly(cutOffTimeFrom) }),
    ...(cutOffTimeTo && { cutOffTimeTo: toDateOnly(cutOffTimeTo) }),
  };

  const { data, isLoading, isError, error } = usePendingQuotations(filter);

  const rows = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const hasFilters = !!search || statusFilter.length > 0 || !!cutOffTimeFrom || !!cutOffTimeTo;

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter([]);
    setCutOffTimeFrom(null);
    setCutOffTimeTo(null);
    setPage(0);
  };

  const activeChips: ActiveFilterChip[] = [
    ...(search
      ? [
          {
            key: 'search',
            label: `Search: ${search}`,
            onClear: () => {
              setSearch('');
              setPage(0);
            },
          },
        ]
      : []),
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
        {/* Search */}
        <div className="flex-1 max-w-xs">
          <Input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t('pendingQuotation.search')}
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
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
