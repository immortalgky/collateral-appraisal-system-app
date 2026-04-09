import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetTasks, useGetTasksForKanban } from '../api';
import type { GroupByField, Task, TaskFilterParams, TaskListResponse } from '../types';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { TaskKanbanBoard } from '../components/TaskKanbanBoard';
import { TaskFilterDialog } from '../components/TaskFilterDialog';
import { format } from 'date-fns';
import ParameterDisplay from '@/shared/components/ParameterDisplay';

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
  | 'appraisalNumber'
  | 'customerName'
  | 'taskType'
  | 'purpose'
  | 'propertyType'
  | 'status'
  | 'appointmentDateTime'
  | 'requestedBy'
  | 'assignedDate'
  | 'movement'
  | 'dueAt'
  | 'elapsedHours'
  | 'remainingHours'
  | 'slaStatus'
  | 'priority';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

// Column definition — render returns the cell content (not a <td>).
// The <td> wrapper is created in the row loop.
type ColumnDef = {
  label: string;
  sortField?: SortField;
  render: (task: Task) => ReactNode;
};

const columnDefs: Record<ColumnKey, ColumnDef> = {
  appraisalNumber: {
    label: 'Appraisal Number',
    sortField: 'appraisalNumber',
    // Rendered specially in the row (sticky + click handler)
    render: (task) => task.appraisalNumber ?? '-',
  },
  customerName: {
    label: 'Customer Name',
    sortField: 'customerName',
    render: (task) => task.customerName ?? '-',
  },
  taskType: {
    label: 'Task Type',
    sortField: 'taskType',
    render: (task) => task.taskDescription || task.taskType || '-',
  },
  purpose: {
    label: 'Purpose',
    sortField: 'purpose',
    render: (task) => <ParameterDisplay group="AppraisalPurpose" code={task.purpose} />,
  },
  propertyType: {
    label: 'Property Type',
    sortField: 'propertyType',
    render: (task) => <ParameterDisplay group="PropertyType" code={task.propertyType} />,
  },
  status: {
    label: 'Status',
    sortField: 'status',
    render: (task) => <Badge type="status" value={task.status} size="sm" />,
  },
  appointmentDate: {
    label: 'Appointment Date',
    sortField: 'appointmentDateTime',
    render: (task) => formatDate(task.appointmentDateTime),
  },
  requestedBy: {
    label: 'Requested By',
    render: (task) => task.requestedBy ?? '-',
  },
  internalFollowupStaff: {
    label: 'Internal Followup Staff',
    render: (task) => task.internalFollowupStaff ?? '-',
  },
  requestReceivedDate: {
    label: 'Request Received Date',
    sortField: 'requestReceivedDate',
    render: (task) => formatDate(task.requestReceivedDate),
  },
  appraiser: {
    label: 'Appraiser',
    render: (task) => task.appraiser ?? '-',
  },
  assignedDate: {
    label: 'Assigned Date',
    sortField: 'assignedDate',
    render: (task) => formatDate(task.assignedDate),
  },
  movement: {
    label: 'Movement',
    sortField: 'movement',
    render: (task) => task.movement || '-',
  },
  slaDueAt: {
    label: 'SLA Due',
    render: (task) => formatDate(task.dueAt),
  },
  slaElapsedHours: {
    label: 'SLA Elapsed (hrs)',
    render: (task) => task.elapsedHours ?? '-',
  },
  slaRemainingHours: {
    label: 'SLA Remaining (hrs)',
    render: (task) => task.remainingHours ?? '-',
  },
  priority: {
    label: 'Priority',
    sortField: 'priority',
    render: (task) => <Badge type="priority" value={task.priority} size="sm" />,
  },
};

