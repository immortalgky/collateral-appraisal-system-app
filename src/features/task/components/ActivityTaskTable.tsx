import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PoolTaskListPage from '../pages/PoolTaskListPage';
import { useGetTasks, useGetTasksForKanban } from '../api';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { GroupByField, Task, TaskFilterParams, TaskListResponse } from '../types';
import { columnDefs } from '../config/columnDefs';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { useColumnVisibility } from '../hooks/useColumnVisibility';
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';
import { TaskFilterDialog } from './TaskFilterDialog';
import { TaskKanbanBoard } from './TaskKanbanBoard';

type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';
type ActiveTab = 'personal' | 'pool';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  taskId: string | null;
}

interface ActivityTaskTableProps {
  activityId: string;
  title: string;
  description: string;
}

const FILTER_LABELS: Record<keyof TaskFilterParams, string> = {
  appraisalNumber: 'Appraisal No.',
  customerName: 'Customer',
  taskStatus: 'Task Status',
  taskType: 'Task Type',
  dateFrom: 'From',
  dateTo: 'To',
};

const groupByOptions: { value: GroupByField; label: string }[] = [
  { value: 'status', label: 'Appraisal Status' },
  { value: 'purpose', label: 'Purpose' },
  { value: 'taskType', label: 'Task Type' },
  { value: 'priority', label: 'Priority' },
];

// Solid backgrounds on every sticky cell — prevents scrolling content from bleeding through
const stickyThBase =
  'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50 sticky left-0 z-30 cursor-pointer hover:text-gray-700 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-200';
const sortableThBase =
  'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50 cursor-pointer hover:text-gray-600';
const plainThBase =
  'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50';

// bg-white (solid) at rest, bg-gray-50 (solid) on hover — never transparent
const stickyTdClass =
  'bg-white group-hover:bg-gray-50 transition-colors sticky left-0 z-10 px-4 py-3 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-200';
const defaultTdClass = 'px-4 py-3 text-gray-600 text-sm';

