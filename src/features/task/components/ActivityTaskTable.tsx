import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetTasks } from '../api';
import type { Task, TaskListResponse } from '../types';
import { columnDefs } from '../config/columnDefs';
import type { ColumnKey } from '../config/columnDefs';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';

type SortDirection = 'asc' | 'desc';

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
  columns: ColumnKey[];
}

// Shared th class builders
const stickyThClass =
  'text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap bg-gray-50 sticky left-0 z-30 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full';
const sortableThClass =
  'text-left font-medium text-gray-600 px-3 py-2.5 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap';
const plainThClass = 'text-left font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap';

const stickyTdClass =
  'bg-white sticky left-0 z-10 px-3 py-2.5 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full';
const defaultTdClass = 'px-3 py-2.5 text-gray-600';

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
  const [sortField, setSortField] = useState<string | null>(null);
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
        setContextMenu((prev) => ({ ...prev, visible: false }));
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

  const handleContextMenuAction = (action: 'open' | 'copyReportNo') => {
    if (!contextMenu.taskId) return;
    const task = listTasks.find((t) => t.taskId === contextMenu.taskId);
    if (action === 'open') {
      navigate(`/tasks/${contextMenu.taskId}`);
    } else if (action === 'copyReportNo' && task?.appraisalNumber) {
      navigator.clipboard.writeText(task.appraisalNumber);
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
                {columns.map((key) => {
                  const col = columnDefs[key];
                  const thClass = col.sticky
                    ? stickyThClass
                    : col.sortField
                      ? sortableThClass
                      : plainThClass;
                  return (
                    <th
                      key={key}
                      onClick={col.sortField ? () => handleSort(col.sortField!) : undefined}
                      className={thClass}
                    >
                      {col.sortField ? (
                        <div className="flex items-center gap-1.5">
                          {col.label}
                          <SortIcon field={col.sortField} />
                        </div>
                      ) : (
                        col.label
                      )}
                    </th>
                  );
                })}
                <th className="text-left font-medium text-gray-600 px-3 py-2.5 w-10" />
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
                listTasks.map((task) => (
                  <tr
                    key={task.id}
                    onDoubleClick={() => navigate(`/tasks/${task.taskId}`)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, taskId: task.taskId });
                    }}
                    className="hover:bg-gray-50 cursor-default transition-colors"
                    title="Double-click to open, right-click for more options"
                  >
                    {columns.map((key) => {
                      const col = columnDefs[key];
                      const tdClass = col.sticky
                        ? stickyTdClass
                        : (col.tdClassName ?? defaultTdClass);
                      return (
                        <td key={key} className={tdClass}>
                          {col.render(task)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5">
                      <button
                        onClick={(e) => e.stopPropagation()}
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
          onPageSizeChange={(size) => {
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
