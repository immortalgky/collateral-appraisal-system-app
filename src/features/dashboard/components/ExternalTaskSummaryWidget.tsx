import { useState } from 'react';
import WidgetWrapper from './WidgetWrapper';

type DataPoint = {
  month: string;
  external: number;
  internal: number;
};

const MOCK_DATA: DataPoint[] = [
  { month: 'Jan', external: 45, internal: 30 },
  { month: 'Feb', external: 52, internal: 35 },
  { month: 'Mar', external: 38, internal: 42 },
  { month: 'Apr', external: 65, internal: 48 },
  { month: 'May', external: 58, internal: 55 },
  { month: 'Jun', external: 72, internal: 60 },
  { month: 'Jul', external: 48, internal: 38 },
  { month: 'Aug', external: 82, internal: 65 },
  { month: 'Sep', external: 75, internal: 58 },
  { month: 'Oct', external: 68, internal: 52 },
  { month: 'Nov', external: 55, internal: 45 },
  { month: 'Dec', external: 78, internal: 62 },
];

type CompanyFilter = 'all' | 'company-a' | 'company-b';

function ExternalTaskSummaryWidget() {
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>('all');
  const data = MOCK_DATA;

  const maxValue = Math.max(...data.flatMap((d) => [d.external, d.internal]));
  const chartHeight = 160;

  return (
    <WidgetWrapper id="external-task-summary">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">External Appraisal On Going Task Summary</h3>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value as CompanyFilter)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Company</option>
            <option value="company-a">Company A</option>
            <option value="company-b">Company B</option>
          </select>
        </div>

        <div className="p-6">
          {/* Legend */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-sm text-gray-600">External</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-400" />
              <span className="text-sm text-gray-600">Internal</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="relative">
            {/* Y-axis grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((_, i) => (
                <div key={i} className="border-t border-gray-100 w-full" />
              ))}
            </div>

            {/* Bars container */}
            <div className="flex items-end justify-between gap-2" style={{ height: chartHeight }}>
              {data.map((item) => {
                const externalHeight = (item.external / maxValue) * chartHeight;
                const internalHeight = (item.internal / maxValue) * chartHeight;

                return (
                  <div key={item.month} className="flex-1 flex items-end justify-center gap-1">
                    <div
                      className="w-3 bg-blue-500 rounded-t transition-all hover:opacity-80"
                      style={{ height: externalHeight }}
                      title={`External: ${item.external}`}
                    />
                    <div
                      className="w-3 bg-red-400 rounded-t transition-all hover:opacity-80"
                      style={{ height: internalHeight }}
                      title={`Internal: ${item.internal}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between mt-3">
              {data.map((item) => (
                <div key={item.month} className="flex-1 text-center">
                  <span className="text-xs text-gray-400">{item.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default ExternalTaskSummaryWidget;
