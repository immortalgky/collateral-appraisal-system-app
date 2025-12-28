import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetTasks, useGetTasksForKanban } from '../api';
import type { Task, GroupByField } from '../types';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Badge from '@/shared/components/Badge';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { TaskKanbanBoard } from '../components/TaskKanbanBoard';
import { format } from 'date-fns';

// Format date as DD/MM/YYYY
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
};

// Context menu state type
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  taskId: string | null;
}

type SortField =
  | 'appraisalReportNo'
  | 'customerName'
  | 'taskType'
  | 'purpose'
  | 'propertyType'
  | 'status'
  | 'appointmentDate'
  | 'requestDate'
  | 'movement'
  | 'ola'
  | 'olaActual'
  | 'olaDifference'
  | 'priority';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

// Group by options for Kanban view
const groupByOptions: { value: GroupByField; label: string }[] = [
  { value: 'kanbanStatus', label: 'Task Status' },
  { value: 'status', label: 'Appraisal Status' },
  { value: 'purpose', label: 'Purpose' },
  { value: 'taskType', label: 'Task Type' },
  { value: 'priority', label: 'Priority' },
];

function TaskListingPage() {
  const navigate = useNavigate();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Group by state for Kanban view
  const [groupBy, setGroupBy] = useState<GroupByField>('kanbanStatus');

  // Pagination state (for list view)
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');

  // Sorting state (for list view)
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    taskId: null,
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when filters or sorting change
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, statusFilter, taskTypeFilter, propertyTypeFilter, sortField, sortDirection]);

  // Build request params for list view
  const listRequestParams = {
    pageNumber,
    pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    taskType: taskTypeFilter || undefined,
    propertyType: propertyTypeFilter || undefined,
    sortBy: sortField ?? undefined,
    sortDirection: sortField ? sortDirection : undefined,
  };

  // Build request params for Kanban view (no pagination)
  const kanbanRequestParams = {
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    taskType: taskTypeFilter || undefined,
    propertyType: propertyTypeFilter || undefined,
  };

  // Fetch tasks for list view
  const {
    data: listData,
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
  } = useGetTasks(listRequestParams);

  // Fetch tasks for Kanban view
  const {
    data: kanbanTasks,
    isLoading: isKanbanLoading,
    isError: isKanbanError,
    error: kanbanError,
  } = useGetTasksForKanban(kanbanRequestParams);

  // Add minimum loading delay for better UX
  const [minLoadingDone, setMinLoadingDone] = useState(true);

  useEffect(() => {
    const isCurrentLoading = viewMode === 'list' ? isListLoading : isKanbanLoading;
    if (isCurrentLoading) {
      setMinLoadingDone(false);
      setTimeout(() => {
        setMinLoadingDone(true);
      }, 500);
    }
  }, [isListLoading, isKanbanLoading, viewMode]);

  const isLoading = (viewMode === 'list' ? isListLoading : isKanbanLoading) || !minLoadingDone;
  const isError = viewMode === 'list' ? isListError : isKanbanError;
  const error = viewMode === 'list' ? listError : kanbanError;

  // Extract paginated result for list view
  const paginatedResult = listData?.result ?? listData;
  const listTasks = (paginatedResult?.items ?? []) as Task[];
  const totalCount = paginatedResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleDoubleClick = (taskId: string) => {
    navigate(`/appraisal/${taskId}`);
  };

  const handleContextMenu = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      taskId,
    });
  };

  const handleContextMenuAction = (action: 'open' | 'copyReportNo') => {
    if (!contextMenu.taskId) return;
    const task = listTasks.find(t => t.id === contextMenu.taskId);
    switch (action) {
      case 'open':
        navigate(`/appraisal/${contextMenu.taskId}`);
        break;
      case 'copyReportNo':
        if (task) {
          navigator.clipboard.writeText(task.appraisalReportNo);
        }
        break;
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleSort = (field: SortField) => {
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <Icon style="solid" name="sort" className="size-3 text-gray-300" />;
    }
    return (
      <Icon
        style="solid"
        name={sortDirection === 'asc' ? 'sort-up' : 'sort-down'}
        className="size-3 text-primary"
      />
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTaskTypeFilter('');
    setPropertyTypeFilter('');
  };

  const hasFilters = searchTerm || statusFilter || taskTypeFilter || propertyTypeFilter;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">Failed to load tasks</p>
        <p className="text-sm text-gray-400">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon style="solid" name="grid-2" className="size-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 border-l border-gray-200 transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon style="solid" name="list" className="size-3.5" />
              List
            </button>
          </div>

          {/* Group By Dropdown (only for Grid view) */}
          {viewMode === 'grid' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Group by:</span>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value as GroupByField)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
              >
                {groupByOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <Button size="sm" onClick={() => navigate('/dev/request')}>
          <Icon style="solid" name="plus" className="size-3.5 mr-1.5" />
          New request
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 flex items-center gap-3 pb-1">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Icon
            style="solid"
            name="magnifying-glass"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search appraisal report..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>

        {/* Filters Button */}
        <button className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
          <Icon style="solid" name="filter" className="size-3.5" />
          FILTERS
        </button>

        {/* Clear Filters */}
        {hasFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <Icon style="solid" name="xmark" className="size-3" />
            Clear
          </button>
        )}
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        // List View
        <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="table table-sm table-pin-rows min-w-max">
              <thead>
                <tr className="border-b border-gray-200">
                  <th
                    onClick={() => handleSort('appraisalReportNo')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap bg-gray-50 sticky left-0 z-20 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full"
                  >
                    <div className="flex items-center gap-1.5">
                      Appraisal Number
                      <SortIcon field="appraisalReportNo" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('customerName')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Customer Name
                      <SortIcon field="customerName" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('taskType')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Task Type
                      <SortIcon field="taskType" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('purpose')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Purpose
                      <SortIcon field="purpose" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('propertyType')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Property Type
                      <SortIcon field="propertyType" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Status
                      <SortIcon field="status" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('appointmentDate')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Appointment Date
                      <SortIcon field="appointmentDate" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('requestDate')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Request Date
                      <SortIcon field="requestDate" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('movement')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Movement
                      <SortIcon field="movement" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('ola')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      OLA
                      <SortIcon field="ola" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('olaActual')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      OLA (Actual)
                      <SortIcon field="olaActual" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('olaDifference')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      OLA (Difference)
                      <SortIcon field="olaDifference" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('priority')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Priority
                      <SortIcon field="priority" />
                    </div>
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <TableRowSkeleton
                    columns={[
                      { width: 'w-28' },
                      { width: 'w-32' },
                      { width: 'w-28' },
                      { width: 'w-32' },
                      { width: 'w-28' },
                      { width: 'w-16' },
                      { width: 'w-24' },
                      { width: 'w-24' },
                      { width: 'w-20' },
                      { width: 'w-12' },
                      { width: 'w-16' },
                      { width: 'w-20' },
                      { width: 'w-16' },
                      { width: 'w-8' },
                    ]}
                    rows={5}
                  />
                ) : listTasks.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Icon
                          style="regular"
                          name="folder-open"
                          className="size-10 text-gray-300"
                        />
                        <p className="text-gray-500 font-medium">No tasks found</p>
                        <p className="text-xs text-gray-400">
                          {hasFilters ? 'Try different filters' : 'No tasks assigned yet'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  listTasks.map(task => (
                    <tr
                      key={task.id}
                      onDoubleClick={() => handleDoubleClick(task.id)}
                      onContextMenu={e => handleContextMenu(e, task.id)}
                      className="hover:bg-gray-50 cursor-default transition-colors"
                      title="Double-click to open, right-click for more options"
                    >
                      <td className="bg-white sticky left-0 z-10 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full">
                        <div>
                          <span
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/appraisal/${task.id}`);
                            }}
                            className="font-medium text-primary hover:underline cursor-pointer"
                          >
                            {task.appraisalReportNo}
                          </span>
                          {task.referenceNo && (
                            <span className="text-xs text-gray-400 block font-normal">
                              (Ref. {task.referenceNo})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{task.customerName}</td>
                      <td className="px-3 py-2.5 text-gray-600">{task.taskType}</td>
                      <td className="px-3 py-2.5 text-gray-600">{task.purpose}</td>
                      <td className="px-3 py-2.5 text-gray-600">{task.propertyType}</td>
                      <td className="px-3 py-2.5">
                        <Badge type="status" value={task.status} size="sm" />
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {formatDate(task.appointmentDate)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{formatDate(task.requestDate)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{task.movement || '-'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{task.ola ?? '-'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{task.olaActual ?? '-'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{task.olaDifference ?? '-'}</td>
                      <td className="px-3 py-2.5">
                        <Badge type="priority" value={task.priority} size="sm" />
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            // Action menu placeholder
                          }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                          <Icon style="solid" name="ellipsis-vertical" className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
        // Grid View - Kanban Board
        <div className="flex-1 min-h-0">
          <TaskKanbanBoard tasks={kanbanTasks || []} groupBy={groupBy} isLoading={isLoading} />
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => handleContextMenuAction('open')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Icon style="regular" name="folder-open" className="size-4" />
            Open
          </button>
          <button
            onClick={() => handleContextMenuAction('copyReportNo')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Icon style="regular" name="copy" className="size-4" />
            Copy Report No.
          </button>
        </div>
      )}
    </div>
  );
}

export default TaskListingPage;
