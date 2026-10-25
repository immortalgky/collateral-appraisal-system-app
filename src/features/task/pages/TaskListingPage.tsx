import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  ColumnVisibilityDropdown,
  useColumnVisibility,
  useColumnWidths,
  useElementWidth,
} from '@/shared/components/columnLayout';
import Pagination from '@/shared/components/Pagination';
import { hasValue } from '@/features/appraisal/components/search/filterOptions';
import { useGetTaskCounts, useGetTasks, useTaskGroupCounts } from '../api';
import type { GroupByField, Task, TaskFilterParams } from '../types';
import { LIST_CONFIG, POOL_LIST_CONFIG, TASK_COLUMN_LAYOUT_VERSION } from '../config/columnDefs';
import { useTaskListPaging } from '../hooks/useTaskListPaging';
import { useTaskListUrlState } from '../hooks/useTaskListUrlState';
import { TaskKanbanBoard } from '../components/TaskKanbanBoard';
import { TaskEmptyState } from '../components/list/TaskEmptyState';
import { TaskFilterPanel } from '../components/list/TaskFilterPanel';
import { TaskFilterSummary } from '../components/list/TaskFilterSummary';
import { TaskLegend } from '../components/list/TaskLegend';
import { TaskListHeader } from '../components/list/TaskListHeader';
import { TaskListToolbar, type ViewMode } from '../components/list/TaskListToolbar';
import { TaskLoadError } from '../components/list/TaskLoadError';
import { TaskTable, type TaskRowMenuItem } from '../components/list/TaskTable';
import {
  FILTER_PANEL_MIN_WIDTH,
  GROUP_BY_VALUES,
  makeTaskFilters,
  PINNED_TASK_FILTERS,
} from '../components/list/taskFilters';
import { useScaledWidths } from '../components/list/useRootFontScale';
import { useTaskColumnLabels } from '../components/list/useTaskColumnLabels';
import PoolTaskListPage from './PoolTaskListPage';

// The Pool tab's view and grouping are remembered under these keys. (My's are not.)
const POOL_VIEW_STORAGE_KEY = 'task-view-pool';
const POOL_GROUPBY_STORAGE_KEY = 'task-groupby-pool';

/** Whether the user closed the filter panel (so the chips are used even where it would fit). */
const PANEL_HIDDEN_STORAGE_KEY = 'task-filter-panel-hidden';

function readStoredPoolViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(POOL_VIEW_STORAGE_KEY);
    return v === 'grid' || v === 'list' ? v : 'list';
  } catch {
    return 'list';
  }
}

function readStoredPoolGroupBy(): GroupByField {
  try {
    const v = localStorage.getItem(POOL_GROUPBY_STORAGE_KEY);
    return v && (GROUP_BY_VALUES as string[]).includes(v) ? (v as GroupByField) : 'status';
  } catch {
    return 'status';
  }
}

