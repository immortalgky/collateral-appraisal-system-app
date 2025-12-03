import { useState } from 'react';
import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';

type Period = 'calendar' | 'A' | 'M' | 'W' | 'D';

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
        {/* SVG Circle Gauge */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="10"
          />
          {/* Progress circle */}
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
        {/* Center content */}
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

type TaskSummaryWidgetProps = {
  data?: {
    notStarted: number;
    inProgress: number;
    overdue: number;
    completed: number;
  };
};

function TaskSummaryWidget({ data }: TaskSummaryWidgetProps) {
  const [period, setPeriod] = useState<Period>('A');

  // Mock data if not provided
  const taskData = data || {
    notStarted: 9,
    inProgress: 9,
    overdue: 9,
    completed: 9,
  };

  const total = taskData.notStarted + taskData.inProgress + taskData.overdue + taskData.completed;

  const periods: { key: Period; label: string; icon?: string }[] = [
    { key: 'calendar', label: '', icon: 'calendar' },
    { key: 'A', label: 'A' },
    { key: 'M', label: 'M' },
    { key: 'W', label: 'W' },
    { key: 'D', label: 'D' },
  ];

  return (
    <WidgetWrapper id="task-summary">
      <div className="bg-white rounded-2xl shadow-sm p-6 h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Task Summary</h3>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {periods.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                  period === p.key
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {p.icon ? (
                  <Icon name={p.icon} style="regular" className="size-4" />
                ) : (
                  <span className="text-sm font-medium">{p.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Task gauges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TaskGauge
            label="Not Started"
            count={taskData.notStarted}
            icon="loader"
            iconColor="text-blue-500"
            bgColor="bg-blue-50"
            strokeColor="#3b82f6"
            percentage={total > 0 ? (taskData.notStarted / total) * 100 : 0}
          />
          <TaskGauge
            label="In Progress"
            count={taskData.inProgress}
            icon="hourglass-start"
            iconColor="text-amber-500"
            bgColor="bg-amber-50"
            strokeColor="#f59e0b"
            percentage={total > 0 ? (taskData.inProgress / total) * 100 : 0}
          />
          <TaskGauge
            label="Overdue"
            count={taskData.overdue}
            icon="bell"
            iconColor="text-red-500"
            bgColor="bg-red-50"
            strokeColor="#ef4444"
            percentage={total > 0 ? (taskData.overdue / total) * 100 : 0}
          />
          <TaskGauge
            label="Completed"
            count={taskData.completed}
            icon="circle-check"
            iconColor="text-emerald-500"
            bgColor="bg-emerald-50"
            strokeColor="#10b981"
            percentage={total > 0 ? (taskData.completed / total) * 100 : 0}
          />
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default TaskSummaryWidget;
