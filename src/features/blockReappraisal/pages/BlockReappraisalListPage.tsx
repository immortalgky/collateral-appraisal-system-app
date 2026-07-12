import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useBlockReappraisalDueList } from '../api/blockReappraisal';
import { BlockReappraisalFilterBar } from '../components/BlockReappraisalFilterBar';
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
  const [filters, setFilters] = useState<BlockReappraisalFilterValues>({});

  // The text input stays instantly responsive (controlled by `filters.search`),
  // but the API call only fires once typing settles.
  const debouncedSearch = useDebounce(filters.search, 400);

  const queryParams: BlockReappraisalListParams = {
    pageNumber,
    pageSize,
    ...filters,
    search: debouncedSearch,
  };

  const { data, isLoading, isError, error } = useBlockReappraisalDueList(queryParams);

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const hasActiveFilter = Object.values(filters).some(v => v != null && v !== '');

  const handleFilterChange = (v: BlockReappraisalFilterValues) => {
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
      <div className="shrink-0 mb-3">
        <h2 className="text-sm font-semibold text-gray-900">{t('page.list.title')}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{t('page.list.description')}</p>
      </div>

      {/* ── Inline filter bar ── */}
      <BlockReappraisalFilterBar values={filters} onChange={handleFilterChange} />

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
                          {hasActiveFilter ? t('empty.noMatching') : t('empty.noItems')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {hasActiveFilter
                            ? t('empty.tryAdjusting')
                            : t('empty.noneAtThisTime')}
                        </p>
                      </div>
                      {hasActiveFilter && (
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
