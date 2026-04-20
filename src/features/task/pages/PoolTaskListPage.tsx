import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useClaimTask, useGetPoolTasks, useLockTask } from '../api';
import type { PoolTask, TaskFilterParams } from '../types';
import { useAuthStore } from '@features/auth/store';
import type { PoolTaskUpdateEvent } from '../hooks/useWorkflowHub';
import { useWorkflowHub } from '../hooks/useWorkflowHub';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { columnDefs } from '../config/columnDefs';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { TaskFilterDialog } from '../components/TaskFilterDialog';

type SortDirection = 'asc' | 'desc';

const POOL_COLUMNS = [
  'appraisalNumber',
  'customerName',
  'taskType',
  'purpose',
  'propertyType',
  'status',
  'dueAt',
  'priority',
] as const;

const FILTER_LABELS: Record<keyof TaskFilterParams, string> = {
  appraisalNumber: 'Appraisal No.',
  customerName: 'Customer',
  status: 'Request Status',
  pendingTaskStatus: 'Task Status',
  slaStatus: 'SLA',
  assigneeUserId: 'Assignee',
  activityId: 'Task Type',
  dateType: 'Date Type',
  dateFrom: 'From',
  dateTo: 'To',
};

function LockBubble({
  label,
  color,
  lockedAt,
}: {
  label: string;
  color: 'blue' | 'amber';
  lockedAt: string | null;
}) {
  const elapsed = lockedAt
    ? (() => {
        const mins = Math.floor((Date.now() - new Date(lockedAt).getTime()) / 60000);
        return mins < 1 ? '< 1 min ago' : `${mins} min ago`;
      })()
    : null;

  const isBlue = color === 'blue';
  const pillCls = isBlue
    ? 'bg-blue-100 ring-1 ring-blue-300'
    : 'bg-amber-100 ring-1 ring-amber-300';
  const dotCls = isBlue ? 'bg-blue-500' : 'bg-amber-500';
  const tooltipCls = isBlue ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white';
  const tailCls = isBlue ? 'bg-blue-600' : 'bg-amber-500';

  return (
    <div className="relative group/lock inline-block shrink-0">
      {/* Typing indicator — Teams / WhatsApp style */}
      <div
        className={`inline-flex items-center gap-[3px] px-2.5 py-2 rounded-2xl shadow-sm cursor-default select-none ${pillCls}`}
      >
        {([0, 160, 320] as const).map(delay => (
          <span
            key={delay}
            className={`block size-1.5 rounded-full animate-bounce ${dotCls}`}
            style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
          />
        ))}
      </div>

      {/* Tooltip — appears on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none invisible opacity-0 group-hover/lock:visible group-hover/lock:opacity-100 transition-all duration-150">
        <div className={`rounded-2xl px-3 py-2 text-xs shadow-xl whitespace-nowrap ${tooltipCls}`}>
          <p className="font-semibold leading-none">{label}</p>
          {elapsed && <p className="mt-1 opacity-75 text-[10px]">{elapsed}</p>}
        </div>
        {/* Bubble tail — descending circles */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pt-0.5">
          <div className={`size-2 rounded-full ${tailCls}`} />
          <div className={`size-1.5 rounded-full ${tailCls} opacity-75`} />
          <div className={`size-1 rounded-full ${tailCls} opacity-50`} />
        </div>
      </div>
    </div>
  );
}

interface PoolTaskListPageProps {
  activityId?: string;
  // When provided by a parent, the toolbar is hidden and these values drive the query
  externalSearch?: string;
  externalFilters?: TaskFilterParams;
}

function PoolTaskListPage({ activityId, externalSearch, externalFilters }: PoolTaskListPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUsername = useAuthStore(s => s.user?.username);
  const userRoles = useAuthStore(s => s.user?.roles ?? []);
  const isControlled = externalSearch !== undefined || externalFilters !== undefined;

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const internalDebounced = useDebounce(internalSearchTerm, 400);
  const isSearchPending = internalSearchTerm !== internalDebounced;
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [internalFilters, setInternalFilters] = useState<TaskFilterParams>({});

  const searchTerm = isControlled ? (externalSearch ?? '') : internalSearchTerm;
  const debouncedSearch = isControlled ? searchTerm : internalDebounced;
  const filters = isControlled ? (externalFilters ?? {}) : internalFilters;

  useEffect(() => {
    setPageNumber(0);
  }, [sortField, sortDirection, debouncedSearch, filters]);

  const { data, isLoading, isError, error } = useGetPoolTasks({
    pageNumber,
    pageSize,
    search: debouncedSearch || undefined,
    sortBy: sortField ?? undefined,
    sortDir: sortDirection,
    ...(activityId && { activityId }),
    ...filters,
  });

  const tasks = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const activeFilterChips = Object.entries(filters).filter(([, v]) => !!v) as [
    keyof TaskFilterParams,
    string,
  ][];
  const hasFilters = !!searchTerm || activeFilterChips.length > 0;

  const { mutate: lockTask, isPending: isLocking } = useLockTask();
  const { mutate: claimTask, isPending: isClaiming } = useClaimTask();
  const pendingTaskIdRef = useRef<string | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenuTaskId) return;
    const close = () => setOpenMenuTaskId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuTaskId]);

  const handleEditInPool = (task: PoolTask) => {
    if (task.workingBy && task.workingBy !== currentUsername) {
      if (task.appraisalId) navigate(`/appraisals/${task.appraisalId}`);
      return;
    }
    if (task.workingBy === currentUsername) {
      navigate(`/tasks/${task.id}/opening`);
      return;
    }
    pendingTaskIdRef.current = task.id;
    lockTask(task.id, {
      onSuccess: () => {
        // Pass lockedTaskId so OpeningTaskPage can release the lock if OpenTask fails
        navigate(`/tasks/${task.id}/opening`, { state: { lockedTaskId: task.id } });
      },
      onError: (err: unknown) => {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
        toast.error(
          message
            ? `Task is currently being edited by ${message}`
            : 'Could not lock task. Try again.',
        );
        queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
        if (task.appraisalId) navigate(`/appraisals/${task.appraisalId}`);
      },
    });
  };

  const handleTakeOut = (task: PoolTask) => {
    pendingTaskIdRef.current = task.id;
    claimTask(task.id, {
      onSuccess: () => {
        toast.success('Task moved to your tasks');
      },
      onError: () => {
        toast.error('Could not claim task. Try again.');
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
      } else if (event.type === 'PoolTaskClaimed') {
        queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
      }
    },
    [queryClient],
  );

  useWorkflowHub({ poolGroups: userRoles, onPoolTaskUpdate: handlePoolTaskUpdate });

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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

  const removeFilter = (key: keyof TaskFilterParams) => {
    setInternalFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">Failed to load pool tasks</p>
          <p className="text-xs text-gray-400 mt-0.5">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-3">
      {/* Toolbar — only shown when not controlled by a parent */}
      {!isControlled && (
        <>
          <div className="shrink-0 flex items-center gap-2">
            <div className="flex-1" />

            <div className="relative w-60">
              {!isSearchPending && isLoading && !!debouncedSearch ? (
                <Icon
                  style="solid"
                  name="spinner"
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-primary animate-spin pointer-events-none"
                />
              ) : (
                <Icon
                  style="solid"
                  name="magnifying-glass"
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none"
                />
              )}
              <input
                type="text"
                placeholder="Search tasks..."
                value={internalSearchTerm}
                onChange={e => setInternalSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
              />
              {internalSearchTerm && (
                <button
                  onClick={() => setInternalSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Icon style="solid" name="xmark" className="size-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setFilterDialogOpen(true)}
              title="Filters"
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-all ${
                activeFilterChips.length > 0
                  ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon style="solid" name="sliders" className="size-3.5" />
              Filters
              {activeFilterChips.length > 0 && (
                <span className="inline-flex items-center justify-center size-4 rounded-full bg-primary text-white text-[10px] font-semibold">
                  {activeFilterChips.length}
                </span>
              )}
            </button>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="shrink-0 flex items-center gap-1.5 flex-wrap">
              {activeFilterChips.map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 text-xs bg-primary/8 text-primary border border-primary/15 rounded-full font-medium"
                >
                  <span className="text-primary/60">{FILTER_LABELS[key]}:</span> {value}
                  <button
                    onClick={() => removeFilter(key)}
                    className="hover:text-primary/60 ml-0.5"
                  >
                    <Icon style="solid" name="xmark" className="size-2.5" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => setInternalFilters({})}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}

          <TaskFilterDialog
            open={filterDialogOpen}
            initialValues={internalFilters}
            onApply={v => setInternalFilters(v)}
            onClose={() => setFilterDialogOpen(false)}
          />
        </>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-50 border-b border-gray-200">
                {POOL_COLUMNS.map(key => {
                  const col = columnDefs[key];
                  const isActive = sortField === col.sortField;
                  const base =
                    'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50';
                  const isSticky = key === 'appraisalNumber';
                  const thClass = isSticky
                    ? `${base} sticky left-0 z-30 cursor-pointer hover:text-gray-600 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-200`
                    : col.sortField
                      ? `${base} cursor-pointer hover:text-gray-600 ${isActive ? 'text-primary' : ''}`
                      : base;
                  return (
                    <th
                      key={key}
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
                <th className="w-10 px-4 py-2.5 bg-gray-50" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowSkeleton columns={POOL_COLUMNS.map(() => ({ width: 'w-24' }))} rows={8} />
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={POOL_COLUMNS.length + 2} className="py-24">
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <Icon style="regular" name="inbox" className="size-7 text-gray-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                          {hasFilters ? 'No matching tasks' : 'Pool is empty'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {hasFilters
                            ? 'Try adjusting your search or filters.'
                            : 'There are no tasks in the pool right now.'}
                        </p>
                      </div>
                      {hasFilters && (
                        <button
                          onClick={() => {
                            setInternalSearchTerm('');
                            setInternalFilters({});
                          }}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map(task => {
                  const isLockedBySelf = task.workingBy === currentUsername;
                  const isLockedByOther = !!task.workingBy && task.workingBy !== currentUsername;
                  const isActing =
                    (isLocking || isClaiming) && pendingTaskIdRef.current === task.id;

                  return (
                    <tr
                      key={task.id}
                      className={`group transition-colors ${isLockedBySelf ? 'bg-blue-50' : isLockedByOther ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                    >
                      {POOL_COLUMNS.map(key => {
                        const col = columnDefs[key];
                        const isSticky = key === 'appraisalNumber';
                        const tdClass = isSticky
                          ? `${isLockedBySelf ? 'bg-blue-50' : isLockedByOther ? 'bg-amber-50' : 'bg-white group-hover:bg-gray-50'} transition-colors sticky left-0 z-10 px-4 py-3 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-200`
                          : (col.tdClassName ?? 'px-4 py-3 text-gray-600 text-sm');
                        return (
                          <td key={key} className={tdClass}>
                            {key === 'appraisalNumber' ? (
                              <>
                                {/* Lock badge — absolute top-left, straddles the row border */}
                                {(isLockedBySelf || isLockedByOther) && (
                                  <div className="absolute top-0 left-2 -translate-y-1/2 z-20">
                                    {isLockedBySelf && (
                                      <LockBubble
                                        label="You're editing"
                                        color="blue"
                                        lockedAt={task.lockedAt}
                                      />
                                    )}
                                    {isLockedByOther && (
                                      <LockBubble
                                        label={task.workingBy!}
                                        color="amber"
                                        lockedAt={task.lockedAt}
                                      />
                                    )}
                                  </div>
                                )}
                                <button
                                  onClick={() => handleEditInPool(task)}
                                  className={`font-medium text-primary hover:underline ${isLockedBySelf || isLockedByOther ? 'mt-3' : ''}`}
                                >
                                  {task.appraisalNumber ?? task.requestNumber ?? '-'}
                                </button>
                              </>
                            ) : (
                              col.render(task)
                            )}
                          </td>
                        );
                      })}

                      {/* Actions — ellipsis dropdown */}
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            disabled={isActing}
                            onClick={e => {
                              e.stopPropagation();
                              setOpenMenuTaskId(prev => (prev === task.id ? null : task.id));
                            }}
                            className="inline-flex items-center justify-center size-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isActing ? (
                              <Icon
                                style="solid"
                                name="spinner"
                                className="size-3.5 animate-spin"
                              />
                            ) : (
                              <Icon style="solid" name="ellipsis-vertical" className="size-3.5" />
                            )}
                          </button>

                          {openMenuTaskId === task.id && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="absolute right-0 z-50 mt-1 w-36 bg-white rounded-lg border border-gray-200 shadow-lg py-1 text-sm"
                            >
                              {isLockedByOther ? (
                                <button
                                  onClick={() => {
                                    setOpenMenuTaskId(null);
                                    handleEditInPool(task);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                  <Icon style="solid" name="eye" className="size-3 text-gray-400" />
                                  View
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setOpenMenuTaskId(null);
                                    handleEditInPool(task);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Icon
                                    style="solid"
                                    name="pencil"
                                    className="size-3 text-primary"
                                  />
                                  {isLockedBySelf ? 'Continue' : 'Edit'}
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setOpenMenuTaskId(null);
                                  handleTakeOut(task);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Icon
                                  style="solid"
                                  name="arrow-right-from-bracket"
                                  className="size-3 text-gray-500"
                                />
                                Take Out
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pageNumber}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPageNumber}
          onPageSizeChange={size => {
            setPageSize(size);
            setPageNumber(0);
          }}
        />
      </div>
    </div>
  );
}

export default PoolTaskListPage;