// Group by options for Kanban view
const groupByOptions: { value: GroupByField; label: string }[] = [
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
  const [groupBy, setGroupBy] = useState<GroupByField>('status');

  // Pagination state (for list view)
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting state (for list view)
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter dialog state
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilterParams>({});

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

  // Reset to first page when sorting, search, or filters change
  useEffect(() => {
    setPageNumber(0);
  }, [sortField, sortDirection, searchTerm, filters]);

  // Build request params for list view
  const listRequestParams = {
    pageNumber,
    pageSize,
    taskName: searchTerm || undefined,
    sortBy: sortField ?? undefined,
    sortDir: sortDirection,
    ...filters,
  };

  // Build request params for Kanban view (no pagination)
  const kanbanRequestParams = {
    taskName: searchTerm || undefined,
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

  // Extract paginated result for the list view
  const paginatedResult: TaskListResponse | undefined = listData;
  const listTasks = (paginatedResult?.items ?? []) as Task[];
  const totalCount = paginatedResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleDoubleClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
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
    const task = listTasks.find(t => t.taskId === contextMenu.taskId);
    switch (action) {
      case 'open':
        navigate(`/tasks/${contextMenu.taskId}`);
        break;
      case 'copyReportNo':
        if (task && task.appraisalNumber) {
          navigator.clipboard.writeText(task.appraisalNumber);
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
    setFilters({});
  };

  const hasFilters = !!searchTerm || Object.keys(filters).some(k => filters[k as keyof TaskFilterParams]);

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
      {/* Page Title */}
      <div className="shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Tasks</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            {totalCount}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">View and manage your assigned tasks</p>
      </div>

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
            placeholder="Search by appraisal number or customer name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>

        {/* Filter button */}
        <button
          onClick={() => setFilterDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          <Icon style="solid" name="filter" className="size-3.5" />
          Filter
          {Object.keys(filters).some(k => filters[k as keyof TaskFilterParams]) && (
            <span className="size-1.5 rounded-full bg-primary" />
          )}
        </button>

        {/* Clear all */}
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

      <TaskFilterDialog
        open={filterDialogOpen}
        initialValues={filters}
        onApply={v => setFilters(v)}
        onClose={() => setFilterDialogOpen(false)}
      />

      {/* Content */}
      {viewMode === 'list' ? (
        // List View
        <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="table table-sm min-w-max">
              <thead className="sticky top-0 z-20 bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th
                    onClick={() => handleSort('appraisalNumber')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap bg-gray-50 sticky left-0 z-30 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full"
                  >
                    <div className="flex items-center gap-1.5">
                      Appraisal Number
                      <SortIcon field="appraisalNumber" />
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
                    onClick={() => handleSort('appointmentDateTime')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Appointment Date
                      <SortIcon field="appointmentDateTime" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('requestedAt')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      Request Date
                      <SortIcon field="requestedAt" />
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
                    onClick={() => handleSort('slaDays')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      OLA
                      <SortIcon field="slaDays" />
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
                    onClick={() => handleSort('olaDiff')}
                    className="text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      OLA (Difference)
                      <SortIcon field="olaDiff" />
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
                      onDoubleClick={() => handleDoubleClick(task.taskId)}
                      onContextMenu={e => handleContextMenu(e, task.taskId)}
                      className="hover:bg-gray-50 cursor-default transition-colors"
                      title="Double-click to open, right-click for more options"
                    >
                      <td className="bg-white sticky left-0 z-10 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full">
                        <div>
                          <span
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/tasks/${task.taskId}`);
                            }}
                            className="font-medium text-primary hover:underline cursor-pointer"
                          >
                            {task.appraisalNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{task.customerName}</td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {task.taskDescription || task.taskType}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {<ParameterDisplay group="AppraisalPurpose" code={task.purpose} />}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {<ParameterDisplay group="PropertyType" code={task.propertyType} />}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge type="status" value={task.status} size="sm" />
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {formatDate(task.appointmentDateTime ?? undefined)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {formatDate(task.requestedAt ?? undefined)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{task.movement || '-'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{task.slaDays ?? '-'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{task.olaActual ?? '-'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{task.olaDiff ?? '-'}</td>
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
