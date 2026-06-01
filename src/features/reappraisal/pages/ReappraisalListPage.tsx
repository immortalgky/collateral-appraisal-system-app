import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { useReappraisalCandidates } from '../api/reappraisal';
import { ReappraisalFilterDialog } from '../components/ReappraisalFilterDialog';
import type {
  ReappraisalCandidateListParams,
  ReappraisalFilterValues,
  ReviewTypeCode,
} from '../types';

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  hasOpenAppraisal,
  openAppraisalNumber,
  openAppraisalGroupTag,
  openAppraisalId,
}: {
  status: string;
  hasOpenAppraisal: boolean;
  openAppraisalNumber?: string;
  openAppraisalGroupTag?: string;
  openAppraisalId?: string;
}) {
  const { t } = useTranslation('reappraisal');
  let badge: ReactNode;

  if (status === 'Consumed') {
    badge = (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
        {t('badge.used')}
      </span>
    );
  } else if (status === 'Pending' && hasOpenAppraisal) {
    badge = (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        {t('badge.inProgress')}
      </span>
    );
  } else {
    badge = (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
        {t('badge.pending')}
      </span>
    );
  }

  const hasLink = openAppraisalNumber != null;

  return (
    <div className="flex flex-col gap-0.5">
      {badge}
      {hasLink && (
        <span
          className="text-[10px] text-gray-400 whitespace-nowrap"
          data-appraisal-id={openAppraisalId}
          title={openAppraisalGroupTag != null ? `Group ${openAppraisalGroupTag}` : undefined}
        >
          → {openAppraisalNumber}
          {openAppraisalGroupTag != null && (
            <span className="ml-1 text-gray-300">· {openAppraisalGroupTag}</span>
          )}
        </span>
      )}
    </div>
  );
}

function formatNumber(n?: number): string {
  if (n == null) return '-';
  return n.toLocaleString();
}

// ─── Component ────────────────────────────────────────────────────────────────

function ReappraisalListPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['reappraisal', 'common']);

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ReappraisalFilterValues>({});

  const queryParams: ReappraisalCandidateListParams = {
    pageNumber,
    pageSize,
    ...filters,
  };

  const { data, isLoading, isError, error } = useReappraisalCandidates(queryParams);

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const activeFilterChips = Object.entries(filters).filter(([, v]) => v != null && v !== '') as [
    keyof ReappraisalFilterValues,
    string | number,
  ][];

  const removeFilter = (key: keyof ReappraisalFilterValues) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPageNumber(0);
  };

  const handleApplyFilters = (v: ReappraisalFilterValues) => {
    setFilters(v);
    setPageNumber(0);
  };

  const getChipLabel = (key: keyof ReappraisalFilterValues, value: string | number): string => {
    if (key === 'reviewType') {
      return t(`reviewType.${value as ReviewTypeCode}`, { defaultValue: String(value) });
    }
    return String(value);
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">{t('error.loadFailed')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* ── Page header ── */}
      <div className="shrink-0 mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{t('page.list.title')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.list.description')}</p>
        </div>

        {/* Filter button */}
        <button
          onClick={() => setFilterDialogOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-all ${
            activeFilterChips.length > 0
              ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
              : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <Icon style="solid" name="sliders" className="size-3.5" />
          {t('filter.button')}
          {activeFilterChips.length > 0 && (
            <span className="inline-flex items-center justify-center size-4 rounded-full bg-primary text-white text-[10px] font-semibold">
              {activeFilterChips.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Active filter chips ── */}
      {activeFilterChips.length > 0 && (
        <div className="shrink-0 flex items-center gap-1.5 flex-wrap mb-3">
          {activeFilterChips.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 text-xs bg-primary/8 text-primary border border-primary/15 rounded-full font-medium"
            >
              <span className="text-primary/60">{t(`filter.chips.${key}`)}:</span>
              {getChipLabel(key, value)}
              <button onClick={() => removeFilter(key)} className="hover:text-primary/60 ml-0.5">
                <Icon style="solid" name="xmark" className="size-2.5" />
              </button>
            </span>
          ))}
          <button
            onClick={() => {
              setFilters({});
              setPageNumber(0);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline underline-offset-2"
          >
            {t('common:actions.clearAll')}
          </button>
        </div>
      )}

      {/* ── Filter dialog ── */}
      <ReappraisalFilterDialog
        open={filterDialogOpen}
        initialValues={filters}
        onApply={handleApplyFilters}
        onClose={() => setFilterDialogOpen(false)}
      />

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.oldAppraisalReportNumber')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.cifNumber')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.customerName')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.reviewType')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.remainingDay')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.appraisalDate')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.channel')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.status')}
                </th>
                <th className="px-4 py-2.5 w-8 bg-gray-50" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowSkeleton columns={Array(8).fill({ width: 'w-24' })} rows={8} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-24">
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <Icon style="regular" name="inbox" className="size-7 text-gray-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                          {activeFilterChips.length > 0
                            ? t('empty.noMatching')
                            : t('empty.noCandidates')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activeFilterChips.length > 0
                            ? t('empty.tryAdjusting')
                            : t('empty.noneAtThisTime')}
                        </p>
                      </div>
                      {activeFilterChips.length > 0 && (
                        <button
                          onClick={() => {
                            setFilters({});
                            setPageNumber(0);
                          }}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          {t('empty.clearFilters')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/reappraisal/${item.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 text-xs text-gray-900 font-medium whitespace-nowrap">
                      {item.oldAppraisalReportNumber}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {item.cifNumber}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.customerName ?? '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {t(`reviewType.${item.reviewType}`, { defaultValue: item.reviewType })}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                      {formatNumber(item.remainingDay)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {formatLocaleDate(item.appraisalDate, i18n.language)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {item.channel}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        status={item.status}
                        hasOpenAppraisal={item.hasOpenAppraisal}
                        openAppraisalNumber={item.openAppraisalNumber}
                        openAppraisalGroupTag={item.openAppraisalGroupTag}
                        openAppraisalId={item.openAppraisalId}
                      />
                    </td>
                    <td className="px-3 py-2 w-8">
                      <Icon
                        style="solid"
                        name="arrow-right"
                        className="size-3 text-gray-200 group-hover:text-primary/40 transition-colors"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pageNumber}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={p => {
            setPageNumber(p);
          }}
          onPageSizeChange={size => {
            setPageSize(size);
            setPageNumber(0);
          }}
        />
      </div>
    </div>
  );
}

export default ReappraisalListPage;
