import { useState, useMemo } from 'react';
import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';
import { useAppraisalCounts } from '../api';

type Period = 'total' | 'monthly' | 'weekly';

type DataPoint = {
  month: string;
  thisYear: number;
  lastYear: number;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function TotalAppraisalsWidget() {
  const [period, setPeriod] = useState<Period>('total');
  const currentYear = new Date().getFullYear();

  // Fetch this year and last year data
  const { data: thisYearData } = useAppraisalCounts(
    'monthly',
    `${currentYear}-01-01`,
    `${currentYear}-12-31`
  );
  const { data: lastYearData } = useAppraisalCounts(
    'monthly',
    `${currentYear - 1}-01-01`,
    `${currentYear - 1}-12-31`
  );

  const data: DataPoint[] = useMemo(() => {
    // Build month-indexed maps
    const thisYearMap = new Map<number, number>();
    const lastYearMap = new Map<number, number>();

    thisYearData?.items?.forEach((item) => {
      if (item.period) {
        const month = parseInt(item.period.split('-')[1], 10);
        thisYearMap.set(month, (thisYearMap.get(month) || 0) + item.createdCount);
      }
    });
    lastYearData?.items?.forEach((item) => {
      if (item.period) {
        const month = parseInt(item.period.split('-')[1], 10);
        lastYearMap.set(month, (lastYearMap.get(month) || 0) + item.createdCount);
      }
    });

    return MONTH_NAMES.map((name, i) => ({
      month: name,
      thisYear: thisYearMap.get(i + 1) || 0,
      lastYear: lastYearMap.get(i + 1) || 0,
    }));
  }, [thisYearData, lastYearData]);

  const maxValue = Math.max(1, ...data.flatMap((d) => [d.thisYear, d.lastYear]));
  const totalAppraisals = data.reduce((sum, d) => sum + d.thisYear, 0);
  const lastYearTotal = data.reduce((sum, d) => sum + d.lastYear, 0);

  // YoY % change vs last year (same year-to-date window)
  const yoyDelta = lastYearTotal > 0
    ? ((totalAppraisals - lastYearTotal) / lastYearTotal) * 100
    : 0;
  const yoyIsUp = yoyDelta >= 0;
  const yoyLabel = `${Math.abs(yoyDelta).toFixed(1)}%`;

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
            <div
              className={`flex items-center gap-1 text-sm font-medium mb-1 ${yoyIsUp ? 'text-emerald-500' : 'text-red-500'}`}
            >
              <Icon name={yoyIsUp ? 'arrow-up' : 'arrow-down'} style="solid" className="size-3" />
              <span>{yoyLabel}</span>
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