function readStoredPanelHidden(): boolean {
  try {
    return localStorage.getItem(PANEL_HIDDEN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function TaskListingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['task', 'appraisal', 'common']);

  const {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    filters,
    setFilters,
    poolSearch,
    setPoolSearch,
    debouncedPoolSearch,
    poolFilters,
    setPoolFilters,
  } = useTaskListUrlState();
  const isPool = activeTab === 'pool';

  // ── Column layout: each tab keeps its own ────────────────────────────────────
  // Order, visibility and pins are versioned (see TASK_COLUMN_LAYOUT_VERSION); widths are not.
  const columnLabels = useTaskColumnLabels();
  const widthConfig = useScaledWidths(LIST_CONFIG);
  const poolWidthConfig = useScaledWidths(POOL_LIST_CONFIG);
  const myCols = useColumnVisibility(`task-columns-all@${TASK_COLUMN_LAYOUT_VERSION}`, LIST_CONFIG);
  const myWidths = useColumnWidths('task-columns-all', widthConfig);
  const poolCols = useColumnVisibility(
    `task-columns-pool@${TASK_COLUMN_LAYOUT_VERSION}`,
    POOL_LIST_CONFIG,
  );
  const poolWidths = useColumnWidths('task-columns-pool', poolWidthConfig);
  const cols = isPool ? poolCols : myCols;
  const colWidths = isPool ? poolWidths : myWidths;

  // ── View ─────────────────────────────────────────────────────────────────────
  const [poolViewMode, setPoolViewModeState] = useState<ViewMode>(readStoredPoolViewMode);
  const [poolGroupBy, setPoolGroupByState] = useState<GroupByField>(readStoredPoolGroupBy);
  const [myViewMode, setMyViewMode] = useState<ViewMode>('list');
  const [myGroupBy, setMyGroupBy] = useState<GroupByField>('status');

  const setPoolViewMode = (mode: ViewMode) => {
    setPoolViewModeState(mode);
    try {
      localStorage.setItem(POOL_VIEW_STORAGE_KEY, mode);
    } catch {
      // ignore quota / unavailable-storage errors — in-memory state still updates
    }
  };
  const setPoolGroupBy = (g: GroupByField) => {
    setPoolGroupByState(g);
    try {
      localStorage.setItem(POOL_GROUPBY_STORAGE_KEY, g);
    } catch {
      // ignore quota / unavailable-storage errors — in-memory state still updates
    }
  };
  const viewMode = isPool ? poolViewMode : myViewMode;
  const groupBy = isPool ? poolGroupBy : myGroupBy;

  // ── Filters: one set of controls over whichever tab is shown ─────────────────
  const curSearch = isPool ? poolSearch : searchTerm;
  const setCurSearch = isPool ? setPoolSearch : setSearchTerm;
  const curFilters = isPool ? poolFilters : filters;
  const setCurFilters = isPool ? setPoolFilters : setFilters;
  const values = curFilters as Record<string, string>;

  const allFields = useMemo(() => makeTaskFilters(t), [t]);
  const inputFields = useMemo(() => allFields.filter(f => !f.hidden), [allFields]);
  const activeFields = allFields.filter(f => hasValue(values, f));
  const hasFilters = activeFields.length > 0 || !!curSearch;

  const handleFilterChange = useCallback(
    (key: string, value: string) => setCurFilters(prev => ({ ...prev, [key]: value })),
    [setCurFilters],
  );
  const handleFilterRemove = useCallback(
    (key: string) =>
      setCurFilters(prev => {
        const next = { ...prev };
        delete next[key as keyof TaskFilterParams];
        return next;
      }),
    [setCurFilters],
  );
  const handleClearAll = () => {
    setCurFilters({});
    setCurSearch('');
  };

  // ── The filter panel, where the content area has the room for it ─────────────
  // The content area, not the screen: the app's own menu takes 200-360px, or a 4rem rail.
  const [setRootRef, contentWidth] = useElementWidth<HTMLDivElement>();
  const canDock = contentWidth >= FILTER_PANEL_MIN_WIDTH;
  const [panelHidden, setPanelHidden] = useState(readStoredPanelHidden);
  const panelOpen = canDock && !panelHidden;
  const togglePanel = () => {
    const next = !panelHidden;
    setPanelHidden(next);
    try {
      localStorage.setItem(PANEL_HIDDEN_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // ignore quota / unavailable-storage errors — in-memory state still updates
    }
  };

  // ── My list: queried only while it is the one on show ────────────────────────
  const paging = useTaskListPaging(debouncedSearch, filters);
  const myListShown = !isPool && myViewMode === 'list';
  const isSearchPending = searchTerm !== debouncedSearch;

  const {
    data: listData,
    isLoading: isListLoading,
    isPlaceholderData,
    isError,
    error,
  } = useGetTasks(
    { search: debouncedSearch || undefined, ...paging.queryParams, ...filters },
    { enabled: myListShown },
  );
  const listTasks = (listData?.items ?? []) as Task[];

  // ── Counts ───────────────────────────────────────────────────────────────────
  const [poolTotalCount, setPoolTotalCount] = useState<number | null>(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const { data: taskCounts } = useGetTaskCounts();
  const poolBaseline = poolFilters.activityId
    ? poolFilters.activityId
        .split(',')
        .reduce((sum, id) => sum + (taskCounts?.get(id)?.poolCount ?? 0), 0)
    : taskCounts
      ? Array.from(taskCounts.values()).reduce((sum, v) => sum + v.poolCount, 0)
      : 0;
  // On the Pool tab's table: its own total, hidden until it is known (like My's). Anywhere else
  // (the board, or the other tab) the per-activity counts.
  const poolBadge = isPool && poolViewMode === 'list' ? poolTotalCount : poolBaseline;
  // With My not queried (Pool tab, or the board), its total is the unfiltered one the counts give
  const myBadge = myListShown
    ? (listData?.count ?? null)
    : taskCounts
      ? Array.from(taskCounts.values()).reduce((sum, v) => sum + v.myCount, 0)
      : null;

  // Tasks per task type, for the panel: under the search and the other filters (not the task type
  // filter itself, or choosing one would zero the rest), so the numbers agree with the table.
  // Not on a drill-down to another user's tasks: the counts are the signed-in user's, so the panel
  // lists the task types with no numbers there.
  const showsOthersTasks = !isPool && !!curFilters.assigneeUserId;
  const { data: typeCounts } = useTaskGroupCounts(
    'activity',
    {
      ...curFilters,
      activityId: undefined,
      search: (isPool ? debouncedPoolSearch : debouncedSearch) || undefined,
    },
    isPool ? 'pool' : 'me',
    { enabled: panelOpen && !showsOthersTasks },
  );
  const taskTypeCounts = useMemo(
    () => (typeCounts ? new Map(typeCounts.map(c => [c.value, c.count])) : null),
    [typeCounts],
  );

  // ── Rows ─────────────────────────────────────────────────────────────────────
  /**
   * Route a task row click.
   * v5: All task types — including quotation tasks — go through the standard
   * /tasks/:taskId/opening gate. TaskIndexRedirect handles the per-activityId redirect.
   */
  const handleTaskOpen = (task: Task) => navigate(`/tasks/${task.id}/opening`);

  const copyNumber = (number: string) => {
    // navigator.clipboard is missing outside secure contexts (plain http)
    const copied =
      navigator.clipboard?.writeText(number) ?? Promise.reject(new Error('no clipboard'));
    copied.then(
      () => toast.success(t('task:row.copied')),
      () => toast.error(t('task:row.copyFailed')),
    );
  };
  const myMenuItems = (task: Task): TaskRowMenuItem[] => [
    {
      key: 'open',
      label: t('task:row.open'),
      icon: 'arrow-up-right-from-square',
      onSelect: () => handleTaskOpen(task),
    },
    // Nothing to copy until the appraisal has its number
    ...(task.appraisalNumber
      ? [
          {
            key: 'copy',
            label: t('task:row.copyNumber'),
            icon: 'copy',
            onSelect: () => copyNumber(task.appraisalNumber!),
          },
        ]
      : []),
  ];

  const columnsControl = (
    <ColumnVisibilityDropdown
      neutralButton
      checkboxes
      orderedColumns={cols.orderedColumns}
      hidden={cols.hidden}
      alwaysVisible={cols.alwaysVisible}
      pinned={cols.pinnedColumns}
      onTogglePin={cols.togglePin}
      labels={columnLabels}
      hiddenBeyondDefault={cols.hiddenBeyondDefault}
      onToggle={cols.toggleColumn}
      onReorder={cols.reorderColumns}
      canReset={cols.isCustomized || colWidths.hasCustomWidths}
      onReset={() => {
        cols.resetToDefault();
        colWidths.resetWidths();
      }}
    />
  );

  return (
    <div ref={setRootRef} className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <TaskListHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        total={isPool ? poolBadge : myBadge}
        myCount={myBadge}
        poolCount={poolBadge}
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {panelOpen && (
          <TaskFilterPanel
            fields={inputFields}
            values={values}
            onChange={handleFilterChange}
            onRemove={handleFilterRemove}
            onClear={handleClearAll}
            onClose={togglePanel}
            taskTypeCounts={taskTypeCounts}
          />
        )}

        <section
          aria-label={t('task:page.listLabel')}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
        >
          <TaskListToolbar
            searchTerm={curSearch}
            onSearchChange={setCurSearch}
            isSearching={
              isPool
                ? poolSearch !== debouncedPoolSearch || (poolLoading && !!debouncedPoolSearch)
                : myListShown && (isSearchPending || (isListLoading && !!debouncedSearch))
            }
            fields={allFields}
            values={values}
            onFilterChange={handleFilterChange}
            onFilterRemove={handleFilterRemove}
            onFilterClear={handleClearAll}
            pinnedFilters={PINNED_TASK_FILTERS[activeTab]}
            showChips={!panelOpen}
            canDock={canDock}
            panelOpen={panelOpen}
            onTogglePanel={togglePanel}
            activeFilterCount={activeFields.length}
            viewMode={viewMode}
            onViewModeChange={isPool ? setPoolViewMode : setMyViewMode}
            groupBy={groupBy}
            onGroupByChange={isPool ? setPoolGroupBy : setMyGroupBy}
            columnsControl={columnsControl}
          />

          {panelOpen && activeFields.length > 0 && (
            <TaskFilterSummary
              fields={activeFields}
              values={values}
              onRemove={handleFilterRemove}
              onClear={handleClearAll}
            />
          )}

          {isPool ? (
            <PoolTaskListPage
              bare
              externalSearch={debouncedPoolSearch}
              externalFilters={poolFilters}
              onClearFilters={handleClearAll}
              onCountChange={setPoolTotalCount}
              onLoadingChange={setPoolLoading}
              visibleColumns={poolCols.visibleColumns}
              pinnedColumns={poolCols.pinnedColumns}
              colWidths={poolWidths.widths}
              onColWidthChange={poolWidths.setWidth}
              viewMode={poolViewMode}
              groupBy={poolGroupBy}
            />
          ) : myViewMode === 'grid' ? (
            <div className="min-h-0 flex-1 p-4">
              <TaskKanbanBoard
                groupBy={myGroupBy}
                baseFilters={{ search: debouncedSearch || undefined, ...filters }}
              />
            </div>
          ) : isError ? (
            // Only the table is lost: the header, the switch and the Pool tab keep working
            <TaskLoadError
              title={t('task:errors.loadFailed')}
              message={(error as Error)?.message}
            />
          ) : (
            <>
              <TaskTable
                tasks={listTasks}
                isLoading={isListLoading}
                isStale={isPlaceholderData}
                skeletonRows={Math.min(paging.queryParams.pageSize, 8)}
                visibleColumns={myCols.visibleColumns}
                pinnedColumns={myCols.pinnedColumns}
                widths={myWidths.widths}
                onWidthChange={myWidths.setWidth}
                {...paging.sortProps}
                onOpen={handleTaskOpen}
                menuItems={myMenuItems}
                emptyState={<TaskEmptyState hasFilters={hasFilters} onClear={handleClearAll} />}
              />
              <Pagination {...paging.paginationProps(listData?.count)} leftSlot={<TaskLegend />} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default TaskListingPage;
