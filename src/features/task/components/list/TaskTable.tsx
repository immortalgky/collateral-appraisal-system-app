import { Fragment, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import {
  ColumnResizeHandle,
  DEFAULT_COLUMN_WIDTH,
  useColumnAutoFit,
  useFilledColumns,
} from '@/shared/components/columnLayout';
import { bucketForSlaStatus } from '@features/common/monitoring/components/SlaCells';
import type { Task } from '../../types';
import { columnDefs, Dash, type ColumnKey } from '../../config/columnDefs';
import { ActivityTile } from './ActivityTile';
import {
  CELL_SHADOW,
  FOCUS_RING,
  FOCUS_RING_LEFT,
  FOCUS_RING_RIGHT,
  type SlaBar,
} from './rowMarks';
import { useTaskColumnLabels } from './useTaskColumnLabels';

/** Width of the sticky ⋮ column (px, like the column widths the toolkit stores). */
const ACTIONS_COL_WIDTH = 44;

export interface TaskRowMenuItem {
  key: string;
  label: string;
  icon: string;
  onSelect: () => void;
  /** A rule above this item. */
  separatorBefore?: boolean;
}

interface TaskTableProps {
  tasks: Task[];
  isLoading: boolean;
  /** Skeleton rows while loading: the page size, so the card keeps its height. */
  skeletonRows?: number;
  /** The visible columns in order; the pinned ones lead. */
  visibleColumns: ColumnKey[];
  pinnedColumns: readonly ColumnKey[];
  widths: Record<string, number>;
  onWidthChange: (key: ColumnKey, px: number) => void;
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  /** Click on a row, or Enter on it. */
  onOpen: (task: Task) => void;
  menuItems: (task: Task) => TaskRowMenuItem[];
  /** The rows are the previous result while the next loads: dimmed, still there. */
  isStale?: boolean;
  /** The ⋮ of this task is busy (a lock or take-out in flight). */
  isBusy?: (task: Task) => boolean;
  /**
   * The appraisal number control and anything beside it (the Pool's lock pill). Default: the number
   * as a link to the task. It must stop propagation of its own clicks.
   */
  numberCell?: (task: Task) => ReactNode;
  /** A task someone is editing in the Pool: yours is tinted, another's is muted. */
  rowTone?: (task: Task) => 'self' | 'other' | null;
  /** Shown, with only the header above it, when there is nothing to list. */
  emptyState: ReactNode;
}

// Row background goes on the <tr> and is always opaque: the sticky cells repeat it (bg-inherit),
// and a translucent one would show the columns sliding underneath (DESIGN.md section 10).
const ROW_BASE =
  'bg-white even:bg-[color-mix(in_oklab,var(--color-gray-50)_50%,white)] hover:bg-gray-50';
const ROW_SELF = 'bg-blue-50';

/**
 * Opens the ⋮ menu of a row (right-click, or the menu key), as if ArrowDown were pressed on its
 * button. Not `button.click()`: after any real mouse press on the button, Headless UI ignores the
 * click that has no pointer event of its own before it, so the menu would never open again.
 * ArrowDown opens it with its first item active, and does nothing if it is already open.
 */
function openRowMenu(row: HTMLElement) {
  row
    .querySelector('button[aria-haspopup="menu"]')
    ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
}

function StatusCell({ task }: { task: Task }) {
  const { t } = useTranslation('appraisal');
  if (!task.status) return <Dash />;
  return (
    <Badge type="status" value={task.status} size="sm" className="whitespace-nowrap">
      {t(`list.status.${task.status}`, { defaultValue: task.status })}
    </Badge>
  );
}

function TaskTypeCell({ task }: { task: Task }) {
  const { t } = useTranslation('task');
  // A type this app names is shown in the user's language; one it does not know keeps the backend's text
  const label = task.activityId
    ? t(`activity.${task.activityId}`, {
        defaultValue: task.taskDescription || task.taskType || task.activityId,
      })
    : task.taskDescription || task.taskType;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <ActivityTile activityId={task.activityId} />
      {label ? (
        <span className="truncate" title={label}>
          {label}
        </span>
      ) : (
        <Dash />
      )}
    </div>
  );
}

/** Number over customer: the number is the row's identity, the customer is who it is for. */
function NumberCell({
  task,
  numberCell,
  showCustomer,
}: Pick<TaskTableProps, 'numberCell'> & { task: Task; showCustomer: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {numberCell ? (
          numberCell(task)
        ) : task.appraisalNumber ? (
          <Link
            to={`/tasks/${task.id}/opening`}
            onClick={e => e.stopPropagation()}
            className="truncate font-medium text-primary hover:underline"
          >
            {task.appraisalNumber}
          </Link>
        ) : (
          <Dash />
        )}
      </div>
      {showCustomer && (
        <span className="block truncate font-medium text-gray-800" title={task.customerName ?? ''}>
          {task.customerName?.trim() || <Dash />}
        </span>
      )}
    </div>
  );
}

