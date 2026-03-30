import { useMemo } from 'react';
import WidgetWrapper from './WidgetWrapper';
import { useCompanyAppraisalSummary } from '../api';

type CompanyData = {
  name: string;
  assigned: number;
  completed: number;
};

function ExternalTaskSummaryWidget() {
  const { data: apiData } = useCompanyAppraisalSummary();

  const data: CompanyData[] = useMemo(() => {
    if (!apiData?.items?.length) return [];
    return apiData.items.map((item) => ({
      name: item.companyName || 'Unknown',
      assigned: item.assignedCount,
      completed: item.completedCount,
    }));
  }, [apiData]);

  const maxValue = Math.max(1, ...data.flatMap((d) => [d.assigned, d.completed]));
  const chartHeight = 160;

  return (
    <WidgetWrapper id="external-task-summary">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">External Appraisal Summary</h3>
        </div>

        <div className="p-6">
          {/* Legend */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-sm text-gray-600">Assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-sm text-gray-600">Completed</span>
            </div>
          </div>

          {data.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              No company data available
            </div>
          ) : (
            <>
              {/* Bar Chart */}
              <div className="relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3, 4].map((_, i) => (
                    <div key={i} className="border-t border-gray-100 w-full" />
                  ))}
                </div>

                <div className="flex items-end justify-between gap-2" style={{ height: chartHeight }}>
                  {data.map((item) => {
                    const assignedHeight = (item.assigned / maxValue) * chartHeight;
                    const completedHeight = (item.completed / maxValue) * chartHeight;

                    return (
                      <div key={item.name} className="flex-1 flex items-end justify-center gap-1">
                        <div
                          className="w-3 bg-blue-500 rounded-t transition-all hover:opacity-80"
                          style={{ height: assignedHeight }}
                          title={`Assigned: ${item.assigned}`}
                        />
                        <div
                          className="w-3 bg-emerald-500 rounded-t transition-all hover:opacity-80"
                          style={{ height: completedHeight }}
                          title={`Completed: ${item.completed}`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between mt-3">
                  {data.map((item) => (
                    <div key={item.name} className="flex-1 text-center">
                      <span className="text-xs text-gray-400 truncate block">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default ExternalTaskSummaryWidget;
