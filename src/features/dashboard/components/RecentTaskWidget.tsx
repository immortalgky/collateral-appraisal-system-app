import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';
import type { RecentTask } from '../types';
import { useRecentTasks } from '../api';

type StatusBadgeProps = {
  status: RecentTask['status'];
};

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    pending: { label: 'Pending', dotColor: 'bg-amber-400', textColor: 'text-amber-600', bgColor: 'bg-amber-50' },
    draft: { label: 'Draft', dotColor: 'bg-blue-400', textColor: 'text-blue-600', bgColor: 'bg-blue-50' },
    completed: { label: 'Completed', dotColor: 'bg-emerald-400', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <span className={`size-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}

type RecentTaskWidgetProps = {
  tasks?: RecentTask[];
};

function RecentTaskWidget({ tasks }: RecentTaskWidgetProps) {
  const { data: apiData } = useRecentTasks(5);

  const taskData: RecentTask[] = tasks || (apiData?.items || []).map((item) => ({
    id: item.id,
    reportNo: item.appraisalNumber || '-',
    customerName: item.customerName || '-',
    taskType: item.taskType || '',
    taskDescription: item.taskDescription || '',
    purpose: item.purpose || '-',
    status: (item.status?.toLowerCase() === 'completed' ? 'completed' : item.status?.toLowerCase() === 'draft' ? 'draft' : 'pending') as RecentTask['status'],
    requestDate: item.requestedAt ? new Date(item.requestedAt).toLocaleDateString() : '-',
  }));

  return (
    <WidgetWrapper id="recent-task">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Task</h3>
          <a href="/tasks" className="text-blue-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1.5 transition-colors">
            View All
            <Icon name="arrow-up-right-from-square" style="solid" className="size-3" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Appraisal Report No
                    <Icon name="sort" style="solid" className="size-3 text-gray-300" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer Name
                    <Icon name="sort" style="solid" className="size-3 text-gray-300" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Task Type
                    <Icon name="sort" style="solid" className="size-3 text-gray-300" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Purpose
                    <Icon name="sort" style="solid" className="size-3 text-gray-300" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                    <Icon name="sort" style="solid" className="size-3 text-gray-300" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {taskData.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{task.reportNo}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{task.customerName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{task.taskDescription || task.taskType || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{task.purpose}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={task.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default RecentTaskWidget;
