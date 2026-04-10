import { useMemo } from 'react';
import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';
import { useRequestStatusSummary } from '../api';

type ProgressItem = {
  label: string;
  value: number;
  color: string;
  percentage: string;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#3b82f6',
  NEW: '#06b6d4',
  SUBMITTED: '#f97316',
  ASSIGNED: '#a855f7',
  IN_PROGRESS: '#ef4444',
  COMPLETED: '#22c55e',
  CANCELLED: '#6b7280',
};

function ProgressSummaryWidget() {
  const { data: apiData } = useRequestStatusSummary();

  const { data, total } = useMemo(() => {
    if (apiData?.items && apiData.items.length > 0) {
      const items: ProgressItem[] = apiData.items.map((item) => ({
        label: item.status,
        value: item.count,
        color: STATUS_COLORS[item.status] || '#6b7280',
        percentage: '0%',
      }));
      const sum = items.reduce((s, i) => s + i.value, 0);
      return {
        data: items.map((i) => ({
          ...i,
          percentage: sum > 0 ? `${((i.value / sum) * 100).toFixed(2)}%` : '0%',
        })),
        total: sum,
      };
    }
    // Fallback empty state
    return { data: [] as ProgressItem[], total: 0 };
  }, [apiData]);

  // Calculate donut chart segments
  const radius = 80;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;
  const segments = data.map((item) => {
    const percentage = item.value / total;
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
            <h3 className="font-semibold text-gray-800">Pending Appraisal Request Progress Summary</h3>
            <span className="text-xs text-gray-400">13 total</span>
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
            {/* Donut Chart */}
            <div className="relative shrink-0">
              <svg width="200" height="200" viewBox="0 0 200 200">
                {segments.map((segment, index) => (
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
                ))}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-800">{total.toLocaleString()}</span>
                <span className="text-xs text-gray-400">Total requests</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 grid grid-cols-1 gap-2">
              {data.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600 truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{item.percentage}</span>
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
