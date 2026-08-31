import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppraisalDto } from '../../api/appraisalSearch';
import type { AppraisalColumnDef } from './tabConfigs';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatDate } from '@/shared/utils/dateUtils';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import { useProvinceName, usePropertyTypeLabels } from '@/shared/hooks/useCodeLabels';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { ColumnResizeHandle } from '@/shared/components/columnLayout';
import type { ColumnTableLayout } from '@/shared/components/columnLayout';

/**
 * Width of the `#` column. One constant feeds the <col>, so the column and its header cannot drift
 * apart and leave the sticky offsets wrong.
 */
const ROW_NUMBER_WIDTH = 48;

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
  /**
   * Opt-in user-managed layout: fixed widths, resize handles and a toggleable row-number column.
   *
   * Omitted, the table renders exactly as it always has — auto-width columns, always-on row
   * numbers, no horizontal scroll of its own. SearchAppraisalModal depends on that: it wraps this
   * table in `max-h-80 overflow-hidden` with no horizontal scroll, so a permanently fixed 13-column
   * layout would spill outside a frame the user cannot scroll.
   */
  layout?: ColumnTableLayout;
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
  layout,
}: AppraisalResultsTableProps) {
  const { t } = useTranslation('appraisal');
  const internalTableRef = useRef<HTMLTableElement>(null);
  const tableRef = layout?.tableRef ?? internalTableRef;
  // Row numbers stay on unless a layout explicitly turns them off, so the no-layout callers are
  // unchanged.
  const showRowNumber = layout?.showRowNumber ?? true;
  const leadingCells = showRowNumber ? 1 : 0;
  const localizeCompanyName = useLocalizedCompanyName();
  const provinceName = useProvinceName();
  const propertyTypeLabels = usePropertyTypeLabels();

  const totalWidth = useMemo(
    () =>
      layout
        ? columns.reduce((sum, c) => sum + (layout.widths[c.key] ?? 0), 0) +
          (showRowNumber ? ROW_NUMBER_WIDTH : 0)
        : undefined,
    [layout, columns, showRowNumber],
  );

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

  const getCellValue = (item: AppraisalDto, key: string): string => {
    const val = item[key as keyof AppraisalDto];
    if (val === null || val === undefined || val === '') return '—';
    if (key === 'appointmentDateTime' || key === 'createdAt' || key === 'submittedAt') {
      const d = new Date(val as string);
      if (isNaN(d.getTime())) return '—';
      return formatDate(d, 'dd/MM/yyyy HH:mm');
    }
    if (key === 'assignedDate') {
      return new Date(val as string).toLocaleDateString();
    }
    if (key === 'province') {
      return provinceName(val as string);
    }
    if (key === 'bankingSegment') {
      return segmentCodeToLabel.get(val as string) ?? String(val);
    }
    if (key === 'purpose') {
      return purposeCodeToLabel.get(val as string) ?? String(val);
    }
    if (key === 'propertyTypes') {
      // Comma-joined codes from the view (e.g. "B, L, LB") — resolve each to its description
      return propertyTypeLabels(val as string);
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
      className={`w-full flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto transition-opacity ${
        isStale ? 'opacity-60 pointer-events-none' : ''
      }`}
      aria-busy={isStale}
    >
      <table
        ref={tableRef}
        className={`table table-sm ${layout ? 'table-fixed' : 'min-w-max w-full'}`}
        style={layout ? { width: totalWidth } : undefined}
      >
        {/* A <colgroup> is what actually pins the widths under table-fixed; setting them on <th>
            alone lets the browser redistribute them. */}
        {layout && (
          <colgroup>
            {showRowNumber && <col style={{ width: ROW_NUMBER_WIDTH }} />}
            {columns.map(col => (
              <col key={col.key} style={{ width: layout.widths[col.key] }} />
            ))}
          </colgroup>
        )}
        <thead className="sticky top-0 z-20 bg-gray-50">
          <tr className="border-b border-gray-200">
            {showRowNumber && (
              <th className="text-left font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap w-12">
                #
              </th>
            )}
            {columns.map((col, colIndex) => (
              <th
                key={col.key}
                onClick={() => col.sortable && onSort(col.key)}
                className={`text-left font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap ${
                  layout ? 'relative overflow-hidden text-ellipsis' : ''
                } ${col.sortable ? 'cursor-pointer hover:text-primary select-none' : ''}`}
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
                {layout && (
                  <ColumnResizeHandle
                    width={layout.widths[col.key]}
                    onResize={px => layout.setWidth(col.key, px)}
                    getAutoFitWidth={layout.getAutoFitWidth(col.key, colIndex)}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <TableRowSkeleton
              columns={[
                ...(showRowNumber ? [{ width: 'w-8' }] : []),
                ...columns.map(() => ({ width: 'w-32' })),
              ]}
              // Match the rows being replaced so the table keeps its height — a fixed 8 made the
              // body collapse from a full page down to 8 rows and back on every load. Clamped at
              // both ends: never fewer than 8 (a short last page would collapse the same way) and
              // never more than a page (a bookmarked pageSize=100 would paint 1,400 pulsing cells
              // on a cold load, where there is no height to preserve in the first place).
              rows={Math.min(Math.max(items.length, 8), pageSize || 8)}
            />
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={columns.length + leadingCells} className="text-center py-16">
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
                  {showRowNumber && (
                    <td className="px-3 py-2.5 text-gray-400 text-sm">
                      {pageNumber * pageSize + index + 1}
                    </td>
                  )}
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 text-gray-600 text-sm ${
                        layout ? 'overflow-hidden text-ellipsis whitespace-nowrap' : ''
                      }`}
                    >
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
                        // Badge keeps its own English statusLabelMap and does not go through i18n.
                        // `children` wins over that map, so the translated text is passed in here
                        // rather than by changing Badge — which 31 other files render.
                        // The colour still keys off the raw `value`.
                        <Badge type="status" value={item.status} size="sm">
                          {t(`list.status.${item.status}`, { defaultValue: item.status })}
                        </Badge>
                      ) : col.key === 'priority' ? (
                        <Badge type="priority" value={item.priority} size="sm">
                          {t(`list.priority.${item.priority}`, { defaultValue: item.priority })}
                        </Badge>
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
