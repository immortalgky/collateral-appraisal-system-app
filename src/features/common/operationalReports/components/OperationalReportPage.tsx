import { useState, useCallback } from 'react';
import { format as dateFnsFormat, parseISO } from 'date-fns';
import Icon from '@shared/components/Icon';
import Pagination from '@shared/components/Pagination';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import SectionHeader from '@shared/components/sections/SectionHeader';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useMenuLabel } from '@shared/hooks/useMenuLabel';
import { useOperationalReport, useReportExport } from '../api/operationalReportsApi';
import type { BaseReportFilter, SortDir } from '../api/operationalReportsApi';
import type { ReportConfig, ColumnDef } from '../config/reports';
import ExportMenu from './ExportMenu';
import ReportFilterBar from './ReportFilterBar';

// ─── Default filter state ─────────────────────────────────────────────────────

/**
 * FSD: every report's date range "soft defaults" to the current date. Without it the first load
 * runs unbounded over the full history — worst on the reports that aggregate with STRING_AGG.
 * Seeded from the report's OWN filter list so a report never gets a date it has no input for
 * (RCAS008 uses approvedFrom/approvedTo; the rest use createdFrom/createdTo).
 */
function defaultFilterValues(
  filters: ReportConfig['filters'],
  skipDateDefault?: boolean,
): BaseReportFilter {
  if (skipDateDefault) return {};
  const today = dateFnsFormat(new Date(), 'yyyy-MM-dd'); // wire format, matches toDateOnly()
  const seeded: BaseReportFilter = {};
  if (filters.includes('createdFrom')) seeded.createdFrom = today;
  if (filters.includes('createdTo')) seeded.createdTo = today;
  if (filters.includes('approvedFrom')) seeded.approvedFrom = today;
  if (filters.includes('approvedTo')) seeded.approvedTo = today;
  return seeded;
}

// ─── Value formatter ──────────────────────────────────────────────────────────

