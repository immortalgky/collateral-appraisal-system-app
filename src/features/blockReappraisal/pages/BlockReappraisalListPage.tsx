import { useState, type ReactNode } from 'react';
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

// Clickable sort header — same caret style (sort / sort-up / sort-down) as the
// rest of the app's list tables.
const SortableTh = ({
  field,
  sortBy,
  sortDir,
  onSort,
  align = 'left',
  className = '',
  children,
}: {
  field: string;
  sortBy: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (f: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
  children: ReactNode;
}) => {
  const isActive = sortBy === field;
  const alignCls =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const flexAlign = align === 'center' ? 'justify-center' : '';
  const iconName = isActive ? (sortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort';
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap select-none cursor-pointer hover:text-(--palette-ink) ${alignCls} ${className} ${
        isActive ? 'text-(--palette-primary-text)' : 'text-(--palette-gray-500)'
      }`}
    >
      <div className={`inline-flex items-center gap-1 ${flexAlign}`}>
        <span>{children}</span>
        <Icon
          style="solid"
          name={iconName}
          className={`size-2.5 ${isActive ? 'text-(--palette-primary-text)' : 'text-(--palette-gray-300)'}`}
        />
      </div>
    </th>
  );
};

function BlockReappraisalListPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['blockReappraisal', 'common']);

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<BlockReappraisalFilterValues>({});
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // 3-stage sort: asc → desc → unsorted.
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

  // The text input stays instantly responsive (controlled by `filters.search`),
  // but the API call only fires once typing settles.
  const debouncedSearch = useDebounce(filters.search, 400);

  const queryParams: BlockReappraisalListParams = {
    pageNumber,
    pageSize,
    ...filters,
    search: debouncedSearch,
    ...(sortBy && { sortBy, sortDir }),
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
        <div className="size-12 rounded-full bg-(--palette-req-wash) flex items-center justify-center">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-(--palette-ink)">{t('error.loadFailed')}</p>
          <p className="text-xs text-(--palette-gray-400) mt-0.5">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* ── Page header ── */}
      <div className="shrink-0 mb-3">
        <h2 className="text-base font-semibold text-(--palette-ink)">{t('page.list.title')}</h2>
        <p className="text-xs text-(--palette-gray-500) mt-0.5">{t('page.list.description')}</p>
      </div>

      {/* ── Inline filter bar ── */}
      <BlockReappraisalFilterBar values={filters} onChange={handleFilterChange} />

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 min-w-0 bg-(--palette-surface) rounded-lg border border-(--palette-line) shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-table">
            <thead className="sticky top-0 z-10">
              <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
                <SortableTh
                  field="oldAppraisalNumber"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  {t('columns.oldAppraisalNumber')}
                </SortableTh>
                <SortableTh
                  field="projectName"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="w-full"
                >
                  {t('columns.projectName')}
                </SortableTh>
                <SortableTh
                  field="projectSellingPrice"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  align="right"
                >
                  {t('columns.projectSellingPrice')}
                </SortableTh>
                <SortableTh
                  field="remainingUnits"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  align="center"
                >
                  {t('columns.remainingTotalUnit')}
                </SortableTh>
                <SortableTh
                  field="lastAppraisedDate"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  align="center"
                >
                  {t('columns.lastAppraisedDate')}
                </SortableTh>
                <SortableTh
                  field="remainingDay"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  align="center"
                >
                  {t('columns.remainingDay')}
                </SortableTh>
                <th className="text-xs px-4 py-2.5 w-8 bg-(--palette-surface-2) font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-(--palette-line-soft)">
              {isLoading ? (
                <TableRowSkeleton columns={Array(6).fill({ width: 'w-24' })} rows={8} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24">
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-16 rounded-2xl bg-(--palette-surface-2) border border-(--palette-line-soft) flex items-center justify-center">
                        <Icon
                          style="regular"
                          name="inbox"
                          className="size-7 text-(--palette-gray-300)"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-(--palette-ink)">
                          {hasActiveFilter ? t('empty.noMatching') : t('empty.noItems')}
                        </p>
                        <p className="text-xs text-(--palette-gray-400) mt-1">
                          {hasActiveFilter ? t('empty.tryAdjusting') : t('empty.noneAtThisTime')}
                        </p>
                      </div>
                      {hasActiveFilter && (
                        <button
                          onClick={() => {
                            setFilters({});
                            setPageNumber(0);
                          }}
                          className="text-xs text-(--palette-primary-text) hover:underline font-medium"
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
                    className="group cursor-pointer transition-colors hover:bg-(--palette-surface-2)"
                  >
                    <td className="px-3 py-2 text-left text-xs text-(--palette-primary-text) font-medium whitespace-nowrap">
                      {item.oldAppraisalNumber ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-(--palette-gray-600)">
                      {item.projectName ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-(--palette-gray-600) tabular-nums text-right whitespace-nowrap">
                      {formatNumber(item.projectSellingPrice)}
                    </td>
                    <td className="px-3 py-2 text-xs text-(--palette-gray-600) tabular-nums text-center whitespace-nowrap">
                      {item.remainingUnits} / {item.totalUnits}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-(--palette-gray-600) whitespace-nowrap">
                      {formatLocaleDate(item.lastAppraisedDate, i18n.language)}
                    </td>
                    <td className="px-3 py-2 text-center text-xs whitespace-nowrap">
                      {item.remainingDay < 0 ? (
                        <span className="text-(--palette-danger) font-medium">
                          {t('remainingDayBadge.overdue')}{' '}
                          {t('remainingDayBadge.daysLeft', { days: Math.abs(item.remainingDay) })}
                        </span>
                      ) : (
                        <span className="text-(--palette-gray-600)">{item.remainingDay}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 w-8">
                      <Icon
                        style="solid"
                        name="arrow-right"
                        className="size-3 text-gray-200 group-hover:text-(--palette-primary-text)/40 transition-colors"
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
