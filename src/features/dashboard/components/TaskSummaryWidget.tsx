import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';
import { useTaskSummary } from '../api';

type TaskGaugeProps = {
  label: string;
  count: number;
  icon: string;
  iconColor: string;
  bgColor: string;
  strokeColor: string;
  percentage: number;
};

function TaskGauge({ label, count, icon, iconColor, bgColor, strokeColor, percentage }: TaskGaugeProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3 hover:shadow-md transition-shadow">
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
          <span className="text-3xl font-semibold text-gray-800">{count}</span>
          <span className="text-xs text-gray-400">Tasks</span>
        </div>
      </div>
    </div>
  );
}

function TaskSummaryWidget() {
  const { data } = useTaskSummary();

  const notStarted = data?.notStarted ?? 0;
  const inProgress = data?.inProgress ?? 0;
  const overdue = data?.overdue ?? 0;
  const completed = data?.completedThisWeek ?? 0;
  const total = notStarted + inProgress + overdue + completed;

  return (
    <WidgetWrapper id="task-summary">
      <div className="bg-white rounded-2xl shadow-sm p-6 h-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Task Summary</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TaskGauge
            label="Not Started"
            count={notStarted}
            icon="loader"
            iconColor="text-blue-500"
            bgColor="bg-blue-50"
            strokeColor="#3b82f6"
            percentage={total > 0 ? (notStarted / total) * 100 : 0}
          />
          <TaskGauge
            label="In Progress"
            count={inProgress}
            icon="hourglass-start"
            iconColor="text-amber-500"
            bgColor="bg-amber-50"
            strokeColor="#f59e0b"
            percentage={total > 0 ? (inProgress / total) * 100 : 0}
          />
          <TaskGauge
            label="Overdue"
            count={overdue}
            icon="bell"
            iconColor="text-red-500"
            bgColor="bg-red-50"
            strokeColor="#ef4444"
            percentage={total > 0 ? (overdue / total) * 100 : 0}
          />
          <TaskGauge
            label="Completed"
            count={completed}
            icon="circle-check"
            iconColor="text-emerald-500"
            bgColor="bg-emerald-50"
            strokeColor="#10b981"
            percentage={total > 0 ? (completed / total) * 100 : 0}
          />
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default TaskSummaryWidget;