function RowMenu({
  items,
  busy,
  label,
}: {
  items: TaskRowMenuItem[];
  busy: boolean;
  label: string;
}) {
  return (
    <Menu as="div" className="relative inline-block">
      <MenuButton
        disabled={busy}
        aria-label={label}
        title={label}
        className="inline-flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 data-open:bg-gray-100 data-open:text-gray-700"
      >
        <Icon
          style="solid"
          name={busy ? 'spinner' : 'ellipsis-vertical'}
          className={clsx('text-sm', busy && 'animate-spin')}
        />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        // Not modal: a modal menu makes the rest of the page inert, so a right-click on another row
        // while this one is open would be swallowed instead of opening that row's menu
        modal={false}
        className="z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-none"
      >
        {items.map(item => (
          <Fragment key={item.key}>
            {item.separatorBefore && (
              <div role="separator" className="my-1 border-t border-gray-100" />
            )}
            <MenuItem>
              <button
                type="button"
                onClick={item.onSelect}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100"
              >
                <Icon style="solid" name={item.icon} className="text-xs text-gray-400" />
                {item.label}
              </button>
            </MenuItem>
          </Fragment>
        ))}
      </MenuItems>
    </Menu>
  );
}

/**
 * The task list's table, for My and Pool alike: rows open on click and Enter, the SLA state is a
 * 3px bar on the first cell, the user's pinned columns stay put while the rest scroll sideways,
 * and the row's actions are a ⋮ menu that stays at the right edge.
 */
