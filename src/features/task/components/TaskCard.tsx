import type { Task } from '../types';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <span className="font-semibold text-gray-900 text-sm">{task.appraisalReportNo}</span>
          {task.referenceNo && (
            <span className="text-xs text-gray-500 ml-1">(Ref. {task.referenceNo})</span>
          )}
        </div>
        <Badge type="status" value={task.status} size="sm" />
      </div>

      {/* Card Body */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Customer Name */}
        <div className="flex items-start gap-2">
          <Icon
            style="regular"
            name="user"
            className="size-3.5 text-gray-400 mt-0.5 flex-shrink-0"
          />
          <span className="text-sm text-gray-900 font-medium line-clamp-1">
            {task.customerName}
          </span>
        </div>

        {/* Task Type */}
        <div className="flex items-start gap-2">
          <Icon
            style="regular"
            name="clipboard-list"
            className="size-3.5 text-gray-400 mt-0.5 flex-shrink-0"
          />
          <span className="text-sm text-gray-600 line-clamp-1">{task.taskType}</span>
        </div>

        {/* Purpose */}
        <div className="flex items-start gap-2">
          <Icon
            style="regular"
            name="bullseye"
            className="size-3.5 text-gray-400 mt-0.5 flex-shrink-0"
          />
          <span className="text-sm text-gray-600 line-clamp-1">{task.purpose}</span>
        </div>

        {/* Property Type */}
        <div className="flex items-start gap-2">
          <Icon
            style="regular"
            name="building"
            className="size-3.5 text-gray-400 mt-0.5 flex-shrink-0"
          />
          <span className="text-sm text-gray-600">{task.propertyType}</span>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {new Date(task.createdAt).toLocaleDateString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <button
          onClick={e => {
            e.stopPropagation();
            onClick?.();
          }}
          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
        >
          View Details
          <Icon style="solid" name="arrow-right" className="size-3" />
        </button>
      </div>
    </div>
  );
};
