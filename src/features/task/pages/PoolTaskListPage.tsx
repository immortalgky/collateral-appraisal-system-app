import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useClaimTask, useGetPoolTasks, useLockTask } from '../api';
import { usePoolGroups } from '../hooks/usePoolGroups';
import { useTaskListPaging } from '../hooks/useTaskListPaging';
import type { GroupByField, PoolTask, TaskFilterParams } from '../types';
import { useAuthStore } from '@features/auth/store';
import { isSameUser } from '../utils/isSameUser';
import type { PoolTaskUpdateEvent } from '../hooks/useWorkflowHub';
import { useWorkflowHub } from '../hooks/useWorkflowHub';
import { usePoolKanbanRealtime } from '../hooks/usePoolKanbanRealtime';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { DEFAULT_CONFIG, Dash } from '../config/columnDefs';
import type { ColumnKey } from '../config/columnDefs';
import { TaskKanbanBoard } from '../components/TaskKanbanBoard';
import { PoolTaskKanbanCard } from '../components/PoolTaskKanbanCard';
import { TaskEmptyState } from '../components/list/TaskEmptyState';
import { TaskLegend } from '../components/list/TaskLegend';
import { TaskLoadError } from '../components/list/TaskLoadError';
import { TaskTable, type TaskRowMenuItem } from '../components/list/TaskTable';

type ViewMode = 'grid' | 'list';

/**
 * That the task is locked, as a small lock after its number: blue for you, amber for anyone else.
 * Who and since when is its title and name. An icon, not a pill: the first cell is narrow and the
 * number must always be whole.
 */
function LockMark({ task, self }: { task: PoolTask; self: boolean }) {
  const { t } = useTranslation('task');
  const mins = task.lockedAt
    ? Math.floor((Date.now() - new Date(task.lockedAt).getTime()) / 60000)
    : null;
  const elapsed =
    mins === null
      ? null
      : mins < 1
        ? t('pool.lockedLessThanMinute')
        : t('pool.lockedMinutesAgo', { count: mins });
  const who = self ? t('pool.lockedByYou') : t('pool.lockedByName', { name: task.workingBy });
  const label = elapsed ? `${who} · ${elapsed}` : who;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={clsx('inline-flex shrink-0', self ? 'text-blue-600' : 'text-amber-600')}
    >
      <Icon style="solid" name="lock" className="text-xs" />
    </span>
  );
}

interface PoolTaskListPageProps {
  activityId?: string;
  /** What to search and filter by: the parent owns the toolbar, this page only lists. */
  externalSearch?: string;
  externalFilters?: TaskFilterParams;
  /** "Clear filters" on the empty state. */
  onClearFilters?: () => void;
  /** The pool table's first load or new list is on its way (not a kept page). */
  onLoadingChange?: (loading: boolean) => void;
  /** The pool's total, or null while it is not known (loading, or the board is showing). */
  onCountChange?: (count: number | null) => void;
  // Column layout and view — supplied by the parent, so the columns picker and the list/board
  // toggle can live in its toolbar.
  visibleColumns: ColumnKey[];
  /** Pinned columns, which lead and stay put on a sideways scroll. Default: the appraisal number. */
  pinnedColumns?: readonly ColumnKey[];
  colWidths: Record<string, number>;
  onColWidthChange: (key: ColumnKey, px: number) => void;
  viewMode: ViewMode;
  groupBy: GroupByField;
  /** Drop the card's own frame: the parent draws one around the toolbar and this. */
  bare?: boolean;
}

const DEFAULT_PINNED: readonly ColumnKey[] = [DEFAULT_CONFIG.pinnedColumn];
const NO_FILTERS: TaskFilterParams = {};

