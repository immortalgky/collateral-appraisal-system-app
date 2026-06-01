import { useTranslation } from 'react-i18next';

function DashboardSummary() {
  const { t } = useTranslation('dashboard');

  // This would typically fetch data from an API
  // For now, we'll use placeholder data
  const stats = [
    { labelKey: 'widgetConfigs.totalAppraisals.title', value: 124 },
    { labelKey: 'progressSummary.status.Pending', value: 18 },
    { labelKey: 'taskSummary.completed', value: 42 },
    { labelKey: 'totalAppraisals.kpi.completionRate', value: '$275,500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div
          key={stat.labelKey}
          className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
        >
          <p className="text-sm text-gray-500 mb-1">
            {t(stat.labelKey as Parameters<typeof t>[0])}
          </p>
          <p className="text-2xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export default DashboardSummary;
