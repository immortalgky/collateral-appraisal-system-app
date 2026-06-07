import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { useBlockReappraisalDueList } from '../api/blockReappraisal';
import { BlockReappraisalFilterDialog } from '../components/BlockReappraisalFilterDialog';
import type { BlockReappraisalFilterValues, BlockReappraisalListParams } from '../types';

function formatNumber(n?: number | null): string {
  if (n == null) return '-';
  return n.toLocaleString();
}

function BlockReappraisalListPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['blockReappraisal', 'common']);

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<BlockReappraisalFilterValues>({});

  const queryParams: BlockReappraisalListParams = {
    pageNumber,
    pageSize,
    ...filters,
  };

  const { data, isLoading, isError, error } = useBlockReappraisalDueList(queryParams);

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const activeFilterChips = Object.entries(filters).filter(
    ([, v]) => v != null && v !== '',
  ) as [keyof BlockReappraisalFilterValues, string][];

  const removeFilter = (key: keyof BlockReappraisalFilterValues) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPageNumber(0);
  };

  const handleApplyFilters = (v: BlockReappraisalFilterValues) => {
    setFilters(v);
    setPageNumber(0);
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
              {value}
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
      <BlockReappraisalFilterDialog
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
                  {t('columns.oldAppraisalNumber')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.projectName')}
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.projectSellingPrice')}
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.remainingTotalUnit')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.lastAppraisedDate')}
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.remainingDay')}
                </th>
                <th className="px-4 py-2.5 w-8 bg-gray-50" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowSkeleton columns={Array(6).fill({ width: 'w-24' })} rows={8} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24">
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <Icon style="regular" name="inbox" className="size-7 text-gray-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                          {activeFilterChips.length > 0
                            ? t('empty.noMatching')
                            : t('empty.noItems')}
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
                    key={item.collateralMasterId}
                    onClick={() =>
                      navigate(`/standalone/block-reappraisal/${item.collateralMasterId}`)
                    }
                    className="group cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 text-xs text-gray-900 font-medium whitespace-nowrap">
                      {item.oldAppraisalNumber ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {item.projectName ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 tabular-nums text-right whitespace-nowrap">
                      {formatNumber(item.projectSellingPrice)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 tabular-nums text-center whitespace-nowrap">
                      {item.remainingUnits} / {item.totalUnits}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {formatLocaleDate(item.lastAppraisedDate, i18n.language)}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-600 whitespace-nowrap">
                      {item.remainingDay}
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
          onPageChange={p => setPageNumber(p)}
          onPageSizeChange={size => {
            setPageSize(size);
            setPageNumber(0);
          }}
        />
      </div>
    </div>
  );
}

export default BlockReappraisalListPage;
