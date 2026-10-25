import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppraisalDto } from '../../api/appraisalSearch';
import type { SearchMatch } from '@/shared/types/search';
import type { AppraisalColumnDef } from './tabConfigs';
import Avatar from '@/shared/components/Avatar';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import Highlight from '@/shared/components/search/Highlight';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatDate, isToday } from '@/shared/utils/dateUtils';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import {
  useAppraisalTypeLabel,
  useProvinceName,
  usePropertyTypeLabels,
  useSearchFieldLabel,
} from '@/shared/hooks/useCodeLabels';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { ColumnResizeHandle, useFilledColumns } from '@/shared/components/columnLayout';
import { usePointerMode } from '@/shared/hooks/usePointerMode';
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
  /** The sort the header shows as active — the API default when the user has not chosen one. */
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
  /**
   * Replaces the plain "nothing found" block. The list page passes an illustrated one carrying the
   * search rules; SearchAppraisalModal keeps the default, because it wraps this table in a
   * fixed-height `overflow-hidden` frame that a taller empty state would spill out of.
   */
  emptyState?: ReactNode;
  /** 'compact' trims row padding and drops each cell's second line. List page only. */
  density?: 'comfortable' | 'compact';
  /**
   * Column held in place (with the row number before it) while the table scrolls sideways. The
   * layout forces it to index 0, so it is always the first data column when shown.
   */
  pinnedColumn?: string;
  /**
   * The term the rows were searched by, marked in the number, customer, province and requestor
   * cells the search matched on. Rows that carry `matchedOn` (the all-fields search) also say
   * which field matched when no cell shows it.
   */
  searchTerm?: string;
  /** The field a single-field search looked at; 'all' (the default) reads `matchedOn` instead. */
  searchField?: string;
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
  emptyState,
  density = 'comfortable',
  pinnedColumn,
  searchTerm,
  searchField = 'all',
}: AppraisalResultsTableProps) {
  const compact = density === 'compact';
  // A row gets the focus back when its drawer closes; that is a keyboard ring only after the
  // keyboard (Tab, or j/k and Enter on the rows), never after the mouse that opened it.
  const { pointerMode, onPointerDownCapture } = usePointerMode(['Tab', 'j', 'k', 'Enter', ' ']);
  // Comfortable rows have a second line, so they are kept to about 50px by the padding alone: the
  // line height cannot come down, Thai tone marks need the full 1.5 (see DESIGN.md section 4).
  const cellPad = 'px-3 py-1.5';
  const { t } = useTranslation('appraisal');
  const fieldLabel = useSearchFieldLabel();
  const internalTableRef = useRef<HTMLTableElement>(null);
  const tableRef = layout?.tableRef ?? internalTableRef;
  // Row numbers stay on unless a layout explicitly turns them off, so the no-layout callers are
  // unchanged.
  const showRowNumber = layout?.showRowNumber ?? true;

  // Sticky needs an opaque background of its own — the row's hover colour is repeated through
  // `group-hover` so a pinned cell does not flash white under the pointer. The edge is a shadow,
  // not a border: a border would stay behind with the table grid instead of travelling with it.
  const pinned = Boolean(pinnedColumn && columns[0]?.key === pinnedColumn);
  const pinnedLeft = showRowNumber ? ROW_NUMBER_WIDTH : 0;
  // Per row: a pinned cell paints over the row's own background, so it repeats the loading
  // highlight too, and stays put under the pointer while another row is loading (no row hover then).
  const pinBody = (isLoadingRow: boolean, isAnyLoading: boolean) =>
    `sticky z-10 ${
      isLoadingRow ? 'bg-primary-50' : isAnyLoading ? 'bg-white' : 'bg-white group-hover:bg-gray-50'
    }`;
  const pinHead = 'sticky z-30 bg-gray-50';
  // No edge at rest: the pinned column sits flush against its neighbour like any other column.
  // The drop shadow appears only once columns are actually sliding under the pinned ones — at rest
  // nothing is underneath, and a shadow there would suggest otherwise. A shadow, not a border: a
  // border would stay behind with the table grid instead of travelling with the pinned column.
  const [scrolledX, setScrolledX] = useState(false);
  const pinEdge = scrolledX ? 'shadow-[6px_0_8px_-4px_rgb(0_0_0/0.12)]' : '';
  const localizeCompanyName = useLocalizedCompanyName();
  const provinceName = useProvinceName();
  const propertyTypeLabels = usePropertyTypeLabels();
  const appraisalTypeLabel = useAppraisalTypeLabel();

  // Widths: the scroll box's width, columns grown to its edge, and the drag / auto-fit conversions
  const columnKeys = useMemo(() => columns.map(c => c.key), [columns]);
  const { setContainer, widthOf, tableWidth, storedFor, measureAtStoredWidths } = useFilledColumns({
    keys: columnKeys,
    widths: layout?.widths,
    leading: showRowNumber ? [ROW_NUMBER_WIDTH] : [],
    tableRef,
  });

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

  const visibleColumns = new Set(columns.map(c => c.key));

  /**
   * Whether a cell on screen already shows this match, marked: the number and customer always do,
   * the province and requestor only when their column is on.
   */
  const shownInCell = (item: AppraisalDto, m: SearchMatch) => {
    switch (m.field) {
      case 'appraisalNumber':
        return true;
      case 'customerName':
        return m.value === item.customerName;
      case 'province':
      case 'dopaProvince':
        return visibleColumns.has('province') && m.value === getCellValue(item, 'province');
      case 'requestorName':
        return visibleColumns.has('requestor') && m.value.trim() === item.requestorName?.trim();
      default:
        return false;
    }
  };

  /**
   * The term to mark in a cell showing `fields`, or nothing when the search did not look there:
   * the all-fields search says what matched (and only a match the cell shows counts, not another
   * customer's), a single-field search looked at that field only.
   */
  const termFor = (item: AppraisalDto, ...fields: string[]) =>
    (
      item.matchedOn
        ? item.matchedOn.some(m => fields.includes(m.field) && shownInCell(item, m))
        : fields.includes(searchField)
    )
      ? searchTerm
      : undefined;

  /**
   * Under the number and customer: which field the search matched when no cell shows it — a
   * previous appraisal number, a title deed, a customer other than the one displayed. The best
   * match is named, the rest are counted and listed in the tooltip. Compact density drops it, as
   * it drops every second line.
   */
  const matchedOnLine = (item: AppraisalDto) => {
    if (compact) return null;
    // The deed and DOPA address arms usually agree, and both read "Province".
    const seen = new Set<string>();
    const hidden = (item.matchedOn ?? []).filter(m => {
      const key = `${fieldLabel(m.field)}: ${m.value}`;
      if (shownInCell(item, m) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (hidden.length === 0) return null;
    return (
      <span
        className="block max-w-full truncate text-xs font-normal text-gray-500"
        title={hidden.map(m => `${fieldLabel(m.field)}: ${m.value}`).join('\n')}
      >
        {t('list.matchedOn')} {fieldLabel(hidden[0].field)}:{' '}
        <Highlight text={hidden[0].value} term={searchTerm} />
        {hidden.length > 1 && (
          <span className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-xs font-medium">
            +{hidden.length - 1}
          </span>
        )}
      </span>
    );
  };

  /** Statuses where the clock has stopped, so a countdown would be fiction. */
  const isClosed = (item: AppraisalDto) =>
    item.status === 'Completed' || item.status === 'Cancelled';

  const formatSlaStatus = (item: AppraisalDto): string => {
    // A finished appraisal has no time left or overdue — the due date is in the past and the
    // countdown would keep growing forever, reading "overdue 240d" on a job delivered on time.
    if (isClosed(item)) {
      return item.status === 'Completed' ? t('list.sla.closed') : t('list.sla.cancelled');
    }
    if (!item.slaStatus) return '-';
    // Actual CALENDAR time from now until the SLA due date (how much real time is left), rather than
    // the business-hours figure — calendar is what the bank reads off the deadline date.
    if (item.slaDueDate) {
      const diffMs = new Date(item.slaDueDate).getTime() - Date.now();
      const totalHours = Math.floor(Math.abs(diffMs) / 3_600_000);
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      const timeStr =
        days > 0
          ? t('list.sla.durationDays', { days, hours })
          : t('list.sla.durationHours', { hours });
      return diffMs < 0
        ? t('list.sla.overdue', { time: timeStr })
        : t('list.sla.left', { time: timeStr });
    }
    return item.slaStatus;
  };

  const subLine = (text: string | null | undefined) =>
    !compact && text ? <div className="truncate text-xs text-gray-400">{text}</div> : null;

  const slaCell = (item: AppraisalDto) => {
    const closed = isClosed(item);
    // The text counts calendar time to slaDueDate, while slaStatus is the server's business-hours
    // verdict — the two disagree on long-overdue work the server still calls OnTrack. The colour
    // follows the text, so a row that SAYS "overdue" never shows green.
    const overdue =
      !closed &&
      !!item.slaStatus &&
      item.slaDueDate !== null &&
      new Date(item.slaDueDate).getTime() < Date.now();
    const level = overdue ? 'Breached' : item.slaStatus;
    const tone = closed
      ? 'text-gray-400'
      : level === 'Breached'
        ? 'text-red-600'
        : level === 'AtRisk'
          ? 'text-amber-600'
          : level === 'OnTrack'
            ? 'text-green-600'
            : 'text-gray-400';
    const icon = closed
      ? item.status === 'Completed'
        ? 'circle-check'
        : 'ban'
      : level === 'OnTrack'
        ? 'clock'
        : 'triangle-exclamation';
    return (
      <>
        {/* Closed work is grey whatever the SLA said: red on a delivered job reads as "needs
            attention" when there is nothing left to do. */}
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone}`}>
          {item.slaStatus || closed ? (
            <Icon style="solid" name={icon} className="size-3 shrink-0" />
          ) : null}
          {formatSlaStatus(item)}
        </span>
        {!closed &&
          item.slaDueDate &&
          subLine(
            t('list.sla.dueOn', { date: formatDate(new Date(item.slaDueDate), 'dd/MM/yyyy') }),
          )}
      </>
    );
  };

  /**
   * External work names the company — the person there is never recorded (see
   * APPRAISAL_DEFAULT_HIDDEN_COLUMNS). Internal work has only the user code.
   */
  const assigneeCell = (item: AppraisalDto) => {
    const company = item.companyName
      ? localizeCompanyName(item.companyName, item.companyNameLocal)
      : null;
    const who = company ?? item.assigneeUserId;
    if (!who) {
      return (
        // A dash, not a word and an icon: most rows of a new list have nobody yet, and "not
        // assigned" repeated down the column was noise. The words stay for screen readers.
        <span
          role="img"
          aria-label={t('list.unassigned')}
          title={t('list.unassigned')}
          className="text-gray-400"
        >
          —
        </span>
      );
    }
    if (company) {
      return (
        <span className="inline-flex max-w-full items-center gap-1.5">
          <Icon style="solid" name="building" className="size-3 shrink-0 text-gray-400" />
          <span className="truncate">{company}</span>
        </span>
      );
    }
    // Internal work names a person — initials (the DTO carries no photo), name, user code.
    return personCell(item.assigneeName, who);
  };

  /** A person cell: initials, the name, and the user code under it — or the code alone. */
  const personCell = (
    name: string | null | undefined,
    code: string | null | undefined,
    term?: string,
  ) => {
    const n = name?.trim() || null;
    const shown = n ?? code;
    if (!shown) return '—';
    return (
      <span className="flex max-w-full items-center gap-2">
        <Avatar name={shown} size="xs" className="size-6!" />
        <span className="min-w-0">
          <span className="block truncate">
            <Highlight text={shown} term={term} />
          </span>
          {n && code && subLine(code)}
        </span>
      </span>
    );
  };

  /**
   * The column sizing and the header row, written once for both renders.
   *
   * Both renders use it as-is: the header keeps the widths the user set either way, because a
   * header squeezed to fit the screen turns every label into an ellipsis, which is worse than a
   * header you can scroll. What the empty state leaves out is the tbody — see below.
   */
  const tableHead = (
    <>
      {/* A <colgroup> is what actually pins the widths under table-fixed; setting them on <th>
            alone lets the browser redistribute them. */}
      {layout && (
        <colgroup>
          {showRowNumber && <col style={{ width: ROW_NUMBER_WIDTH }} />}
          {columns.map(col => (
            <col key={col.key} style={{ width: widthOf(col.key) }} />
          ))}
        </colgroup>
      )}
      <thead className="sticky top-0 z-20 bg-gray-50">
        <tr className="border-b border-gray-200">
          {showRowNumber && (
            <th
              className={`text-xs text-center font-semibold text-gray-600 px-3 py-2.5 whitespace-nowrap w-12 ${pinned ? pinHead : ''}`}
              style={pinned ? { left: 0 } : undefined}
            >
              #
            </th>
          )}
          {columns.map((col, colIndex) => {
            // Case-insensitive: a saved search or old link can carry `CreatedAt`, the API's own spelling.
            const isOn = (key: string) => sortBy.toLowerCase() === key.toLowerCase();
            const sortField = col.sortKey ?? col.key;
            const sortIcon = (key: string) =>
              isOn(key) ? (
                <Icon
                  style="solid"
                  name={sortDir === 'asc' ? 'sort-up' : 'sort-down'}
                  className="size-2.5 text-primary"
                />
              ) : (
                <Icon style="solid" name="sort" className="size-2.5 text-gray-300" />
              );
            const single = col.sortable && !col.headSorts;
            return (
              <th
                key={col.key}
                onClick={() => single && onSort(sortField)}
                aria-sort={
                  (single ? isOn(sortField) : col.headSorts?.some(h => isOn(h.key)))
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
                className={`text-xs text-left font-semibold px-3 py-2.5 whitespace-nowrap ${
                  layout ? 'relative overflow-hidden text-ellipsis' : ''
                } ${
                  single
                    ? `cursor-pointer select-none ${isOn(sortField) ? 'text-primary' : 'text-gray-600 hover:text-primary'}`
                    : 'text-gray-600'
                } ${pinned && colIndex === 0 ? `${pinHead} ${pinEdge}` : ''}`}
                style={pinned && colIndex === 0 ? { left: pinnedLeft } : undefined}
              >
                {col.headSorts ? (
                  // Two sortable things under one header: a button each, so either can lead the sort.
                  <span className="inline-flex items-center gap-1">
                    {col.headSorts.map((h, i) => (
                      <Fragment key={h.key}>
                        {i > 0 && <span className="text-gray-300">/</span>}
                        <button
                          type="button"
                          onClick={() => onSort(h.key)}
                          className={`inline-flex cursor-pointer select-none items-center gap-1 font-semibold ${
                            isOn(h.key) ? 'text-primary' : 'hover:text-primary'
                          }`}
                        >
                          {h.label}
                          {sortIcon(h.key)}
                        </button>
                      </Fragment>
                    ))}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {/* Same indicator as the task tables: a faint double arrow marks a column as
                        sortable at all, and only the one in use turns solid. */}
                    {col.sortable && sortIcon(sortField)}
                  </span>
                )}
                {layout && (
                  <ColumnResizeHandle
                    width={widthOf(col.key) ?? layout.widths[col.key]}
                    onResize={px => layout.setWidth(col.key, storedFor(col.key, px))}
                    // What auto-fit measures is content, so it is stored as it is.
                    onAutoFit={px => layout.setWidth(col.key, px)}
                    getAutoFitWidth={measureAtStoredWidths(
                      layout.getAutoFitWidth(col.key, colIndex),
                    )}
                  />
                )}
              </th>
            );
          })}
        </tr>
      </thead>
    </>
  );

  // Nothing found: leave the table out entirely rather than putting the message in a cell.
  // With user-set widths this table is ~2,200px wide, so a `colSpan` cell centres the message on
  // the TABLE, not on the screen — the user had to scroll sideways to read why their search
  // returned nothing, past a horizontal scrollbar for columns holding no data. Dropping the table
  // also drops the scrollbar, and the message lands in the middle of what is actually visible.
  if (!isLoading && items.length === 0) {
    // The scroll container unmounts here and comes back at scrollLeft 0 — drop the shadow with it.
    if (scrolledX) setScrolledX(false);
    return (
      <div className="flex flex-1 min-h-0 w-full flex-col">
        {/* Header only, at the widths the user set: squeezing the columns to fit turned every
            label into an ellipsis. Overflow is CLIPPED rather than scrollable — with no rows under
            it there is nothing to scroll to, and a scrollbar under an empty table is just noise. */}
        <div ref={setContainer} className="w-full shrink-0 overflow-hidden">
          <table
            ref={tableRef}
            className={`table table-sm text-table ${layout ? 'table-fixed' : 'min-w-max w-full'}`}
            style={layout ? { width: tableWidth } : undefined}
          >
            {tableHead}
          </table>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
          {emptyState ?? (
            <div className="flex flex-col items-center gap-2">
              <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
              <p className="text-gray-500 font-medium">{t('list.empty')}</p>
              <p className="text-xs text-gray-400">{t('list.emptyHint')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setContainer}
      onPointerDownCapture={onPointerDownCapture}
      className={`w-full flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto transition-opacity ${
        isStale ? 'opacity-60 pointer-events-none' : ''
      }`}
      aria-busy={isStale}
      onScroll={
        pinned
          ? e => {
              const moved = e.currentTarget.scrollLeft > 0;
              // Only on the change, so vertical scrolling does not re-render the table.
              if (moved !== scrolledX) setScrolledX(moved);
            }
          : undefined
      }
    >
      <table
        ref={tableRef}
        className={`table table-sm text-table ${layout ? 'table-fixed' : 'min-w-max w-full'}`}
        style={layout ? { width: tableWidth } : undefined}
      >
        {tableHead}
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
                  // The global :focus-visible outline can only be switched off inline; the ring is inset
                  // so it stays inside the row, clear of the pinned column's shadow.
                  style={{ outline: 'none' }}
                  className={`group transition-colors ${
                    pointerMode
                      ? ''
                      : 'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
                  } ${
                    isLoadingRow
                      ? 'bg-primary-50 cursor-wait'
                      : isAnyLoading
                        ? 'cursor-wait opacity-60'
                        : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  {showRowNumber && (
                    <td
                      className={`${cellPad} text-center text-gray-400 text-table ${pinned ? pinBody(isLoadingRow, isAnyLoading) : ''}`}
                      style={pinned ? { left: 0 } : undefined}
                    >
                      {pageNumber * pageSize + index + 1}
                    </td>
                  )}
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      className={`${cellPad} text-gray-600 text-table ${
                        layout ? 'overflow-hidden text-ellipsis whitespace-nowrap' : ''
                      } ${pinned && colIndex === 0 ? `${pinBody(isLoadingRow, isAnyLoading)} ${pinEdge}` : ''}`}
                      style={pinned && colIndex === 0 ? { left: pinnedLeft } : undefined}
                    >
                      {col.render ? (
                        col.key === 'appraisalCustomer' ? (
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
                        // Cancelled is red here (Badge's own status map has it grey, for every other
                        // screen), so a dead job stands out from the live ones.
                        <Badge
                          type="status"
                          value={item.status}
                          tone={item.status === 'Cancelled' ? 'red' : undefined}
                          size="sm"
                        >
                          {t(`list.status.${item.status}`, { defaultValue: item.status })}
                        </Badge>
                      ) : col.key === 'priority' ? (
                        // Only High is marked. Normal is most rows, and a badge on every one of them
                        // hid the few that matter.
                        item.priority === 'High' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
                            <Icon style="solid" name="flag" className="size-3" />
                            {t('list.priority.High')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {t(`list.priority.${item.priority}`, { defaultValue: item.priority })}
                          </span>
                        )
                      ) : col.key === 'slaStatus' ? (
                        slaCell(item)
                      ) : col.key === 'assignee' ? (
                        assigneeCell(item)
                      ) : col.key === 'requestor' ? (
                        personCell(
                          item.requestorName,
                          item.requestorCode,
                          termFor(item, 'requestorName'),
                        )
                      ) : col.key === 'appointmentDateTime' &&
                        item.appointmentDateTime &&
                        isToday(new Date(item.appointmentDateTime)) ? (
                        <span className="font-semibold text-primary">
                          {t('list.today')}{' '}
                          {formatDate(new Date(item.appointmentDateTime), 'HH:mm')}
                        </span>
                      ) : col.key === 'bankingSegment' && item.bankingSegment ? (
                        // One neutral badge: the segment is a label, not a state, and a colour per
                        // code competed with the colours that do mean something (status, SLA).
                        <span className="inline-flex max-w-full items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          <span className="truncate">{getCellValue(item, 'bankingSegment')}</span>
                        </span>
                      ) : col.key === 'appraisalCustomer' ? (
                        // Number over customer. The wrapper is inline so it is as wide as its
                        // widest line; compact density puts both on one line, like it drops
                        // every other second line.
                        <span
                          className={`inline-flex max-w-full ${
                            compact ? 'items-baseline gap-2' : 'flex-col'
                          }`}
                        >
                          <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-primary">
                            {isLoadingRow && (
                              <Icon
                                name="spinner"
                                style="solid"
                                className="size-3 animate-spin text-primary shrink-0"
                              />
                            )}
                            <Highlight
                              text={item.appraisalNumber}
                              term={termFor(item, 'appraisalNumber')}
                              appraisalNumber
                            />
                            {item.priority === 'High' && (
                              // Only High is marked (Normal is most rows). The Priority column is
                              // off by default, so this flag is how a high-priority job shows.
                              <span
                                role="img"
                                title={t('list.priorityHigh')}
                                aria-label={t('list.priorityHigh')}
                                className="inline-flex shrink-0 text-red-600"
                              >
                                <Icon style="solid" name="flag" className="size-3" />
                              </span>
                            )}
                          </span>
                          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                            <span
                              className="truncate font-medium text-gray-800"
                              title={item.customerName || undefined}
                            >
                              <Highlight
                                text={item.customerName}
                                term={termFor(item, 'customerName')}
                              />
                            </span>
                            {item.customerCount > 1 && (
                              <span
                                title={t('list.moreCustomers', { count: item.customerCount - 1 })}
                                className="shrink-0 rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-500"
                              >
                                +{item.customerCount - 1}
                              </span>
                            )}
                          </span>
                          {matchedOnLine(item)}
                        </span>
                      ) : col.key === 'propertyTypes' ? (
                        // A long list (several types joined) is cut by the cell: the title has it all.
                        <span
                          className="block truncate"
                          title={getCellValue(item, 'propertyTypes')}
                        >
                          {getCellValue(item, 'propertyTypes')}
                        </span>
                      ) : col.key === 'purpose' ? (
                        // Why it is being appraised, and under it what kind of job it is.
                        <>
                          <span className="block truncate" title={getCellValue(item, 'purpose')}>
                            {getCellValue(item, 'purpose')}
                          </span>
                          {subLine(
                            appraisalTypeLabel(item.appraisalType) ??
                              t(`list.appraisalType.${item.appraisalType}`, {
                                defaultValue: item.appraisalType,
                              }),
                          )}
                        </>
                      ) : col.key === 'province' ? (
                        <Highlight
                          text={getCellValue(item, 'province')}
                          term={termFor(item, 'province', 'dopaProvince')}
                        />
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
