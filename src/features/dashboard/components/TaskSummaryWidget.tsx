import { useNavigate } from 'react-router-dom';
import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import WidgetError from './WidgetError';
import { useTaskSummary } from '../api';

type TaskGaugeProps = {
  label: string;
  count: number;
  icon: string;
  iconColor: string;
  bgColor: string;
  strokeColor: string;
  percentage: number;
  onClick?: () => void;
  hint?: string;
};

function TaskGauge({
  label,
  count,
  icon,
  iconColor,
  bgColor,
  strokeColor,
  percentage,
  onClick,
  hint,
}: TaskGaugeProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const clickable = Boolean(onClick);
  const Tag = clickable ? 'button' : 'div';

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      title={hint ?? (clickable ? `View ${label.toLowerCase()} tasks` : undefined)}
      aria-label={
        clickable ? `${label}: ${count} tasks. ${hint ?? 'Open filtered task list.'}` : undefined
      }
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3 transition ${
        clickable
          ? 'hover:shadow-md hover:border-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-left'
          : ''
      }`}
    >
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`p-2 rounded-full ${bgColor} mb-1`}>
            <Icon name={icon} style="solid" className={`size-5 ${iconColor}`} />
          </div>
          <span className="text-3xl font-semibold text-gray-800 tabular-nums">{count}</span>
          <span className="text-xs text-gray-400">Tasks</span>
        </div>
      </div>
      {clickable && (
        <span className="text-[11px] text-blue-600 inline-flex items-center gap-0.5">
          Open list
          <Icon name="arrow-right" style="solid" className="size-2.5" />
        </span>
      )}
    </Tag>
  );
}

function GaugeSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3">
      <Skeleton variant="text" width={80} height={14} />
      <Skeleton variant="circular" width={128} height={128} />
      <Skeleton variant="text" width={60} height={12} />
    </div>
  );
}

function TaskSummaryWidget() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useTaskSummary();

  const notStarted = data?.notStarted ?? 0;
  const inProgress = data?.inProgress ?? 0;
  const overdue = data?.overdue ?? 0;
  const completed = data?.completedThisWeek ?? 0;
  const total = notStarted + inProgress + overdue + completed;

  const goToTasks = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    navigate(qs ? `/tasks?${qs}` : '/tasks');
  };

  return (
    <WidgetWrapper id="task-summary">
      <div className="bg-white rounded-2xl shadow-sm p-6 h-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Task Summary</h3>
          {!isLoading && !isError && total > 0 && (
            <span className="text-xs text-gray-400">
              Click a tile to open the filtered task list
            </span>
          )}
        </div>

        {isError ? (
          <WidgetError message="Unable to load task summary" onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <GaugeSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <TaskGauge
              label="Not Started"
              count={notStarted}
              icon="loader"
              iconColor="text-blue-500"
              bgColor="bg-blue-50"
              strokeColor="#3b82f6"
              percentage={total > 0 ? (notStarted / total) * 100 : 0}
              onClick={() => goToTasks({ pendingTaskStatus: 'Assigned' })}
              hint="Filter task list by Assigned"
            />
            <TaskGauge
              label="In Progress"
              count={inProgress}
              icon="hourglass-start"
              iconColor="text-amber-500"
              bgColor="bg-amber-50"
              strokeColor="#f59e0b"
              percentage={total > 0 ? (inProgress / total) * 100 : 0}
              onClick={() => goToTasks({ pendingTaskStatus: 'InProgress' })}
              hint="Filter task list by In Progress"
            />
            <TaskGauge
              label="Overdue"
              count={overdue}
              icon="bell"
              iconColor="text-red-500"
              bgColor="bg-red-50"
              strokeColor="#ef4444"
              percentage={total > 0 ? (overdue / total) * 100 : 0}
              onClick={() => goToTasks({ slaStatus: 'Breached' })}
              hint="Filter task list by SLA Breached"
            />
            <TaskGauge
              label="Completed"
              count={completed}
              icon="circle-check"
              iconColor="text-emerald-500"
              bgColor="bg-emerald-50"
              strokeColor="#10b981"
              percentage={total > 0 ? (completed / total) * 100 : 0}
              onClick={() => goToTasks({})}
              hint="Open the full task list"
            />
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}

export default TaskSummaryWidget;