function formatCellValue(value: unknown, type: ColumnDef['type']): string {
  if (value == null) return '—';
  switch (type) {
    case 'money':
      return typeof value === 'number'
        ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : String(value);
    case 'number':
      return typeof value === 'number'
        ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
        : String(value);
    case 'int':
      return typeof value === 'number'
        ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : String(value);
    case 'percent':
      return typeof value === 'number'
        ? `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
        : String(value);
    case 'date':
      try {
        return dateFnsFormat(parseISO(String(value)), 'dd/MM/yyyy');
      } catch {
        return String(value);
      }
    case 'datetime':
      try {
        return dateFnsFormat(parseISO(String(value)), 'dd/MM/yyyy HH:mm');
      } catch {
        return String(value);
      }
    default:
      return String(value);
  }
}

// ─── Sortable th ──────────────────────────────────────────────────────────────

interface SortableThProps {
  label: string;
  /** Full wording shown on hover when `label` is an abbreviation. */
  fullLabel?: string;
  sortKey?: string;
  activeSortKey?: string;
  activeSortDir?: SortDir;
  onSortChange?: (k: string | undefined, d: SortDir | undefined) => void;
  className?: string;
}

function SortableTh({
  label,
  fullLabel,
  sortKey,
  activeSortKey,
  activeSortDir,
  onSortChange,
  className,
}: SortableThProps) {
  const isSortable = Boolean(sortKey && onSortChange);
  const isActive = isSortable && sortKey === activeSortKey;

  const handleClick = () => {
    if (!isSortable || !sortKey || !onSortChange) return;
    if (!isActive) { onSortChange(sortKey, 'asc'); return; }
    if (activeSortDir === 'asc') { onSortChange(sortKey, 'desc'); return; }
    onSortChange(undefined, undefined);
  };

  const baseCls = 'px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50';

  if (!isSortable) {
    return <th className={`${baseCls} ${className ?? ''}`.trim()} title={fullLabel}>{label}</th>;
  }

  return (
    <th
      className={`${baseCls} ${className ?? ''}`.trim()}
      title={fullLabel}
      aria-sort={isActive ? (activeSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 hover:text-gray-700 transition-colors group ${isActive ? 'text-primary' : ''}`}
      >
        <span>{label}</span>
        <Icon
          style="solid"
          name={isActive ? (activeSortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}
          className={`size-2.5 ${isActive ? 'text-primary' : 'text-gray-300 group-hover:text-gray-500'}`}
        />
      </button>
    </th>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

interface OperationalReportPageProps {
  config: ReportConfig;
}

function OperationalReportPage({ config }: OperationalReportPageProps) {
  const { slug, title, columns, filters, skipDateDefault, defaultPageSize = 20 } = config;

  // Page title follows the sidebar/breadcrumb menu name (locale-resolved), so all three match and
  // switch together on the language toggle. Falls back to the config title when the report isn't in
  // the user's menu or the menu hasn't loaded.
  const menuLabel = useMenuLabel(`/reports/operational/${slug}`);
  const displayTitle = menuLabel ?? title;

  // ── Filter state ─────────────────────────────────────────────────────────────
  // `filterValues` updates on every keystroke so the inputs stay responsive, but the
  // query/export read the debounced copy — typing no longer fires a request per keystroke.
  const [filterValues, setFilterValues] = useState<BaseReportFilter>(() => defaultFilterValues(filters, skipDateDefault));
  const debouncedFilterValues = useDebounce(filterValues, 400);
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<SortDir | undefined>();

  const activeFilter: BaseReportFilter = {
    ...debouncedFilterValues,
    pageNumber,
    pageSize,
    sortBy,
    sortDir,
  };

  const handleFilterChange = useCallback((patch: Partial<BaseReportFilter>) => {
    setFilterValues(prev => ({ ...prev, ...patch }));
    setPageNumber(0);
  }, []);

  // Reset restores the seeded default (today), not an empty object — clearing to {} would put the
  // unbounded full-history query back. Individual date chips can still be cleared to widen the range.
  const handleReset = useCallback(() => {
    setFilterValues(defaultFilterValues(filters, skipDateDefault));
    setPageNumber(0);
  }, [filters, skipDateDefault]);

  const handleSortChange = useCallback((key: string | undefined, dir: SortDir | undefined) => {
    setSortBy(key);
    setSortDir(dir);
    setPageNumber(0);
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data, isLoading, isError, error } = useOperationalReport(slug, activeFilter);
  const { exportReport, isExporting } = useReportExport(slug, debouncedFilterValues);

  const rows = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-0 gap-4">
      {/* Header — standard SectionHeader with a live record count + Export menu */}
      <SectionHeader
        icon="file-lines"
        iconColor="primary"
        title={displayTitle}
        subtitle={`${totalCount.toLocaleString()} ${totalCount === 1 ? 'record' : 'records'}`}
        rightIcon={<ExportMenu onExport={exportReport} isExporting={isExporting} />}
        className="shrink-0 mb-0"
      />

      {/* Filter bar + active-filter chips */}
      <ReportFilterBar
        filters={filters}
        values={filterValues}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
            <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
          </div>
          <p className="text-sm font-medium text-gray-800">Failed to load report</p>
          <p className="text-xs text-gray-400">{(error as Error)?.message}</p>
        </div>
      )}

      {/* Table */}
      {!isError && (
        <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-50 border-b border-gray-200">
                  {columns.map((col, idx) => (
                    <SortableTh
                      key={col.key}
                      label={col.label}
                      fullLabel={col.fullLabel}
                      sortKey={col.sortKey ?? toPascalCase(col.field)}
                      activeSortKey={sortBy}
                      activeSortDir={sortDir}
                      onSortChange={handleSortChange}
                      className={[
                        col.className ?? '',
                        idx === 0 ? 'sticky left-0 z-30 shadow-[1px_0_0_0_rgb(229,231,235)]' : '',
                      ]
                        .join(' ')
                        .trim()}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <TableRowSkeleton
                    columns={columns.map(() => ({ width: 'w-24' }))}
                    rows={8}
                  />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-16">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="size-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                          <Icon style="regular" name="inbox" className="size-6 text-gray-300" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-700">No records</p>
                          <p className="text-xs text-gray-400 mt-1">
                            No items match the current filters.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                      {columns.map((col, colIdx) => {
                        const raw = (row as Record<string, unknown>)[col.field];
                        const formatted = formatCellValue(raw, col.type);
                        const isRight =
                          col.className?.includes('text-right') ||
                          ['money', 'number', 'int', 'percent'].includes(col.type);

                        return (
                          <td
                            key={col.key}
                            className={[
                              'px-3 py-1.5 text-xs text-gray-700',
                              col.className ?? '',
                              isRight ? 'text-right tabular-nums' : '',
                              colIdx === 0
                                ? 'sticky left-0 bg-white shadow-[1px_0_0_0_rgb(229,231,235)] font-medium text-gray-800'
                                : '',
                            ]
                              .join(' ')
                              .trim()}
                          >
                            {formatted}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={pageNumber}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setPageNumber}
            onPageSizeChange={size => {
              setPageSize(size);
              setPageNumber(0);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default OperationalReportPage;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPascalCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
