import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import CompanyAutocomplete from '@shared/components/inputs/CompanyAutocomplete';
import Dropdown from '@shared/components/inputs/Dropdown';
import { APPRAISAL_STATUS_FILTER_OPTIONS } from '@shared/constants/appraisalStatus';
import Pagination from '@shared/components/Pagination';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Badge from '@shared/components/Badge';
import { formatLocaleDate } from '@shared/utils/dateUtils';
import EvaluationStatusBadge from '../components/EvaluationStatusBadge';
import StarRating from '../components/StarRating';
import { useGetEvaluationList } from '../api';

type EvaluationView = 'active' | 'history';

// Active tab = items still needing attention (no eval yet, or saved as Draft).
// History tab = finalised evaluations.
const VIEW_STATUSES: Record<EvaluationView, string> = {
  active: 'Pending',
  history: 'Completed',
};

function ServiceQualityEvaluationListPage() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('serviceQualityEvaluation');

  // Pagination
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // View tab (Active = Pending + Draft, History = Completed)
  const [view, setView] = useState<EvaluationView>('active');

  // Filters
  const [search, setSearch] = useState('');
  const [appraiserCompanyId, setAppraiserCompanyId] = useState('');
  const [appraisalStatus, setAppraisalStatus] = useState('');

  // Sort
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Debounced text filter for the free-text search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page on filter, view, or sort change
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, appraiserCompanyId, appraisalStatus, view, sortField, sortDirection]);

  const { data, isLoading, isFetching, isError, error } = useGetEvaluationList({
    pageNumber,
    pageSize,
    search: debouncedSearch || undefined,
    appraiserCompanyId: appraiserCompanyId || undefined,
    appraisalStatus: appraisalStatus || undefined,
    evaluationStatus: VIEW_STATUSES[view],
    sortBy: sortField ?? undefined,
    sortDir: sortDirection,
  });

  // Three-state cycle: unsorted -> asc -> desc -> unsorted
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field)
      return <Icon style="solid" name="sort" className="size-2.5 text-gray-300" />;
    return (
      <Icon
        style="solid"
        name={sortDirection === 'asc' ? 'sort-up' : 'sort-down'}
        className="size-2.5 text-primary"
      />
    );
  };

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;

  const hasFilters = search || appraiserCompanyId || appraisalStatus;

  const handleClearFilters = () => {
    setSearch('');
    setAppraiserCompanyId('');
    setAppraisalStatus('');
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">{t('list.error.title')}</p>
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
      </div>

      {/* View tabs */}
      <div className="shrink-0 border-b border-gray-200">
        <div className="flex gap-1">
          {(['active', 'history'] as const).map(v => {
            const isActive = view === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t(`list.tabs.${v}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 flex items-end gap-3 pb-1 flex-wrap">
        <div className="w-72">
          <Input
            label={t('list.filters.search')}
            placeholder={t('list.filters.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-56 flex flex-col gap-1">
          <label className="block text-xs font-medium text-gray-700">
            {t('list.filters.appraiserCompany')}
          </label>
          <CompanyAutocomplete
            value={appraiserCompanyId}
            onChange={setAppraiserCompanyId}
            placeholder={t('list.filters.appraiserCompanyPlaceholder')}
          />
        </div>
        <div className="w-40">
          <Dropdown
            label={t('list.filters.status')}
            placeholder={t('list.filters.statusAll')}
            options={APPRAISAL_STATUS_FILTER_OPTIONS}
            value={appraisalStatus}
            onChange={v => setAppraisalStatus(v ?? '')}
            showValuePrefix={false}
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          >
            <Icon style="solid" name="xmark" className="size-3" />
            {t('list.filters.clearAll')}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                {[
                  { key: 'AppraisalNumber', label: t('list.columns.appraisalNumber'), align: 'left' as const, nowrap: true },
                  { key: 'AppraiserCompanyName', label: t('list.columns.appraiser'), align: 'left' as const, nowrap: false },
                  { key: 'CustomerName', label: t('list.columns.customerName'), align: 'left' as const, nowrap: false },
                  { key: 'ReportReceivedDate', label: t('list.columns.reportReceivedDate'), align: 'left' as const, nowrap: true },
                  { key: 'AppraisalStatus', label: t('list.columns.status'), align: 'left' as const, nowrap: false },
                  { key: 'EvaluationStatus', label: t('list.columns.evaluationStatus'), align: 'left' as const, nowrap: true },
                  { key: 'TotalScore', label: t('list.columns.rating'), align: 'left' as const, nowrap: true },
                  { key: 'AppraisalValue', label: t('list.columns.appraisalValue'), align: 'right' as const, nowrap: true },
                ].map(col => {
                  const isActive = sortField === col.key;
                  const alignClass = col.align === 'right' ? 'text-right' : 'text-left';
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`${alignClass} font-medium px-4 py-2.5 select-none cursor-pointer hover:text-gray-700 transition-colors ${
                        col.nowrap ? 'whitespace-nowrap' : ''
                      } ${isActive ? 'text-primary' : 'text-gray-600'}`}
                    >
                      <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                        {col.label}
                        <SortIcon field={col.key} />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-gray-100 ${isRefetching ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-28' },
                    { width: 'w-32' },
                    { width: 'w-32' },
                    { width: 'w-24' },
                    { width: 'w-20' },
                    { width: 'w-24' },
                    { width: 'w-20' },
                  ]}
                  rows={5}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">{t('list.empty.title')}</p>
                      <p className="text-xs text-gray-400">
                        {hasFilters ? t('list.empty.withFilters') : t('list.empty.noData')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    key={item.appraisalId}
                    onClick={() =>
                      navigate(
                        `/standalone/service-quality-evaluation/${item.appraisalId}`,
                      )
                    }
                    className="hover:bg-gray-50 even:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-primary">{item.appraisalNumber}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{item.appraiserCompanyName || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700">{item.customerName || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {formatLocaleDate(item.reportReceivedDate, i18n.language)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        type="status"
                        value={item.appraisalStatus?.toLowerCase()}
                        badgeStyle="soft"
                      >
                        {item.appraisalStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <EvaluationStatusBadge status={item.evaluationStatus} />
                    </td>
                    <td className="px-4 py-2.5">
                      {item.totalScore != null ? (
                        <span className="inline-flex items-center gap-1">
                          <StarRating score={item.totalScore} />
                          <span className="text-[10px] tabular-nums text-gray-500">({item.totalScore.toFixed(2)})</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
                      {item.appraisalValue != null
                        ? item.appraisalValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
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
    </div>
  );
}

export default ServiceQualityEvaluationListPage;
