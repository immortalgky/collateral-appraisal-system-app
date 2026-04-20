import { useMemo } from 'react';
import type { AppraisalDto } from '../../api/appraisalSearch';
import type { AppraisalColumnDef } from './tabConfigs';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatDate } from '@/shared/utils/dateUtils';
import { useAddressStore } from '@/shared/store';

interface AppraisalResultsTableProps {
  columns: AppraisalColumnDef[];
  items: AppraisalDto[];
  isLoading: boolean;
  sortBy: string;
  sortDir: string;
  onSort: (field: string) => void;
  onRowClick: (item: AppraisalDto) => void;
}

function AppraisalResultsTable({
  columns,
  items,
  isLoading,
  sortBy,
  sortDir,
  onSort,
  onRowClick,
}: AppraisalResultsTableProps) {
  const titleAddresses = useAddressStore(s => s.titleAddresses);
  const dopaAddresses = useAddressStore(s => s.dopaAddresses);

  const provinceCodeToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const addr of [...titleAddresses, ...dopaAddresses]) {
      if (!map.has(addr.provinceCode)) {
        map.set(addr.provinceCode, addr.provinceName);
      }
    }
    return map;
  }, [titleAddresses, dopaAddresses]);

  const getCellValue = (item: AppraisalDto, key: string): string => {
    const val = item[key as keyof AppraisalDto];
    if (val === null || val === undefined || val === '') return '—';
    if (key === 'appointmentDateTime' || key === 'createdAt') {
      const d = new Date(val as string);
      if (isNaN(d.getTime())) return '—';
      return formatDate(d, 'dd/MM/yyyy HH:mm');
    }
    if (key === 'assignedDate') {
      return new Date(val as string).toLocaleDateString();
    }
    if (key === 'province') {
      return provinceCodeToName.get(val as string) ?? String(val);
    }
    return String(val);
  };

  const formatSlaStatus = (item: AppraisalDto): string => {
    if (!item.slaStatus) return '-';
    if (item.remainingHours !== null && item.remainingHours !== undefined) {
      const days = Math.floor(Math.abs(item.remainingHours) / 24);
      const hours = Math.abs(item.remainingHours) % 24;
      const timeStr = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
      return item.remainingHours < 0 ? `Overdue ${timeStr}` : `${timeStr} left`;
    }
    return item.slaStatus;
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="table table-sm min-w-max w-full">
        <thead className="sticky top-0 z-20 bg-gray-50">
          <tr className="border-b border-gray-200">
            <th className="text-left font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap w-12">
              #
            </th>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => col.sortable && onSort(col.key)}
                className={`text-left font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap ${
                  col.sortable ? 'cursor-pointer hover:text-primary select-none' : ''
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortBy === col.key && (
                    <Icon
                      style="solid"
                      name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'}
                      className="size-3 text-primary"
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <TableRowSkeleton
              columns={[{ width: 'w-8' }, ...columns.map(() => ({ width: 'w-32' }))]}
              rows={8}
            />
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="text-center py-16">
                <div className="flex flex-col items-center gap-2">
                  <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                  <p className="text-gray-500 font-medium">No appraisals found</p>
                  <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr
                key={item.id}
                onClick={() => onRowClick(item)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') onRowClick(item);
                }}
                tabIndex={0}
                className="hover:bg-gray-50 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <td className="px-3 py-2.5 text-gray-400 text-sm">{index + 1}</td>
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2.5 text-gray-600 text-sm">
                    {col.key === 'status' ? (
                      <Badge type="status" value={item.status} size="sm" />
                    ) : col.key === 'priority' ? (
                      <Badge type="priority" value={item.priority} size="sm" />
                    ) : col.key === 'slaStatus' ? (
                      <span
                        className={`text-xs font-medium ${
                          item.slaStatus === 'Breached'
                            ? 'text-red-600'
                            : item.slaStatus === 'AtRisk'
                              ? 'text-amber-600'
                              : item.slaStatus === 'OnTrack'
                                ? 'text-green-600'
                                : 'text-gray-400'
                        }`}
                      >
                        {formatSlaStatus(item)}
                      </span>
                    ) : col.key === 'appraisalNumber' ? (
                      <span className="font-medium text-primary">
                        {item.appraisalNumber || '-'}
                      </span>
                    ) : (
                      getCellValue(item, col.key)
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AppraisalResultsTable;