export function ActivityTaskTable({ activityId, title, description }: ActivityTaskTableProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('personal');
  const [poolSearch, setPoolSearch] = useState('');
  const debouncedPoolSearch = useDebounce(poolSearch, 400);
  const [poolFilters, setPoolFilters] = useState<TaskFilterParams>({});
  const [poolFilterDialogOpen, setPoolFilterDialogOpen] = useState(false);
  const poolFilterChips = Object.entries(poolFilters).filter(([, v]) => !!v) as [
    keyof TaskFilterParams,
    string,
  ][];

  const { visibleColumns, orderedColumns, hidden, toggleColumn, reorderColumns, resetToDefault } =
    useColumnVisibility('task-columns-' + activityId);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<GroupByField>('status');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const isSearchPending = searchTerm !== debouncedSearch;
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilterParams>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    taskId: null,
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node))
        setContextMenu(prev => ({ ...prev, visible: false }));
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    setPageNumber(0);
  }, [sortField, sortDirection, debouncedSearch, filters]);

  const {
    data,
    isLoading: isListLoading,
    isError,
    error,
  } = useGetTasks({
    pageNumber,
    pageSize,
    search: debouncedSearch || undefined,
    activityId,
    sortBy: sortField ?? undefined,
    sortDir: sortDirection,
    ...filters,
  });

  const { data: kanbanTasks, isLoading: isKanbanLoading } = useGetTasksForKanban({
    search: debouncedSearch || undefined,
    activityId,
  });

  const [minLoadingDone, setMinLoadingDone] = useState(true);
  useEffect(() => {
    const loading = viewMode === 'list' ? isListLoading : isKanbanLoading;
    if (loading) {
      setMinLoadingDone(false);
      setTimeout(() => setMinLoadingDone(true), 400);
    }
  }, [isListLoading, isKanbanLoading, viewMode]);

  const isLoading = (viewMode === 'list' ? isListLoading : isKanbanLoading) || !minLoadingDone;

  const paginatedResult: TaskListResponse | undefined = data;
  const listTasks = (paginatedResult?.items ?? []) as Task[];
  const totalCount = paginatedResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const activeFilterChips = Object.entries(filters).filter(([, v]) => !!v) as [
    keyof TaskFilterParams,
    string,
  ][];
  const hasFilters = !!searchTerm || activeFilterChips.length > 0;

  const removeFilter = (key: keyof TaskFilterParams) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">Failed to load tasks</p>
          <p className="text-xs text-gray-400 mt-0.5">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* Header */}
      <div className="shrink-0 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>

      {/* Toolbar: tabs on left, controls on right */}
      <div className="shrink-0 flex items-end gap-2 border-b border-gray-200 mb-3">
        {/* My / Pool underline tabs */}
        <button
          onClick={() => setActiveTab('personal')}
          className={`relative flex items-center gap-1 px-1 pb-2 text-xs font-medium transition-colors ${
            activeTab === 'personal' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon style="solid" name="user" className="size-3" />
          My
          {!isListLoading && totalCount > 0 && (
            <span
              className={`px-1 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                activeTab === 'personal'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {totalCount}
            </span>
          )}
          {activeTab === 'personal' && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('pool')}
          className={`relative flex items-center gap-1 px-1 pb-2 ml-3 text-xs font-medium transition-colors ${
            activeTab === 'pool' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon style="solid" name="users" className="size-3" />
          Pool
          {activeTab === 'pool' && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Pool-tab controls — right-aligned */}
        {activeTab === 'pool' && (
          <>
            <div className="relative w-56 mb-2">
              <Icon
                style="solid"
                name="magnifying-glass"
                className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search tasks..."
                value={poolSearch}
                onChange={e => setPoolSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
              />
              {poolSearch && (
                <button
                  onClick={() => setPoolSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Icon style="solid" name="xmark" className="size-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setPoolFilterDialogOpen(true)}
              className={`mb-2 flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-all ${
                poolFilterChips.length > 0
                  ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon style="solid" name="sliders" className="size-3.5" />
              Filters
              {poolFilterChips.length > 0 && (
                <span className="inline-flex items-center justify-center size-4 rounded-full bg-primary text-white text-[10px] font-semibold">
                  {poolFilterChips.length}
                </span>
              )}
            </button>
          </>
        )}

        {/* Personal-tab controls — right-aligned */}
        {activeTab === 'personal' && (
          <>
            {/* Search */}
            <div className="relative w-56 mb-2">
              {!isSearchPending && isListLoading && !!debouncedSearch ? (
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
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Icon style="solid" name="xmark" className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter */}
            <button
              onClick={() => setFilterDialogOpen(true)}
              title="Filters"
              className={`mb-2 flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-all ${
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

            {/* Columns (list only) */}
            {viewMode === 'list' && (
              <div className="mb-2">
                <ColumnVisibilityDropdown
                  orderedColumns={orderedColumns}
                  hidden={hidden}
                  onToggle={toggleColumn}
                  onReorder={reorderColumns}
                  onReset={resetToDefault}
                />
              </div>
            )}

            {/* Group by (board only) */}
            {viewMode === 'grid' && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-gray-400">Group by</span>
                <select
                  value={groupBy}
                  onChange={e => setGroupBy(e.target.value as GroupByField)}
                  className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
                >
                  {groupByOptions.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View toggle */}
            <div className="mb-2 flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className={`flex items-center justify-center size-8 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-primary'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon style="solid" name="list" className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Board view"
                className={`flex items-center justify-center size-8 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-primary'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon style="solid" name="grid-2" className="size-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Pool tab */}
      {activeTab === 'pool' && (
        <>
          <TaskFilterDialog
            open={poolFilterDialogOpen}
            initialValues={poolFilters}
            onApply={v => setPoolFilters(v)}
            onClose={() => setPoolFilterDialogOpen(false)}
          />
          {poolFilterChips.length > 0 && (
            <div className="shrink-0 flex items-center gap-1.5 flex-wrap mb-2">
              {poolFilterChips.map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 text-xs bg-primary/8 text-primary border border-primary/15 rounded-full font-medium"
                >
                  <span className="text-primary/60">{FILTER_LABELS[key]}:</span> {value}
                  <button
                    onClick={() =>
                      setPoolFilters(prev => {
                        const n = { ...prev };
                        delete n[key];
                        return n;
                      })
                    }
                    className="hover:text-primary/60 ml-0.5"
                  >
                    <Icon style="solid" name="xmark" className="size-2.5" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => setPoolFilters({})}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
          <PoolTaskListPage
            activityId={activityId}
            externalSearch={debouncedPoolSearch}
            externalFilters={poolFilters}
          />
        </>
      )}

      {/* Personal tab */}
      {activeTab === 'personal' && (
        <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-3">
          {/* Active filter chips */}
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
                onClick={() => setFilters({})}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}

          <TaskFilterDialog
            open={filterDialogOpen}
            initialValues={filters}
            onApply={v => setFilters(v)}
            onClose={() => setFilterDialogOpen(false)}
          />

          {/* Content */}
          {viewMode === 'list' ? (
            <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full min-w-max text-sm">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {visibleColumns.map(key => {
                        const col = columnDefs[key];
                        const isActive = sortField === col.sortField;
                        const thClass = col.sticky
                          ? stickyThBase
                          : col.sortField
                            ? `${sortableThBase} ${isActive ? 'text-primary' : ''}`
                            : plainThBase;
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
                      <th className="px-4 py-2.5 w-8 bg-gray-50" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <TableRowSkeleton
                        columns={visibleColumns.map(() => ({ width: 'w-24' }))}
                        rows={8}
                      />
                    ) : listTasks.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="py-24">
                          <div className="flex flex-col items-center gap-4">
                            <div className="size-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                              <Icon style="regular" name="inbox" className="size-7 text-gray-300" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-semibold text-gray-700">
                                {hasFilters ? 'No matching tasks' : 'All clear'}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {hasFilters
                                  ? 'Try adjusting your search or filters.'
                                  : 'No tasks assigned in this activity.'}
                              </p>
                            </div>
                            {hasFilters && (
                              <button
                                onClick={() => {
                                  setSearchTerm('');
                                  setFilters({});
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
                      listTasks.map(task => (
                        <tr
                          key={task.id}
                          onDoubleClick={() => navigate(`/tasks/${task.id}/opening`)}
                          onContextMenu={e => {
                            e.preventDefault();
                            setContextMenu({
                              visible: true,
                              x: e.clientX,
                              y: e.clientY,
                              taskId: task.id,
                            });
                          }}
                          className="group hover:bg-gray-50 cursor-default transition-colors"
                        >
                          {visibleColumns.map(key => {
                            const col = columnDefs[key];
                            return (
                              <td
                                key={key}
                                className={
                                  col.sticky ? stickyTdClass : (col.tdClassName ?? defaultTdClass)
                                }
                                onClick={col.sticky ? e => e.stopPropagation() : undefined}
                              >
                                {col.render(task)}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 w-8">
                            <Icon
                              style="solid"
                              name="arrow-right"
                              className="size-3 text-gray-200 group-hover:text-primary/40 transition-colors"
                            />
                          </td>
                        </tr>
                      ))
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
          ) : (
            <div className="flex-1 min-h-0">
              <TaskKanbanBoard tasks={kanbanTasks || []} groupBy={groupBy} isLoading={isLoading} />
            </div>
          )}

          {/* Context menu */}
          {contextMenu.visible && (
            <div
              ref={contextMenuRef}
              className="fixed bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-[160px]"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button
                onClick={() => {
                  navigate(`/tasks/${contextMenu.taskId}/opening`);
                  setContextMenu(p => ({ ...p, visible: false }));
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 rounded-lg mx-1"
                style={{ width: 'calc(100% - 8px)' }}
              >
                <Icon
                  style="regular"
                  name="arrow-up-right-from-square"
                  className="size-3.5 text-gray-400"
                />
                Open task
              </button>
              <button
                onClick={() => {
                  const task = listTasks.find(t => t.id === contextMenu.taskId);
                  if (task?.appraisalNumber) navigator.clipboard.writeText(task.appraisalNumber);
                  setContextMenu(p => ({ ...p, visible: false }));
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 rounded-lg mx-1"
                style={{ width: 'calc(100% - 8px)' }}
              >
                <Icon style="regular" name="copy" className="size-3.5 text-gray-400" />
                Copy report no.
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
