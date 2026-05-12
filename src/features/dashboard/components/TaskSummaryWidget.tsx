import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  endOfMonth,
  endOfWeek,
  formatDistanceToNow,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import DatePickerInput from '@shared/components/inputs/DatePickerInput';
import WidgetWrapper from './WidgetWrapper';
import WidgetError from './WidgetError';
import WidgetDateRangeBadge from './WidgetDateRangeBadge';
import { useTaskSummary } from '../api';
import { useDashboardStore } from '../store';
import { toIsoDate, fromIsoDate } from '../utils/periodPresets';

const WIDGET_ID = 'task-summary';

type TaskPeriod = 'D' | 'W' | 'M' | 'ALL' | 'CUSTOM';

type TaskSummarySettings = {
  period?: TaskPeriod;
  from?: string;
  to?: string;
};

const EMPTY_SETTINGS: TaskSummarySettings = Object.freeze({}) as TaskSummarySettings;

const ALL_TIME_START = new Date(2000, 0, 1);

const PRESET_BUTTONS: Array<{ key: Exclude<TaskPeriod, 'CUSTOM'>; label: string; title: string }> = [
  { key: 'D', label: 'D', title: 'Daily (today)' },
  { key: 'W', label: 'W', title: 'Weekly (this week)' },
  { key: 'M', label: 'M', title: 'Monthly (this month)' },
  { key: 'ALL', label: 'All', title: 'All time' },
];

function rangeFor(period: TaskPeriod, today: Date, custom?: { from: Date; to: Date }) {
  switch (period) {
    case 'D':
      return { from: today, to: today };
    case 'W':
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }),
        to: endOfWeek(today, { weekStartsOn: 1 }),
      };
    case 'M':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'ALL':
      return { from: ALL_TIME_START, to: today };
    case 'CUSTOM':
      return custom ?? { from: startOfMonth(today), to: endOfMonth(today) };
  }
}

type CustomPopoverProps = {
  initialFrom?: string;
  initialTo?: string;
  onApply: (from: Date, to: Date) => void;
  onClose: () => void;
};

function CustomRangePopover({ initialFrom, initialTo, onApply, onClose }: CustomPopoverProps) {
  const [fromStr, setFromStr] = useState(initialFrom ?? '');
  const [toStr, setToStr] = useState(initialTo ?? '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        // The DatePickerInput's calendar popover renders as a sibling and may sit
        // outside this ref. Don't close if click landed inside react-day-picker.
        if ((target as HTMLElement)?.closest?.('.react-day-picker')) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const fromDate = fromStr ? fromIsoDate(fromStr) : undefined;
  const toDate = toStr ? fromIsoDate(toStr) : undefined;
  const invalid = !fromDate || !toDate || fromDate > toDate;

  return (
    <div
      ref={ref}
      className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-xl p-4 flex flex-col gap-3"
    >
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
        <DatePickerInput
          value={fromDate ?? null}
          onChange={iso => setFromStr(iso ? toIsoDate(new Date(iso)) : '')}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
        <DatePickerInput
          value={toDate ?? null}
          onChange={iso => setToStr(iso ? toIsoDate(new Date(iso)) : '')}
        />
      </div>
      <button
        type="button"
        disabled={invalid}
        onClick={() => fromDate && toDate && onApply(fromDate, toDate)}
        className="mt-1 text-sm font-medium rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
      >
        Apply
      </button>
    </div>
  );
}

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

  const settings = useDashboardStore(
    s =>
      (s.widgets.find(w => w.id === WIDGET_ID)?.settings as TaskSummarySettings | undefined) ??
      EMPTY_SETTINGS,
  );
  const updateSettings = useDashboardStore(s => s.updateWidgetSettings);

  const today = useMemo(() => new Date(), []);
  // Old store values (e.g. 'MTD') from the previous PeriodSelect default fall through to 'M'.
  const period: TaskPeriod = (['D', 'W', 'M', 'ALL', 'CUSTOM'] as const).includes(
    settings.period as TaskPeriod,
  )
    ? (settings.period as TaskPeriod)
    : 'M';
  const customRange = useMemo(
    () =>
      settings.from && settings.to
        ? { from: fromIsoDate(settings.from), to: fromIsoDate(settings.to) }
        : undefined,
    [settings.from, settings.to],
  );
  const range = useMemo(() => rangeFor(period, today, customRange), [period, today, customRange]);
  const [customOpen, setCustomOpen] = useState(false);

  const { data, isLoading, isError, refetch, dataUpdatedAt } = useTaskSummary({
    from: toIsoDate(range.from),
    to: toIsoDate(range.to),
  });

  const notStarted = data?.notStarted ?? 0;
  const inProgress = data?.inProgress ?? 0;
  const overdue = data?.overdue ?? 0;
  const completed = data?.completed ?? 0;
  const total = notStarted + inProgress + overdue + completed;

  const handlePresetClick = (key: Exclude<TaskPeriod, 'CUSTOM'>) => {
    setCustomOpen(false);
    updateSettings(WIDGET_ID, {
      period: key,
      from: undefined,
      to: undefined,
    } as TaskSummarySettings);
  };

  const handleCustomApply = (from: Date, to: Date) => {
    setCustomOpen(false);
    updateSettings(WIDGET_ID, {
      period: 'CUSTOM',
      from: toIsoDate(from),
      to: toIsoDate(to),
    } as TaskSummarySettings);
  };

  const goToTasks = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    navigate(qs ? `/tasks?${qs}` : '/tasks');
  };

  const updatedLabel = dataUpdatedAt
    ? formatDistanceToNow(dataUpdatedAt, { addSuffix: false })
    : null;

  return (
    <WidgetWrapper id={WIDGET_ID}>
      <div className="bg-white rounded-2xl shadow-sm p-6 h-full">
        <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-gray-800">Task Summary</h3>
            <WidgetDateRangeBadge from={range.from} to={range.to} />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="inline-flex flex-wrap items-center gap-1.5 justify-end">
              {PRESET_BUTTONS.map(btn => {
                const active = period === btn.key;
                return (
                  <button
                    key={btn.key}
                    type="button"
                    title={btn.title}
                    onClick={() => handlePresetClick(btn.key)}
                    className={`min-w-[1.75rem] px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
              <div className="relative">
                <button
                  type="button"
                  title="Custom date range"
                  onClick={() => setCustomOpen(o => !o)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border inline-flex items-center gap-1.5 transition-all ${
                    period === 'CUSTOM'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <Icon name="calendar" style="regular" className="size-3" />
                  Custom
                </button>
                {customOpen && (
                  <CustomRangePopover
                    initialFrom={settings.from ?? toIsoDate(range.from)}
                    initialTo={settings.to ?? toIsoDate(range.to)}
                    onApply={handleCustomApply}
                    onClose={() => setCustomOpen(false)}
                  />
                )}
              </div>
            </div>
            {updatedLabel && (
              <span className="text-xs text-gray-400">Updated {updatedLabel} ago</span>
            )}
          </div>
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
