import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Pagination from '@shared/components/Pagination';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import { useDebounce } from '@shared/hooks/useDebounce';
import MultiSelectDropdown from '@shared/components/inputs/MultiSelectDropdown';
import CompanyAutocomplete from '@shared/components/inputs/CompanyAutocomplete';
import { useCompanyStore } from '@shared/store';
import { APPRAISAL_STATUS_FILTER_OPTIONS } from '@shared/constants/appraisalStatus';
import EvaluationStatusBadge from '@features/serviceQualityEvaluation/components/EvaluationStatusBadge';
import StarRating from '@features/serviceQualityEvaluation/components/StarRating';

import { usePendingEvaluations } from '../../api/monitoringApi';
import type { PendingEvaluation, PendingEvaluationFilter, SortDir } from '../../api/types';
import MonitoringDataTable, { type ColumnDef } from '../MonitoringDataTable';
import ActiveFilterChips, { type ActiveFilterChip } from '../ActiveFilterChips';
import { DateCell } from '../DateCell';

const APPRAISAL_STATUS_STYLES: Record<string, string> = {
  InProgress: 'bg-blue-50 text-blue-700 border-blue-200',
  PendingApproval: 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

function AppraisalStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>;
  const cls = APPRAISAL_STATUS_STYLES[status] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  const label = status.replace(/([a-z])([A-Z])/g, '$1 $2');
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {label}
    </span>
  );
}

const COLUMNS: ColumnDef<PendingEvaluation>[] = [
  {
    key: 'appraisalNumber',
    label: 'Appraisal Number',
    sortKey: 'AppraisalNumber',
    render: row => (
      <span className="text-sm font-medium text-primary">{row.appraisalNumber ?? '—'}</span>
    ),
  },
  {
    key: 'customerName',
    label: 'Customer Name',
    sortKey: 'CustomerName',
    render: row => <span className="text-xs text-gray-700">{row.customerName ?? '—'}</span>,
    className: 'max-w-[160px] truncate',
  },
  {
    key: 'appraiserCompanyName',
    label: 'Appraisal Company',
    sortKey: 'AppraiserCompanyName',
    render: row => <span className="text-xs text-gray-700">{row.appraiserCompanyName ?? '—'}</span>,
  },
  {
    key: 'appraisalStatus',
    label: 'Appraisal Status',
    render: row => <AppraisalStatusBadge status={row.appraisalStatus} />,
  },
  {
    key: 'evaluationStatus',
    label: 'Evaluation Status',
    render: row =>
      row.evaluationStatus ? (
        <EvaluationStatusBadge status={row.evaluationStatus} />
      ) : (
        <span className="text-gray-400 text-xs">—</span>
      ),
  },
  {
    key: 'reportReceivedDate',
    label: 'Report Received Date',
    sortKey: 'ReportReceivedDate',
    render: row => <DateCell value={row.reportReceivedDate} format="dd MMM yyyy" />,
  },
  {
    key: 'appraisalValue',
    label: 'Appraisal Value',
    sortKey: 'AppraisalValue',
    render: row => (
      <span className="text-xs tabular-nums text-gray-700">
        {row.appraisalValue != null
          ? row.appraisalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })
          : '—'}
      </span>
    ),
  },
  {
    key: 'totalScore',
    label: 'Rating',
    sortKey: 'TotalScore',
    render: row =>
      row.totalScore != null ? (
        <span className="inline-flex items-center gap-1">
          <StarRating score={row.totalScore} />
          <span className="text-[10px] tabular-nums text-gray-500">
            ({row.totalScore.toFixed(2)})
          </span>
        </span>
      ) : (
        <span className="text-xs text-gray-400">—</span>
      ),
  },
];

interface PendingEvaluationSectionProps {
  onCountChange?: (count: number) => void;
}

function PendingEvaluationSection({ onCountChange }: PendingEvaluationSectionProps) {
  const { t } = useTranslation('monitoring');
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<SortDir | undefined>();
  const [appraisalCompanyFilter, setAppraisalCompanyFilter] = useState('');
  const [appraisalStatusFilter, setAppraisalStatusFilter] = useState<string[]>([]);

  const companies = useCompanyStore(s => s.companies);

  const filter: PendingEvaluationFilter = {
    search: debouncedSearch || undefined,
    appraisalCompanyId: appraisalCompanyFilter || undefined,
    appraisalStatus: appraisalStatusFilter.length ? appraisalStatusFilter : undefined,
    page,
    pageSize,
    sortBy,
    sortDir,
  };

  const { data, isLoading, isError, error } = usePendingEvaluations(filter);

  const rows = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const hasFilters = !!search || !!appraisalCompanyFilter || appraisalStatusFilter.length > 0;

  const handleClearFilters = () => {
    setSearch('');
    setAppraisalCompanyFilter('');
    setAppraisalStatusFilter([]);
    setPage(0);
  };

  const appraisalStatusOptions = APPRAISAL_STATUS_FILTER_OPTIONS.map(o => ({
    value: o.value,
    label: o.label,
  }));

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
    ...appraisalStatusFilter.map(v => ({
      key: `appraisalStatus-${v}`,
      label: `Appraisal: ${appraisalStatusOptions.find(o => o.value === v)?.label ?? v}`,
      onClear: () => {
        setAppraisalStatusFilter(prev => prev.filter(x => x !== v));
        setPage(0);
      },
    })),
  ];

  const handleView = (row: PendingEvaluation) => {
    navigate(`/appraisals/${row.appraisalId}`);
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
      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-2">
        <div className="flex-1 max-w-xs">
          <Input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t('pendingEvaluation.search')}
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
          />
        </div>

        {/* Appraisal Status */}
        <div className="shrink-0">
          <MultiSelectDropdown
            options={appraisalStatusOptions}
            value={appraisalStatusFilter}
            onChange={v => {
              setAppraisalStatusFilter(v);
              setPage(0);
            }}
            placeholder={t('common.appraisalStatus')}
            showValuePrefix={false}
          />
        </div>

        {/* Appraisal Company */}
        <div className="w-48">
          <CompanyAutocomplete
            value={appraisalCompanyFilter}
            onChange={(v: string) => {
              setAppraisalCompanyFilter(v);
              setPage(0);
            }}
            placeholder="All companies"
          />
        </div>

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

      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
            <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
          </div>
          <p className="text-sm font-medium text-gray-800">{t('common.loadError')}</p>
          <p className="text-xs text-gray-400">{(error as Error)?.message}</p>
        </div>
      )}

      {!isError && (
        <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <MonitoringDataTable
            columns={COLUMNS}
            rows={rows}
            isLoading={isLoading}
            onView={handleView}
            getRowKey={r => r.appraisalId}
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

export default PendingEvaluationSection;
