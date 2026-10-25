import { useNavigate } from 'react-router-dom';
import type { Task } from '../types';
import { columnDefs } from '../config/columnDefs';

type TaskRowProps = {
  task: Task;
};

/**
 * A single task table row rendered using the shared columnDefs.
 * Reused by TaskListingPage (inline) and RecentTaskWidget.
 * Columns shown: appraisalNumber, customerName, taskType, purpose, status.
 * Double-click navigates to /tasks/:id/opening.
 */
function TaskRow({ task }: TaskRowProps) {
  const navigate = useNavigate();

  return (
    <tr
      className="group hover:bg-(--palette-surface-2) cursor-default transition-colors"
      onDoubleClick={() => navigate(`/tasks/${task.id}/opening`)}
    >
      <td className="px-4 py-3 sticky left-0 bg-(--palette-surface) group-hover:bg-(--palette-surface-2) transition-colors after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-(--palette-surface-3)">
        {columnDefs.appraisalNumber.render(task)}
      </td>
      <td className="px-4 py-3 text-(--palette-gray-600) text-sm">
        {columnDefs.customerName.render(task)}
      </td>
      <td className="px-4 py-3 text-(--palette-gray-600) text-sm">
        {columnDefs.taskType.render(task)}
      </td>
      <td className="px-4 py-3 text-(--palette-gray-600) text-sm">
        {columnDefs.purpose.render(task)}
      </td>
      <td className="px-4 py-3">{columnDefs.status.render(task)}</td>
    </tr>
  );
}

export default TaskRow;
