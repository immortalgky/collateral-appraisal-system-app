import Icon from '@shared/components/Icon';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import TaskRow from '@/features/task/components/TaskRow';
import { useGetTasks } from '@/features/task/api';

const RECENT_TASKS_PARAMS = {
  pageNumber: 0,
  pageSize: 5,
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

function RecentTaskWidget() {
  const { data, isLoading } = useGetTasks(RECENT_TASKS_PARAMS);
  const tasks = data?.items ?? [];

  return (
    <WidgetWrapper id="recent-task">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Task</h3>
          <a
            href="/tasks"
            className="text-blue-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1.5 transition-colors"
          >
            View All
            <Icon name="arrow-up-right-from-square" style="solid" className="size-3" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-white after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-100">
                  Appraisal No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Task Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Purpose
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableRowSkeleton columns={SKELETON_COLUMNS} rows={5} />
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <Icon style="regular" name="inbox" className="size-5 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400">No recent tasks.</p>
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
