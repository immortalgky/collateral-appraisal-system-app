import type { AssetSummaryItem } from '@/features/appraisal/api/assetSummary';
import Icon from '@/shared/components/Icon';
import { getParameterDescription } from '@/shared/utils/parameterUtils';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useMemo, useState } from 'react';

type ColumnDef = {
  key: string;
  label: string;
  sortField?: string;
  tdClassName?: string;
  render: (item: AssetSummaryItem) => React.ReactNode;
};

interface AssetSummaryDetailTableProps {
  items: AssetSummaryItem[];
  filterParams: Set<number> | undefined;
}

export function AssetSummaryDetailTable({ items, filterParams }: AssetSummaryDetailTableProps) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const columns: ColumnDef[] = useMemo(
    () => [
      {
        key: 'groupSet',
        label: 'Group',
        sortField: 'groupSet',
        render: item => <span>{item.groupSet}</span>,
      },
      {
        key: 'propertyType',
        label: 'Property Type',
        sortField: 'propertyType',
        render: item => <span>{getParameterDescription('PropertyType', item.propertyType)}</span>,
      },
      {
        key: 'assetDetail',
        label: 'Detail',
        sortField: 'assetDetail',
        render: item => <span>{item.assetDetail}</span>,
      },
      {
        key: 'area',
        label: 'Area',
        sortField: 'area',
        tdClassName: 'px-4 py-3 text-gray-600 text-sm text-right tabular-nums',
        render: item => <span>{item.area != null ? formatNumber(item.area, 2) : '—'}</span>,
      },
      {
        key: 'estimatedPrice',
        label: 'Estimated Price',
        sortField: 'estimatedPrice',
        tdClassName: 'px-4 py-3 text-gray-600 text-sm text-right tabular-nums',
        render: item => (
          <span>{item.estimatedPrice != null ? formatNumber(item.estimatedPrice) : '—'}</span>
        ),
      },
      {
        key: 'currentPrice',
        label: 'Current Price',
        sortField: 'currentPrice',
        tdClassName: 'px-4 py-3 text-gray-600 text-sm text-right tabular-nums',
        render: item => (
          <span>{item.currentPrice != null ? formatNumber(item.currentPrice) : '—'}</span>
        ),
      },
      {
        key: 'isPricesCurrent',
        label: 'Status',
        sortField: 'isPricesCurrent',
        render: item =>
          item.isPricesCurrent ? (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Current
            </span>
          ) : (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              Not Current
            </span>
          ),
      },
    ],
    [],
  );

  const STICKY_COLUMN_KEY = 'groupSet';

  const sortedItems = useMemo(() => {
    const filtered = items.filter(
      item => !filterParams || filterParams.size === 0 || filterParams.has(item.groupSet ?? -1),
    );
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortField as keyof AssetSummaryItem] ?? '';
      const bv = b[sortField as keyof AssetSummaryItem] ?? '';
      return sortDirection === 'asc'
        ? av > bv
          ? 1
          : av < bv
            ? -1
            : 0
        : av < bv
          ? 1
          : av > bv
            ? -1
            : 0;
    });
  }, [items, filterParams, sortField, sortDirection]);

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

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map(col => {
              const isSticky = col.key === STICKY_COLUMN_KEY;
              const isActive = !!col.sortField && sortField === col.sortField;
              const base =
                'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50';
              const thClass = isSticky
                ? `${base} sticky left-0 z-30 cursor-pointer hover:text-gray-600 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-200`
                : col.sortField
                  ? `${base} cursor-pointer hover:text-gray-600 ${isActive ? 'text-primary' : ''}`
                  : base;
              return (
                <th
                  key={col.key}
                  onClick={col.sortField ? () => handleSort(col.sortField!) : undefined}
                  className={thClass}
                >
                  {col.sortField ? (
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.sortField} />
                    </div>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedItems.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-gray-400">
                No assets match the selected filter.
              </td>
            </tr>
          )}
          {sortedItems.map(item => {
            return (
              <tr
                key={item.id}
                className="group bg-white hover:bg-gray-50 border-b border-gray-200 transition-colors"
              >
                {columns.map(col => {
                  const isSticky = col.key === STICKY_COLUMN_KEY;
                  return (
                    <td
                      key={col.key}
                      className={
                        isSticky
                          ? 'bg-white group-hover:bg-gray-50 transition-colors sticky left-0 z-10 px-4 py-3 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-100'
                          : (col.tdClassName ?? 'px-4 py-3 text-gray-600 text-sm')
                      }
                      onClick={isSticky ? e => e.stopPropagation() : undefined}
                    >
                      {col.render(item)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
