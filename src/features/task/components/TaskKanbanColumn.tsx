import type { Task } from '../types';
import Icon from '@/shared/components/Icon';
import { TaskKanbanCard } from './TaskKanbanCard';
import { CardSkeleton } from '@/shared/components/Skeleton';

interface TaskKanbanColumnProps {
  title: string;
  tasks: Task[];
  count: number;
  color: 'blue' | 'yellow' | 'red' | 'green' | 'gray' | 'purple' | 'emerald' | 'amber';
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
}

// Column header dot colors
const dotColors: Record<string, string> = {
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  gray: 'bg-gray-400',
  purple: 'bg-purple-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
};

export const TaskKanbanColumn = ({
  title,
  tasks,
  count,
  color,
  isLoading = false,
  onTaskClick,
}: TaskKanbanColumnProps) => {
  return (
    <div className="flex flex-col min-w-[320px] max-w-[360px] h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${dotColors[color]}`} />
          <h3 className="font-medium text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">{count}</span>
        </div>
        <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          <Icon style="solid" name="ellipsis-vertical" className="size-4" />
        </button>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Icon style="regular" name="inbox" className="size-8 mb-2" />
            <p className="text-sm">No tasks</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskKanbanCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
          ))
        )}
      </div>
    </div>
  );
};
