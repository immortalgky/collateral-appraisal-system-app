import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppraisalDto } from '../../api/appraisalSearch';
import type { AppraisalColumnDef } from './tabConfigs';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatDate } from '@/shared/utils/dateUtils';
import { useAddressStore } from '@/shared/store';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';

interface AppraisalResultsTableProps {
  columns: AppraisalColumnDef[];
  items: AppraisalDto[];
  isLoading: boolean;
  sortBy: string;
  sortDir: string;
  onSort: (field: string) => void;
  onRowClick: (item: AppraisalDto) => void;
  loadingRowId?: string;
  /** 0-based current page index, used to compute a continuous running row number */
  pageNumber?: number;
  /** Number of rows per page, used to compute a continuous running row number */
  pageSize?: number;
  /**
   * True while a refetch is in flight and the rows on screen are the previous result set.
   * They are shown for continuity, so they are dimmed and made inert — clicking one would open
   * an appraisal from a result set that is about to be replaced.
   */
  isStale?: boolean;
}

function AppraisalResultsTable({
  columns,
  items,
  isLoading,
  sortBy,
  sortDir,
  onSort,
  onRowClick,
  loadingRowId,
  pageNumber = 0,
  pageSize = 0,
  isStale = false,
}: AppraisalResultsTableProps) {
  const { t } = useTranslation('appraisal');
  const localizeCompanyName = useLocalizedCompanyName();
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

  const bankingSegments = useParametersByGroup('BankingSegment');
  const segmentCodeToLabel = useMemo(
    () => new Map(bankingSegments.map(p => [p.code, p.description])),
    [bankingSegments],
  );

  const purposes = useParametersByGroup('AppraisalPurpose');
  const purposeCodeToLabel = useMemo(
    () => new Map(purposes.map(p => [p.code, p.description])),
    [purposes],
  );

  const propertyTypes = useParametersByGroup('PropertyType');
  const propertyTypeCodeToLabel = useMemo(
    () => new Map(propertyTypes.map(p => [p.code, p.description])),
    [propertyTypes],
  );

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
    if (key === 'bankingSegment') {
      return segmentCodeToLabel.get(val as string) ?? String(val);
    }
    if (key === 'purpose') {
      return purposeCodeToLabel.get(val as string) ?? String(val);
    }
    if (key === 'propertyTypes') {
      // Comma-joined codes from the view (e.g. "B, L, LB") — resolve each to its description
      return String(val)
        .split(',')
        .map(code => code.trim())
        .filter(Boolean)
        .map(code => propertyTypeCodeToLabel.get(code) ?? code)
        .join(', ');
    }
    if (key === 'companyName') {
      return localizeCompanyName(val as string, item.companyNameLocal);
    }
    return String(val);
  };

  const formatSlaStatus = (item: AppraisalDto): string => {
    if (!item.slaStatus) return '-';
    // Actual CALENDAR time from now until the SLA due date (how much real time is left), rather than
    // the business-hours figure — calendar is what the bank reads off the deadline date.
    if (item.slaDueDate) {
      const diffMs = new Date(item.slaDueDate).getTime() - Date.now();
      const totalHours = Math.floor(Math.abs(diffMs) / 3_600_000);
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      const timeStr = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
      return diffMs < 0
        ? t('list.sla.overdue', { time: timeStr })
        : t('list.sla.left', { time: timeStr });
    }
    return item.slaStatus;
  };

  return (
    <div
      className={`flex-1 min-h-0 overflow-auto transition-opacity ${
        isStale ? 'opacity-60 pointer-events-none' : ''
      }`}
      aria-busy={isStale}
    >
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
              // Match the rows being replaced so the table keeps its height — a fixed 8 made the
              // body collapse from a full page down to 8 rows and back on every load. Clamped at
              // both ends: never fewer than 8 (a short last page would collapse the same way) and
              // never more than a page (a bookmarked pageSize=100 would paint 1,400 pulsing cells
              // on a cold load, where there is no height to preserve in the first place).
              rows={Math.min(Math.max(items.length, 8), pageSize || 8)}
            />
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="text-center py-16">
                <div className="flex flex-col items-center gap-2">
                  <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                  <p className="text-gray-500 font-medium">{t('list.empty')}</p>
                  <p className="text-xs text-gray-400">{t('list.emptyHint')}</p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const isLoadingRow = loadingRowId === item.id;
              const isAnyLoading = loadingRowId !== undefined;
              return (
                <tr
                  key={item.id}
                  onClick={() => !isAnyLoading && onRowClick(item)}
                  onKeyDown={e => {
                    if (!isAnyLoading && (e.key === 'Enter' || e.key === ' ')) onRowClick(item);
                  }}
                  tabIndex={0}
                  className={`transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                    isLoadingRow
                      ? 'bg-primary-50 cursor-wait'
                      : isAnyLoading
                        ? 'cursor-wait opacity-60'
                        : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <td className="px-3 py-2.5 text-gray-400 text-sm">
                    {pageNumber * pageSize + index + 1}
                  </td>
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2.5 text-gray-600 text-sm">
                      {col.render ? (
                        col.key === 'appraisalNumber' ? (
                          <span className="font-medium text-primary inline-flex items-center gap-1.5">
                            {isLoadingRow && (
                              <Icon
                                name="spinner"
                                style="solid"
                                className="size-3 animate-spin text-primary shrink-0"
                              />
                            )}
                            {col.render(item)}
                          </span>
                        ) : (
                          col.render(item)
                        )
                      ) : col.key === 'status' ? (
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
                        <span className="font-medium text-primary inline-flex items-center gap-1.5">
                          {isLoadingRow && (
                            <Icon
                              name="spinner"
                              style="solid"
                              className="size-3 animate-spin text-primary shrink-0"
                            />
                          )}
                          {item.appraisalNumber || '-'}
                        </span>
                      ) : (
                        getCellValue(item, col.key)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AppraisalResultsTable;
