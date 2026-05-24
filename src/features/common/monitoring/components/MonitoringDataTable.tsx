import type { ReactNode } from 'react';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Icon from '@shared/components/Icon';
import type { SortDir } from '../api/types';

// ─── SortableTh (local copy matching taskMonitor pattern) ─────────────────────

interface SortableThProps {
  label: string;
  sortKey?: string;
  activeSortKey?: string;
  activeSortDir?: SortDir;
  onSortChange?: (sortKey: string | undefined, sortDir: SortDir | undefined) => void;
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
    if (!isActive) {
      onSortChange(sortKey, 'asc');
      return;
    }
    if (activeSortDir === 'asc') {
      onSortChange(sortKey, 'desc');
      return;
    }
    onSortChange(undefined, undefined);
  };

  const baseCls =
    'px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50';

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
        className={`inline-flex items-center gap-1 hover:text-gray-700 transition-colors group ${
          isActive ? 'text-primary' : ''
        }`}
      >
        <span>{label}</span>
        <Icon
          style="solid"
          name={isActive ? (activeSortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}
          className={`size-2.5 ${
            isActive ? 'text-primary' : 'text-gray-300 group-hover:text-gray-500'
          }`}
        />
      </button>
    </th>
  );
}

// ─── Column definition ────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortKey?: string;
  render: (row: T) => ReactNode;
  className?: string;
}

// ─── MonitoringDataTable ──────────────────────────────────────────────────────

interface MonitoringDataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  isLoading: boolean;
  emptyLabel?: string;
  emptyDescription?: string;
  onView: (row: T) => void;
  getRowKey: (row: T) => string;
  sortBy?: string;
  sortDir?: SortDir;
  onSortChange?: (sortKey: string | undefined, sortDir: SortDir | undefined) => void;
  /** When provided, applies a colored left-border on the first body cell. */
  getRowVariant?: (row: T) => 'breached' | 'atRisk' | 'healthy' | undefined;
}

// Combined left-stripe (variant) + right-divider (sticky column edge) using
// inset box-shadow on the first <td>. Border-l is unreliable on sticky cells
// because the variant stripe gets clipped at the scroll-container edge.
// Class strings are inlined so Tailwind JIT can detect them.
const ROW_VARIANT_SHADOW: Record<string, string> = {
  breached: 'shadow-[inset_4px_0_0_0_rgb(239,68,68),1px_0_0_0_rgb(229,231,235)]',
  atRisk: 'shadow-[inset_4px_0_0_0_rgb(245,158,11),1px_0_0_0_rgb(229,231,235)]',
  healthy: 'shadow-[inset_4px_0_0_0_rgb(16,185,129),1px_0_0_0_rgb(229,231,235)]',
};
const DEFAULT_STICKY_SHADOW = 'shadow-[1px_0_0_0_rgb(229,231,235)]';

// Subtle row tint per variant. Healthy stays untinted to keep the table calm.
// The sticky first cell must match so column 1 doesn't read as a separate stripe.
const ROW_VARIANT_TINT: Record<string, string> = {
  breached: 'bg-red-50/40 group-hover:bg-red-50',
  atRisk: 'bg-amber-50/30 group-hover:bg-amber-50',
  healthy: 'group-hover:bg-gray-50',
};
// Sticky cell tints MUST be fully opaque — translucent backgrounds (the /40,
// /30 used on the row body) would let the scrolling column underneath bleed
// through the sticky column. Match the variant's row tint visually but with
// solid coverage.
const STICKY_VARIANT_TINT: Record<string, string> = {
  breached: 'bg-red-50 group-hover:bg-red-100',
  atRisk: 'bg-amber-50 group-hover:bg-amber-100',
  healthy: 'bg-white group-hover:bg-gray-50',
};
const DEFAULT_STICKY_TINT = 'bg-white group-hover:bg-gray-50';

function MonitoringDataTable<T>({
  columns,
  rows,
  isLoading,
  emptyLabel = 'No records',
  emptyDescription = 'No items match the current filters.',
  onView,
  getRowKey,
  sortBy,
  sortDir,
  onSortChange,
  getRowVariant,
}: MonitoringDataTableProps<T>) {
  const skeletonCols = [...columns.map(() => ({ width: 'w-24' })), { width: 'w-12' }];
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full min-w-max text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col, colIdx) => (
              <SortableTh
                key={col.key}
                label={col.label}
                sortKey={col.sortKey}
                activeSortKey={sortBy}
                activeSortDir={sortDir}
                onSortChange={onSortChange}
                className={[
                  col.className ?? '',
                  colIdx === 0 ? 'sticky left-0 z-30 shadow-[1px_0_0_0_rgb(229,231,235)]' : '',
                ]
                  .join(' ')
                  .trim()}
              />
            ))}
            {/* Actions column */}
            <th className="px-4 py-3 bg-gray-50" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <TableRowSkeleton columns={skeletonCols} rows={8} />
          ) : isEmpty ? (
            <tr>
              <td colSpan={columns.length + 1} className="py-16">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="size-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <Icon style="regular" name="inbox" className="size-6 text-gray-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">{emptyLabel}</p>
                    <p className="text-xs text-gray-400 mt-1">{emptyDescription}</p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            rows.map(row => {
              const variant = getRowVariant?.(row);
              const stickyShadow = variant ? ROW_VARIANT_SHADOW[variant] : DEFAULT_STICKY_SHADOW;
              const rowTint = variant ? ROW_VARIANT_TINT[variant] : 'hover:bg-gray-50';
              const stickyTint = variant ? STICKY_VARIANT_TINT[variant] : DEFAULT_STICKY_TINT;
              return (
                <tr key={getRowKey(row)} className={['group transition-colors', rowTint].join(' ')}>
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={[
                        'px-3 py-1.5',
                        col.className ?? '',
                        colIdx === 0 ? `sticky left-0 z-10 ${stickyTint} ${stickyShadow}` : '',
                      ]
                        .join(' ')
                        .trim()}
                    >
                      {colIdx === 0 ? (
                        <button
                          type="button"
                          onClick={() => onView(row)}
                          className="text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-sm"
                        >
                          {col.render(row)}
                        </button>
                      ) : (
                        col.render(row)
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 w-10">
                    <button
                      type="button"
                      onClick={() => onView(row)}
                      aria-label="View"
                      className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Icon style="solid" name="arrow-up-right-from-square" className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default MonitoringDataTable;
