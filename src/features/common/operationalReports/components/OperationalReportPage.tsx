import { useState, useCallback } from 'react';
import { format as dateFnsFormat, parseISO } from 'date-fns';
import Icon from '@shared/components/Icon';
import Pagination from '@shared/components/Pagination';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Input from '@shared/components/Input';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useOperationalReport, useReportExport } from '../api/operationalReportsApi';
import type { BaseReportFilter, SortDir } from '../api/operationalReportsApi';
import type { ReportConfig, ColumnDef, FilterField } from '../config/reports';

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

// ─── Filter panel ─────────────────────────────────────────────────────────────

interface FilterPanelProps {
  filters: FilterField[];
  values: BaseReportFilter;
  onChange: (patch: Partial<BaseReportFilter>) => void;
  onReset: () => void;
}

const FILTER_LABELS: Record<FilterField, string> = {
  appraisalNumber: 'Appraisal No.',
  createdFrom: 'Create Date From',
  createdTo: 'Create Date To',
  approvedFrom: 'Approved Date From',
  approvedTo: 'Approved Date To',
  status: 'Status',
  bankingSegment: 'Retail/IBG',
  appraisalCompany: 'Company',
  internalStaff: 'Internal Staff',
  channel: 'Channel',
  reviewType: 'Review Type',
  stage: 'Stage',
  customerName: 'Customer',
  evaluationStatus: 'Eval. Status',
  payType: 'Pay Type',
  feeStatus: 'Fee Status',
  assignType: 'Assign Type',
};

/** Fields that are date inputs (render as <input type="date">). */
const DATE_FIELDS = new Set<FilterField>([
  'createdFrom',
  'createdTo',
  'approvedFrom',
  'approvedTo',
]);

function FilterPanel({ filters, values, onChange, onReset }: FilterPanelProps) {
  const hasAny = filters.some(f => Boolean((values as Record<string, unknown>)[f]));

  return (
    <div className="shrink-0 mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        {filters.map(field => {
          const val = ((values as Record<string, unknown>)[field] as string) ?? '';
          const label = FILTER_LABELS[field];
          const isDate = DATE_FIELDS.has(field);

          return (
            <div key={field} className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-600">{label}</label>
              {isDate ? (
                <input
                  type="date"
                  value={val}
                  onChange={e => onChange({ [field]: e.target.value || undefined })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-gray-300 transition-colors"
                />
              ) : (
                <Input
                  value={val}
                  onChange={e => onChange({ [field]: e.target.value || undefined })}
                  placeholder={`All ${label}`}
                  fullWidth={false}
                  className="min-w-[160px]"
                />
              )}
            </div>
          );
        })}

        {hasAny && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition-all self-end"
          >
            <Icon style="solid" name="xmark" className="size-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Export buttons ───────────────────────────────────────────────────────────

interface ExportButtonsProps {
  onExport: (format: 'xlsx' | 'csv' | 'pdf') => void;
  isExporting: boolean;
}

function ExportButtons({ onExport, isExporting }: ExportButtonsProps) {
  const btnClass =
    'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const iconFor = (name: string, color: string) =>
    isExporting ? (
      <Icon style="solid" name="spinner" className="size-3.5 animate-spin text-gray-400" />
    ) : (
      <Icon style="solid" name={name} className={`size-3.5 ${color}`} />
    );
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={isExporting} onClick={() => onExport('xlsx')} className={btnClass} title="Export to Excel">
        {iconFor('file-excel', 'text-green-600')}
        Excel
      </button>
      <button type="button" disabled={isExporting} onClick={() => onExport('csv')} className={btnClass} title="Export to CSV">
        {iconFor('file-csv', 'text-blue-600')}
        CSV
      </button>
      <button type="button" disabled={isExporting} onClick={() => onExport('pdf')} className={btnClass} title="Export to PDF">
        {iconFor('file-pdf', 'text-red-600')}
        PDF
      </button>
    </div>
  );
}

// ─── Sortable th ──────────────────────────────────────────────────────────────

interface SortableThProps {
  label: string;
  sortKey?: string;
  activeSortKey?: string;
  activeSortDir?: SortDir;
  onSortChange?: (k: string | undefined, d: SortDir | undefined) => void;
  className?: string;
}

function SortableTh({
  label,
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
    return <th className={`${baseCls} ${className ?? ''}`.trim()}>{label}</th>;
  }

  return (
    <th
      className={`${baseCls} ${className ?? ''}`.trim()}
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
  const { slug, title, columns, filters, defaultPageSize = 20 } = config;

  // ── Filter state ─────────────────────────────────────────────────────────────
  // `filterValues` updates on every keystroke so the inputs stay responsive, but the
  // query/export read the debounced copy — typing no longer fires a request per keystroke.
  const [filterValues, setFilterValues] = useState<BaseReportFilter>({});
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

  const handleReset = useCallback(() => {
    setFilterValues({});
    setPageNumber(0);
  }, []);

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
      {/* Header row */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        <ExportButtons onExport={exportReport} isExporting={isExporting} />
      </div>

      {/* Filter panel */}
      {filters.length > 0 && (
        <FilterPanel
          filters={filters}
          values={filterValues}
          onChange={handleFilterChange}
          onReset={handleReset}
        />
      )}

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
