import { useState } from 'react';
import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';

type Period = 'total' | 'monthly' | 'weekly';

type DataPoint = {
  month: string;
  thisYear: number;
  lastYear: number;
};

const MOCK_DATA: DataPoint[] = [
  { month: 'Jan', thisYear: 2400, lastYear: 1800 },
  { month: 'Feb', thisYear: 3200, lastYear: 2100 },
  { month: 'Mar', thisYear: 2800, lastYear: 2400 },
  { month: 'Apr', thisYear: 4200, lastYear: 3100 },
  { month: 'May', thisYear: 3800, lastYear: 2900 },
  { month: 'Jun', thisYear: 5100, lastYear: 3500 },
  { month: 'Jul', thisYear: 4600, lastYear: 4000 },
  { month: 'Aug', thisYear: 5800, lastYear: 4200 },
  { month: 'Sep', thisYear: 6200, lastYear: 4800 },
  { month: 'Oct', thisYear: 7100, lastYear: 5200 },
  { month: 'Nov', thisYear: 7800, lastYear: 5800 },
  { month: 'Dec', thisYear: 9999, lastYear: 6500 },
];

function TotalAppraisalsWidget() {
  const [period, setPeriod] = useState<Period>('total');
  const data = MOCK_DATA;

  const maxValue = Math.max(...data.flatMap((d) => [d.thisYear, d.lastYear]));
  const totalAppraisals = data[data.length - 1].thisYear;

  // Calculate SVG path for line chart
  const chartWidth = 500;
  const chartHeight = 120;
  const padding = { left: 0, right: 0, top: 10, bottom: 10 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * graphWidth;
  const getY = (value: number) => padding.top + graphHeight - (value / maxValue) * graphHeight;

  const thisYearPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.thisYear)}`)
    .join(' ');

  const lastYearPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.lastYear)}`)
    .join(' ');

  // Create area path for gradient fill
  const thisYearAreaPath = `${thisYearPath} L ${getX(data.length - 1)} ${chartHeight - padding.bottom} L ${getX(0)} ${chartHeight - padding.bottom} Z`;

  return (
    <WidgetWrapper id="total-appraisals">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800">Total Appraisals</h3>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="total">Total</option>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Icon name="expand" style="solid" className="size-4" />
            </button>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Icon name="ellipsis-vertical" style="solid" className="size-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Stats */}
          <div className="flex items-end gap-3 mb-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Appraisals</p>
              <p className="text-4xl font-bold text-gray-800">{totalAppraisals.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-500 text-sm font-medium mb-1">
              <Icon name="arrow-up" style="solid" className="size-3" />
              <span>12.5%</span>
            </div>
          </div>

          {/* Chart */}
          <div className="relative">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32">
              <defs>
                <linearGradient id="thisYearGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path d={thisYearAreaPath} fill="url(#thisYearGradient)" />

              {/* Last year line */}
              <path
                d={lastYearPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* This year line */}
              <path
                d={thisYearPath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points for this year */}
              {data.map((d, i) => (
                <circle key={i} cx={getX(i)} cy={getY(d.thisYear)} r="4" fill="#3b82f6" />
              ))}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 px-1">
              {data.map((d) => (
                <span key={d.month} className="text-xs text-gray-400">
                  {d.month}
                </span>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">This year</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-gray-600">Last year</span>
            </div>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default TotalAppraisalsWidget;
