import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetTasks } from '../api';
import type { Task, TaskListResponse } from '../types';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { format } from 'date-fns';
import ParameterDisplay from '@/shared/components/ParameterDisplay';

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
};

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  taskId: string | null;
}

export type ActivityColumnKey =
  | 'appraisalNumber'
  | 'customerName'
  | 'taskType'
  | 'purpose'
  | 'propertyType'
  | 'status'
  | 'appointmentDateTime'
  | 'requestedBy'
  | 'requestReceivedDate'
  | 'internalFollowupStaff'
  | 'appraiser'
  | 'assignedDate'
  | 'movement'
  | 'priority'
  | 'dueAt'
  | 'slaStatus'
  | 'elapsedHours'
  | 'remainingHours';

export interface ActivityColumnDef {
  key: ActivityColumnKey;
  label: string;
}

type SortField = ActivityColumnKey;
type SortDirection = 'asc' | 'desc';

interface ActivityTaskTableProps {
  activityId: string;
  title: string;
  description: string;
  columns: ActivityColumnDef[];
}

export function ActivityTaskTable({
  activityId,
  title,
  description,
  columns,
}: ActivityTaskTableProps) {
  const navigate = useNavigate();

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    taskId: null,
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setPageNumber(0);
  }, [sortField, sortDirection, searchTerm]);

  const { data, isLoading, isError, error } = useGetTasks({
    pageNumber,
    pageSize,
    taskName: searchTerm || undefined,
    activityId,
    sortBy: sortField ?? undefined,
    sortDir: sortDirection,
  });

  const [minLoadingDone, setMinLoadingDone] = useState(true);
  useEffect(() => {
    if (isLoading) {
      setMinLoadingDone(false);
      setTimeout(() => setMinLoadingDone(true), 500);
    }
  }, [isLoading]);

  const loading = isLoading || !minLoadingDone;

  const paginatedResult: TaskListResponse | undefined = data;
  const listTasks = (paginatedResult?.items ?? []) as Task[];
  const totalCount = paginatedResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const hasFilters = !!searchTerm;

  const handleDoubleClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleContextMenu = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, taskId });
  };

  const handleContextMenuAction = (action: 'open' | 'copyReportNo') => {
    if (!contextMenu.taskId) return;
    const task = listTasks.find(t => t.taskId === contextMenu.taskId);
    if (action === 'open') {
      navigate(`/tasks/${contextMenu.taskId}`);
    } else if (action === 'copyReportNo' && task?.appraisalNumber) {
      navigator.clipboard.writeText(task.appraisalNumber);
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

  const renderCell = (task: Task, key: ActivityColumnKey) => {
    switch (key) {
      case 'appraisalNumber':
        return (
          <td
            key={key}
            className="bg-white sticky left-0 z-10 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full"
          >
            <span
              onClick={e => {
                e.stopPropagation();
                navigate(`/tasks/${task.taskId}`);
              }}
              className="font-medium text-primary hover:underline cursor-pointer"
            >
              {task.appraisalNumber}
            </span>
          </td>
        );
      case 'customerName':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {task.customerName}
          </td>
        );
      case 'taskType':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {task.taskDescription || task.taskType}
          </td>
        );
      case 'purpose':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            <ParameterDisplay group="AppraisalPurpose" code={task.purpose} />
          </td>
        );
      case 'propertyType':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            <ParameterDisplay group="PropertyType" code={task.propertyType} />
          </td>
        );
      case 'status':
        return (
          <td key={key} className="px-3 py-2.5">
            <Badge type="status" value={task.status} size="sm" />
          </td>
        );
      case 'appointmentDateTime':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {formatDate(task.appointmentDateTime ?? undefined)}
          </td>
        );
      case 'requestedBy':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {task.requestedBy ?? '-'}
          </td>
        );
      case 'requestReceivedDate':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {formatDate(task.requestReceivedDate ?? undefined)}
          </td>
        );
      case 'internalFollowupStaff':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {task.internalFollowupStaff ?? '-'}
          </td>
        );
      case 'appraiser':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {task.appraiser ?? '-'}
          </td>
        );
      case 'assignedDate':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {formatDate(task.assignedDate ?? undefined)}
          </td>
        );
      case 'movement':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {task.movement || '-'}
          </td>
        );
      case 'priority':
        return (
          <td key={key} className="px-3 py-2.5">
            <Badge type="priority" value={task.priority} size="sm" />
          </td>
        );
      case 'dueAt':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {formatDate(task.dueAt ?? undefined)}
          </td>
        );
      case 'slaStatus':
        return (
          <td key={key} className="px-3 py-2.5">
            <Badge type="status" value={task.slaStatus} size="sm" />
          </td>
        );
      case 'elapsedHours':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {task.elapsedHours != null ? `${task.elapsedHours}h` : '-'}
          </td>
        );
      case 'remainingHours':
        return (
          <td key={key} className="px-3 py-2.5 text-gray-600">
            {task.remainingHours != null ? `${task.remainingHours}h` : '-'}
          </td>
        );
      default:
        return <td key={key} className="px-3 py-2.5 text-gray-600">-</td>;
    }
  };

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
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            {totalCount}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 flex items-center gap-3 pb-1">
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
        {hasFilters && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <Icon style="solid" name="xmark" className="size-3" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="table table-sm min-w-max">
            <thead className="sticky top-0 z-20 bg-gray-50">
              <tr className="border-b border-gray-200">
                {columns.map((col, idx) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap bg-gray-50${
                      idx === 0
                        ? ' sticky left-0 z-30 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      <SortIcon field={col.key} />
                    </div>
                  </th>
                ))}
                <th className="text-left font-medium text-gray-600 px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableRowSkeleton
                  columns={columns.map(() => ({ width: 'w-24' }))}
                  rows={5}
                />
              ) : listTasks.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
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
                    {columns.map(col => renderCell(task, col.key))}
                    <td className="px-3 py-2.5">
                      <button
                        onClick={e => e.stopPropagation()}
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