function PoolTaskListPage({
  activityId,
  externalSearch = '',
  externalFilters = NO_FILTERS,
  onClearFilters,
  onCountChange,
  onLoadingChange,
  visibleColumns,
  pinnedColumns = DEFAULT_PINNED,
  colWidths,
  onColWidthChange,
  viewMode,
  groupBy,
  bare = false,
}: PoolTaskListPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('task');
  const currentUsername = useAuthStore(s => s.user?.username);
  const poolGroups = usePoolGroups();

  const debouncedSearch = externalSearch;
  const filters = externalFilters;

  const paging = useTaskListPaging(debouncedSearch, filters);

  // The table's query is for the table: not run while the board is showing
  const { data, isLoading, isPlaceholderData, isError, error } = useGetPoolTasks(
    {
      search: debouncedSearch || undefined,
      ...paging.queryParams,
      ...(activityId && { activityId }),
      ...filters,
    },
    { enabled: viewMode === 'list' },
  );

  const tasks = data?.items ?? [];

  // null until the pool answers (and while the board is showing, with no table query), so the
  // header's count does not flash 0 while it loads
  const knownCount = viewMode === 'list' && data ? data.count : null;
  useEffect(() => {
    onCountChange?.(knownCount);
  }, [knownCount, onCountChange]);
  // Layout effect: the parent's spinner follows in the same frame, not one painted frame later.
  // The cleanup keeps a stale `true` from outliving the Pool tab.
  useLayoutEffect(() => {
    onLoadingChange?.(isLoading);
    return () => onLoadingChange?.(false);
  }, [isLoading, onLoadingChange]);
  const hasFilters = !!debouncedSearch || Object.values(filters).some(Boolean);

  const { mutate: lockTask, isPending: isLocking } = useLockTask();
  const { mutate: claimTask, isPending: isClaiming } = useClaimTask();
  const pendingTaskIdRef = useRef<string | null>(null);
  // Set before mutate, not read from the render: two activations before the next render (a held
  // Enter, a click and a keydown) must not both pass. isLocking / isClaiming only lag behind.
  const inFlightRef = useRef(false);

  const handleEditInPool = (task: PoolTask) => {
    // Every row action waits while a lock or claim is in flight. Not only the ones that lock again:
    // navigating away would unmount this page before the lock's own onSuccess runs (TanStack drops
    // it), leaving the lock behind with no lockedTaskId to release it, and the user's own
    // PoolTaskLocked event could turn a second activation into a plain "continue".
    if (inFlightRef.current) return;
    if (isLockedByOther(task)) {
      if (task.appraisalId) navigate(`/appraisals/${task.appraisalId}`);
      return;
    }
    if (isLockedBySelf(task)) {
      navigate(`/tasks/${task.id}/opening`);
      return;
    }
    pendingTaskIdRef.current = task.id;
    inFlightRef.current = true;
    lockTask(task.id, {
      onSettled: () => {
        inFlightRef.current = false;
      },
      onSuccess: () => {
        // Pass lockedTaskId so OpeningTaskPage can release the lock if OpenTask fails
        navigate(`/tasks/${task.id}/opening`, { state: { lockedTaskId: task.id } });
      },
      onError: (err: unknown) => {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
        toast.error(
          message ? t('pool.toasts.lockedBy', { name: message }) : t('pool.toasts.lockFailed'),
        );
        queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
        if (task.appraisalId) navigate(`/appraisals/${task.appraisalId}`);
      },
    });
  };

  const handleTakeOut = (task: PoolTask) => {
    // The same wait as handleEditInPool, which also keeps pendingTaskIdRef (the row whose menu
    // shows busy) from being overwritten mid-flight
    if (inFlightRef.current) return;
    pendingTaskIdRef.current = task.id;
    inFlightRef.current = true;
    claimTask(task.id, {
      onSettled: () => {
        inFlightRef.current = false;
      },
      onSuccess: () => {
        toast.success(t('pool.toasts.claimed'));
      },
      onError: () => {
        toast.error(t('pool.toasts.claimFailed'));
      },
    });
  };

  const handlePoolTaskUpdate = useCallback(
    (event: PoolTaskUpdateEvent) => {
      if (event.type === 'PoolTaskLocked') {
        queryClient.setQueriesData<{
          items: PoolTask[];
          count: number;
          pageNumber: number;
          pageSize: number;
        }>({ queryKey: ['pool-tasks'] }, old =>
          old
            ? {
                ...old,
                items: old.items.map(t =>
                  t.id === event.taskId
                    ? { ...t, workingBy: event.lockedBy ?? null, lockedAt: event.timestamp }
                    : t,
                ),
              }
            : old,
        );
      } else if (event.type === 'PoolTaskUnlocked') {
        queryClient.setQueriesData<{
          items: PoolTask[];
          count: number;
          pageNumber: number;
          pageSize: number;
        }>({ queryKey: ['pool-tasks'] }, old =>
          old
            ? {
                ...old,
                items: old.items.map(t =>
                  t.id === event.taskId ? { ...t, workingBy: null, lockedAt: null } : t,
                ),
              }
            : old,
        );
      } else if (event.type === 'PoolTaskClaimed' || event.type === 'PoolTaskCompleted') {
        queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['task-counts'] });
      }
    },
    [queryClient],
  );

  useWorkflowHub({ poolGroups, onPoolTaskUpdate: handlePoolTaskUpdate });
  // Keeps the pool Kanban board's caches (separate query keys from the table's
  // ['pool-tasks']) in sync — active regardless of which view is currently shown.
  usePoolKanbanRealtime();

  const isLockedBySelf = (task: PoolTask) => isSameUser(task.workingBy, currentUsername);
  const isLockedByOther = (task: PoolTask) => !!task.workingBy && !isLockedBySelf(task);

  const menuItems = (task: PoolTask): TaskRowMenuItem[] => [
    isLockedByOther(task)
      ? { key: 'view', label: t('pool.view'), icon: 'eye', onSelect: () => handleEditInPool(task) }
      : {
          key: 'edit',
          label: isLockedBySelf(task) ? t('pool.continue') : t('pool.edit'),
          icon: 'play',
          onSelect: () => handleEditInPool(task),
        },
    {
      key: 'takeOut',
      label: t('pool.takeOut'),
      icon: 'arrow-right-from-bracket',
      onSelect: () => handleTakeOut(task),
      separatorBefore: true,
    },
  ];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {viewMode === 'grid' ? (
        <div className={bare ? 'min-h-0 flex-1 p-4' : 'min-h-0 flex-1'}>
          <TaskKanbanBoard
            scope="pool"
            groupBy={groupBy}
            baseFilters={{
              search: debouncedSearch || undefined,
              ...(activityId && { activityId }),
              ...filters,
            }}
            renderCard={task => (
              <PoolTaskKanbanCard
                task={task as PoolTask}
                onClick={() => handleEditInPool(task as PoolTask)}
              />
            )}
            onTaskClick={task => handleEditInPool(task as PoolTask)}
          />
        </div>
      ) : (
        <div
          className={
            bare
              ? 'flex min-h-0 min-w-0 flex-1 flex-col'
              : 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'
          }
        >
          {isError ? (
            // Only the table is lost: the board and the rest of the page are not
            <TaskLoadError title={t('pool.loadFailed')} message={(error as Error)?.message} />
          ) : (
            <>
              <TaskTable
                tasks={tasks}
                isLoading={isLoading}
                isStale={isPlaceholderData}
                skeletonRows={Math.min(paging.queryParams.pageSize, 8)}
                visibleColumns={visibleColumns}
                pinnedColumns={pinnedColumns}
                widths={colWidths}
                onWidthChange={onColWidthChange}
                {...paging.sortProps}
                onOpen={task => handleEditInPool(task as PoolTask)}
                menuItems={task => menuItems(task as PoolTask)}
                isBusy={task => (isLocking || isClaiming) && pendingTaskIdRef.current === task.id}
                rowTone={task =>
                  isLockedBySelf(task as PoolTask)
                    ? 'self'
                    : isLockedByOther(task as PoolTask)
                      ? 'other'
                      : null
                }
                numberCell={task => (
                  <>
                    {task.appraisalNumber ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleEditInPool(task as PoolTask);
                        }}
                        className="truncate font-medium text-primary hover:underline"
                      >
                        {task.appraisalNumber}
                      </button>
                    ) : (
                      <Dash />
                    )}
                    {(isLockedBySelf(task as PoolTask) || isLockedByOther(task as PoolTask)) && (
                      <LockMark task={task as PoolTask} self={isLockedBySelf(task as PoolTask)} />
                    )}
                  </>
                )}
                emptyState={
                  <TaskEmptyState pool hasFilters={hasFilters} onClear={onClearFilters} />
                }
              />

              <Pagination {...paging.paginationProps(data?.count)} leftSlot={<TaskLegend />} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PoolTaskListPage;