export function TaskTable({
  tasks,
  isLoading,
  skeletonRows = 8,
  visibleColumns,
  pinnedColumns,
  widths,
  onWidthChange,
  sortField,
  sortDirection,
  onSort,
  onOpen,
  menuItems,
  isStale = false,
  isBusy,
  numberCell,
  rowTone,
  emptyState,
}: TaskTableProps) {
  const { t } = useTranslation('task');
  const labels = useTaskColumnLabels();
  const tableRef = useRef<HTMLTableElement>(null);
  const getAutoFitWidth = useColumnAutoFit(tableRef);
  const isEmpty = !isLoading && tasks.length === 0;

  // The scroll box's width: a table with few columns grows to its edge (the ⋮ column belongs at the
  // right of the card, not in the middle of it); a wide one scrolls sideways.
  const { setContainer, containerWidth, widthOf, tableWidth, storedFor, measureAtStoredWidths } =
    useFilledColumns({
      keys: visibleColumns,
      widths,
      trailing: [ACTIONS_COL_WIDTH],
      tableRef,
    });
  // A column without a width (not in the layout's config) must not collapse to nothing
  const shown = (key: ColumnKey) => widthOf(key) ?? DEFAULT_COLUMN_WIDTH;

  // Pinned columns lead (the layout hook puts them first), and each sticks at the sum of those before
  // it, but only while they all stay within half of the scroll box: a pinned block wider than that
  // would leave the rest of the table nowhere to scroll into. The ones past the limit keep their
  // place at the front and scroll with the table. (Unmeasured: no limit.)
  const limit = containerWidth > 0 ? containerWidth / 2 : Infinity;
  const left: Partial<Record<ColumnKey, number>> = {};
  let offset = 0;
  let lastSticky: ColumnKey | undefined;
  for (const key of visibleColumns.filter(k => pinnedColumns.includes(k))) {
    if (offset + shown(key) > limit) break;
    left[key] = offset;
    offset += shown(key);
    lastSticky = key;
  }

  const renderCell = (task: Task, key: ColumnKey): ReactNode => {
    switch (key) {
      case 'appraisalNumber':
        // The customer under the number, unless the customer name column is showing it
        return (
          <NumberCell
            task={task}
            numberCell={numberCell}
            showCustomer={!visibleColumns.includes('customerName')}
          />
        );
      case 'taskType':
        return <TaskTypeCell task={task} />;
      case 'channel':
        return task.channel ? (
          <Badge type="channel" value={task.channel} size="sm" className="whitespace-nowrap">
            <ParameterDisplay group="Channel" code={task.channel} />
          </Badge>
        ) : (
          <Dash />
        );
      case 'status':
        return <StatusCell task={task} />;
      default:
        return columnDefs[key].render(task);
    }
  };

  return (
    <>
      <div
        ref={setContainer}
        // With nothing to list the box shrinks to the header and clips (nothing to scroll to), and
        // the empty state below gets the rest of the card.
        aria-busy={isLoading || isStale}
        className={clsx(
          isEmpty ? 'shrink-0 overflow-hidden' : 'min-h-0 flex-1 overflow-auto',
          'transition-opacity',
          isStale && 'opacity-60',
        )}
      >
        <table
          ref={tableRef}
          className="table-fixed border-separate border-spacing-0 text-table"
          style={{ width: tableWidth }}
        >
          <colgroup>
            {visibleColumns.map(key => (
              <col key={key} style={{ width: shown(key) }} />
            ))}
            <col style={{ width: ACTIONS_COL_WIDTH }} />
          </colgroup>
          <thead>
            <tr>
              {visibleColumns.map((key, colIndex) => {
                const def = columnDefs[key];
                const isSticky = key in left;
                const active = !!def.sortField && sortField === def.sortField;
                return (
                  <th
                    key={key}
                    scope="col"
                    aria-sort={
                      active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    style={isSticky ? { left: left[key] } : undefined}
                    className={clsx(
                      'sticky top-0 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-gray-600 select-none',
                      isSticky ? 'z-20' : 'z-10',
                      key === lastSticky && 'shadow-[inset_-1px_0_0_var(--color-gray-200)]',
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {def.sortField ? (
                        <button
                          type="button"
                          onClick={() => onSort(def.sortField!)}
                          className={clsx(
                            'flex min-w-0 cursor-pointer items-center gap-1 font-semibold',
                            active ? 'text-primary' : 'hover:text-gray-900',
                          )}
                        >
                          <span className="truncate">{labels[key]}</span>
                          <Icon
                            style="solid"
                            name={
                              active ? (sortDirection === 'asc' ? 'sort-up' : 'sort-down') : 'sort'
                            }
                            className={clsx(
                              'shrink-0 text-xs',
                              active ? 'text-primary' : 'text-gray-300',
                            )}
                          />
                        </button>
                      ) : (
                        <span className="truncate">{labels[key]}</span>
                      )}
                      {pinnedColumns.includes(key) && (
                        <span title={t('table.pinned')} className="shrink-0 text-primary">
                          <Icon style="solid" name="thumbtack" className="text-xs" />
                        </span>
                      )}
                    </div>
                    <ColumnResizeHandle
                      width={shown(key)}
                      onResize={px => onWidthChange(key, storedFor(key, px))}
                      onAutoFit={px => onWidthChange(key, px)}
                      getAutoFitWidth={measureAtStoredWidths(getAutoFitWidth(key, colIndex))}
                    />
                  </th>
                );
              })}
              <th
                scope="col"
                className="sticky top-0 right-0 z-20 border-b border-gray-200 bg-gray-50"
              >
                <span className="sr-only">{t('table.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableRowSkeleton
                columns={[...visibleColumns.map(() => ({ width: 'w-24' })), { width: 'w-4' }]}
                rows={skeletonRows}
              />
            ) : (
              tasks.map(task => {
                const sla = bucketForSlaStatus(task.slaStatus);
                const slaBar: SlaBar | null = sla === 'breached' || sla === 'atRisk' ? sla : null;
                const tone = rowTone?.(task);
                return (
                  <tr
                    key={task.id}
                    tabIndex={0}
                    onClick={() => onOpen(task)}
                    onKeyDown={e => {
                      // Only on the row itself; on a link or button inside it, that control's own keys
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter') onOpen(task);
                      else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
                        e.preventDefault();
                        openRowMenu(e.currentTarget);
                      }
                    }}
                    onContextMenu={e => {
                      // The menu is portalled, but React still bubbles its events through here
                      if (!e.currentTarget.contains(e.target as Node)) return;
                      e.preventDefault();
                      openRowMenu(e.currentTarget);
                    }}
                    onPointerUp={e => {
                      // Headless UI closes an open menu on any pointerup outside it, the right button
                      // included, and that can land after the contextmenu event above (it does with
                      // the menu open on this row or another). This runs after that close: open again.
                      if (e.button === 2 && e.currentTarget.contains(e.target as Node)) {
                        openRowMenu(e.currentTarget);
                      }
                    }}
                    className={clsx(
                      // The focus ring is drawn on the cells (FOCUS_RING), not as an outline
                      'group cursor-pointer outline-none! transition-colors',
                      tone === 'self' ? ROW_SELF : ROW_BASE,
                    )}
                  >
                    {visibleColumns.map((key, i) => {
                      const isSticky = key in left;
                      const shadow = CELL_SHADOW[i === 0 && slaBar ? slaBar : 'none'];
                      return (
                        <td
                          key={key}
                          style={isSticky ? { left: left[key] } : undefined}
                          className={clsx(
                            'truncate border-b border-gray-100 px-4 py-2.5 align-middle',
                            tone === 'other' ? 'text-gray-500' : 'text-gray-600',
                            isSticky ? 'sticky z-[1] bg-inherit' : 'relative',
                            FOCUS_RING,
                            // The SLA bar is already the left edge of the first cell
                            i === 0 && !slaBar && FOCUS_RING_LEFT,
                            key === lastSticky ? shadow.edge : shadow.bar,
                          )}
                        >
                          {renderCell(task, key)}
                        </td>
                      );
                    })}
                    <td
                      // The menu is portalled, but React still bubbles its clicks through here
                      onClick={e => e.stopPropagation()}
                      className={clsx(
                        'sticky right-0 z-[1] border-b border-gray-100 bg-inherit px-2 text-center',
                        FOCUS_RING,
                        FOCUS_RING_RIGHT,
                      )}
                    >
                      <RowMenu
                        items={menuItems(task)}
                        busy={isBusy?.(task) ?? false}
                        label={t('table.actions')}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Outside the table on purpose: a cell spanning every column would centre this on the TABLE,
        which can be wider than the screen */}
      {isEmpty && emptyState}
    </>
  );
}
