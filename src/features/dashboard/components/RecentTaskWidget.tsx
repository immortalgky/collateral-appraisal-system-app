import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Icon from '@shared/components/Icon';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import TaskRow from '@/features/task/components/TaskRow';
import { useGetTasks } from '@/features/task/api';
import type { Task } from '@/features/task/types';

const RECENT_TASKS_PARAMS = {
  pageNumber: 0,
  pageSize: 10,
  sortBy: 'RequestReceivedDate',
  sortDir: 'desc' as const,
};

const SKELETON_COLUMNS = [
  { width: 'w-28' },
  { width: 'w-32' },
  { width: 'w-24' },
  { width: 'w-20' },
  { width: 'w-16' },
];

type SortKey = 'appraisalNumber' | 'customerName' | 'taskType' | 'purpose';
type SortDirection = 'asc' | 'desc';

type SortableColumn = { key: SortKey; label: string; sticky?: boolean };
const SORTABLE_COLUMNS: SortableColumn[] = [
  { key: 'appraisalNumber', label: 'Appraisal No.', sticky: true },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'taskType', label: 'Task Type' },
  { key: 'purpose', label: 'Purpose' },
];

function compareBy(items: Task[], key: SortKey, dir: SortDirection): Task[] {
  return [...items].sort((a, b) => {
    const av = (a[key as keyof Task] ?? '') as string;
    const bv = (b[key as keyof Task] ?? '') as string;
    if (!av && bv) return 1;
    if (av && !bv) return -1;
    if (!av && !bv) return 0;
    const cmp = String(av).localeCompare(String(bv));
    return dir === 'asc' ? cmp : -cmp;
  });
}

function RecentTaskWidget() {
  const { data, isLoading, dataUpdatedAt } = useGetTasks(RECENT_TASKS_PARAMS);
  const rawTasks = data?.items ?? [];

  const [sortField, setSortField] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const tasks = useMemo(
    () => (sortField ? compareBy(rawTasks, sortField, sortDirection) : rawTasks),
    [rawTasks, sortField, sortDirection],
  );

  const handleSort = (key: SortKey) => {
    if (sortField === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(key);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
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

  const updatedLabel = dataUpdatedAt
    ? formatDistanceToNow(dataUpdatedAt, { addSuffix: false })
    : null;

  return (
    <WidgetWrapper id="recent-task">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Task</h3>
          <div className="flex items-center gap-3">
            {updatedLabel && (
              <span className="text-xs text-gray-400">Updated {updatedLabel} ago</span>
            )}
            <a
              href="/tasks"
              className="text-blue-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1.5 transition-colors"
            >
              View All
              <Icon name="arrow-up-right-from-square" style="solid" className="size-3" />
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                {SORTABLE_COLUMNS.map(col => {
                  const isActive = sortField === col.key;
                  const base =
                    'px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap select-none cursor-pointer hover:text-gray-600 bg-gray-50';
                  const stickyExtra = col.sticky
                    ? ' sticky left-0 z-10 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-200'
                    : '';
                  const activeColor = isActive ? ' text-primary' : ' text-gray-500';
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`${base}${stickyExtra}${activeColor}`}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.key} />
                      </div>
                    </th>
                  );
                })}
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableRowSkeleton columns={SKELETON_COLUMNS} rows={10} />
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <Icon style="regular" name="inbox" className="size-5 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400">No recent tasks yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map(task => <TaskRow key={task.id} task={task} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default RecentTaskWidget;
