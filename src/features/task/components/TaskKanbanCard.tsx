import type { Task } from '../types';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import { format, isToday, isYesterday } from 'date-fns';

interface TaskKanbanCardProps {
  task: Task;
  onClick?: () => void;
}

// Purpose badge colors
const purposeColors: Record<string, { bg: string; text: string }> = {
  'Request for credit limit': { bg: 'bg-emerald-500', text: 'text-white' },
  'Request to review': { bg: 'bg-blue-500', text: 'text-white' },
  Refinance: { bg: 'bg-purple-500', text: 'text-white' },
  'New Loan': { bg: 'bg-amber-500', text: 'text-white' },
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const time = format(date, 'h.mm a');

  if (isToday(date)) {
    return `Today ${time}`;
  }
  if (isYesterday(date)) {
    return `Yesterday ${time}`;
  }
  return format(date, 'dd MMM yyyy');
};

export const TaskKanbanCard = ({ task, onClick }: TaskKanbanCardProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const purposeColor = purposeColors[task.purpose] || { bg: 'bg-gray-500', text: 'text-white' };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {/* Header with badges and menu */}
      <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Purpose Badge */}
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded ${purposeColor.bg} ${purposeColor.text}`}
          >
            {task.purpose}
          </span>
          {/* Application Status Badge */}
          <Badge type="status" value={task.status} size="sm" />
        </div>
        {/* Menu Button */}
        <button
          onClick={e => e.stopPropagation()}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Icon style="solid" name="ellipsis-vertical" className="size-4" />
        </button>
      </div>

      {/* Customer Name & Date */}
      <div className="px-3 pb-2">
        <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{task.customerName}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(task.createdAt)}</p>
      </div>

      {/* Details Grid */}
      <div className="px-3 pb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {/* Row 1 */}
        <div className="flex items-center gap-1.5 text-gray-600">
          <Icon style="regular" name="file-lines" className="size-3.5 text-gray-400" />
          <span className="truncate">{task.appraisalReportNo}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Icon style="regular" name="clipboard-list" className="size-3.5 text-gray-400" />
          <span className="truncate">{task.taskType}</span>
        </div>

        {/* Row 2 */}
        <div className="flex items-center gap-1.5 text-gray-600">
          <Icon style="regular" name="building" className="size-3.5 text-gray-400" />
          <span className="truncate">{task.propertyType}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Icon style="regular" name="clock" className="size-3.5 text-gray-400" />
          <span className="truncate">{task.timeInfo || '-'}</span>
        </div>

        {/* Row 3 */}
        <div className="flex items-center gap-1.5 text-gray-600">
          <Icon style="regular" name="flag" className="size-3.5 text-gray-400" />
          <span className="truncate">{task.priority}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Icon style="regular" name="share" className="size-3.5 text-gray-400" />
          <span className="truncate">{task.action}</span>
        </div>
      </div>

      {/* Footer with assignee and comments */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between">
        {/* Assignee */}
        {task.assignee ? (
          <div className="flex items-center gap-2">
            {task.assignee.avatar ? (
              <img
                src={task.assignee.avatar}
                alt={task.assignee.name}
                className="size-6 rounded-full object-cover"
              />
            ) : (
              <div className="size-6 rounded-full bg-gray-200 flex items-center justify-center">
                <Icon style="solid" name="user" className="size-3 text-gray-500" />
              </div>
            )}
          </div>
        ) : (
          <div className="size-6" />
        )}

        {/* Comments */}
        {task.commentCount > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <Icon style="regular" name="comment" className="size-3.5" />
            <span className="text-xs">{task.commentCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};
