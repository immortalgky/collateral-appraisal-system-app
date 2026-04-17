import { useMemo } from 'react';
import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';
import { useAppraisalStatusSummary } from '../api';

type ProgressItem = {
  label: string;
  value: number;
  color: string;
  percentage: string;
};

const STATUS_ORDER = ['Pending', 'InProgress', 'UnderReview', 'Completed', 'Cancelled'] as const;

const STATUS_LABELS: Record<(typeof STATUS_ORDER)[number], string> = {
  Pending: 'Pending',
  InProgress: 'In Progress',
  UnderReview: 'Under Review',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<(typeof STATUS_ORDER)[number], string> = {
  Pending: '#6b7280',
  InProgress: '#3b82f6',
  UnderReview: '#f59e0b',
  Completed: '#10b981',
  Cancelled: '#ef4444',
};

function ProgressSummaryWidget() {
  const { data: apiData } = useAppraisalStatusSummary();

  const { data, total } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of apiData?.items ?? []) {
      counts.set(item.status, item.count);
    }
    // Always render the 5 canonical statuses in fixed order, filling 0 when missing.
    const items: ProgressItem[] = STATUS_ORDER.map((status) => ({
      label: STATUS_LABELS[status],
      value: counts.get(status) ?? 0,
      color: STATUS_COLORS[status],
      percentage: '0%',
    }));
    const sum = items.reduce((s, i) => s + i.value, 0);
    return {
      data: items.map((i) => ({
        ...i,
        percentage: sum > 0 ? `${((i.value / sum) * 100).toFixed(1)}%` : '0%',
      })),
      total: sum,
    };
  }, [apiData]);

  // Calculate donut chart segments
  const radius = 80;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;
  const segments = data.map((item) => {
    const percentage = total > 0 ? item.value / total : 0;
    const strokeDasharray = `${circumference * percentage} ${circumference * (1 - percentage)}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += circumference * percentage;
    return { ...item, strokeDasharray, strokeDashoffset, percentage };
  });

  return (
    <WidgetWrapper id="progress-summary">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">Appraisal Progress Summary</h3>
          </div>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Icon name="ellipsis-vertical" style="solid" className="size-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-8">
            {/* Donut Chart — renders a gray ring when total is 0 */}
            <div className="relative shrink-0">
              <svg width="200" height="200" viewBox="0 0 200 200">
                {total === 0 ? (
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth={strokeWidth}
                  />
                ) : (
                  segments.map((segment, index) => (
                    <circle
                      key={index}
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={segment.strokeDasharray}
                      strokeDashoffset={segment.strokeDashoffset}
                      transform="rotate(-90 100 100)"
                      className="transition-all duration-500"
                    />
                  ))
                )}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-800">{total.toLocaleString()}</span>
                <span className="text-xs text-gray-400">Total</span>
              </div>
            </div>

            {/* Legend — always shows all 5 statuses in fixed order */}
            <div className="flex-1 grid grid-cols-1 gap-2">
              {data.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600 truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400 tabular-nums">{item.value}</span>
                    <span className="text-sm font-medium text-gray-800 tabular-nums">{item.percentage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default ProgressSummaryWidget;
