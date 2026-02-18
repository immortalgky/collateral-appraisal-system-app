import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task, GroupByField } from '../types';
import { TaskStatus, TaskPurpose, TaskType, TaskPriority } from '../types';
import { TaskKanbanColumn } from './TaskKanbanColumn';

interface TaskKanbanBoardProps {
  tasks: Task[];
  groupBy: GroupByField;
  isLoading?: boolean;
}

// Configuration for each grouping field
const groupConfigs: Record<
  GroupByField,
  {
    values: readonly string[];
    colors: Record<
      string,
      'blue' | 'yellow' | 'red' | 'green' | 'gray' | 'purple' | 'emerald' | 'amber'
    >;
    getTaskValue: (task: Task) => string;
  }
> = {
  status: {
    values: Object.values(TaskStatus),
    colors: {
      Draft: 'amber',
      Pending: 'purple',
      InProgress: 'blue',
      Completed: 'green',
      Cancelled: 'gray',
    },
    getTaskValue: task => task.status ?? '',
  },
  purpose: {
    values: Object.values(TaskPurpose),
    colors: {
      'Request for credit limit': 'emerald',
      'Request to review': 'blue',
      Refinance: 'purple',
      'New Loan': 'amber',
    },
    getTaskValue: task => task.purpose ?? '',
  },
  taskType: {
    values: Object.values(TaskType),
    colors: {
      'Route Back Follow Up': 'blue',
      'New Appraisal': 'green',
      Review: 'yellow',
      Revision: 'red',
    },
    getTaskValue: task => task.taskType ?? '',
  },
  priority: {
    values: Object.values(TaskPriority),
    colors: {
      High: 'red',
      Medium: 'yellow',
      Low: 'green',
    },
    getTaskValue: task => task.priority ?? '',
  },
};

export const TaskKanbanBoard = ({ tasks, groupBy, isLoading = false }: TaskKanbanBoardProps) => {
  const navigate = useNavigate();
  const config = groupConfigs[groupBy];

  // Group tasks by the selected field
  const groupedTasks = useMemo(() => {
    const currentConfig = groupConfigs[groupBy];
    const groups: Record<string, Task[]> = {};

    // Initialize all groups with empty arrays
    for (const value of currentConfig.values) {
      groups[value] = [];
    }

    // Distribute tasks into groups
    for (const task of tasks) {
      const groupValue = currentConfig.getTaskValue(task);
      if (groups[groupValue]) {
        groups[groupValue].push(task);
      }
    }

    return groups;
  }, [tasks, groupBy]);

  const handleTaskClick = (task: Task) => {
    navigate(`/tasks/${task.id}`);
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {config.values.map(value => (
        <TaskKanbanColumn
          key={value}
          title={value}
          tasks={groupedTasks[value] || []}
          count={groupedTasks[value]?.length || 0}
          color={config.colors[value] || 'gray'}
          isLoading={isLoading}
          onTaskClick={handleTaskClick}
        />
      ))}
    </div>
  );
};
