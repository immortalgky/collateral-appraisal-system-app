function DashboardSummary() {
  // This would typically fetch data from an API
  // For now, we'll use placeholder data

  const stats = [
    { label: 'Total Appraisals', value: 124 },
    { label: 'Pending Review', value: 18 },
    { label: 'Completed This Month', value: 42 },
    { label: 'Average Value', value: '$275,500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
        >
          <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
          <p className="text-2xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export default DashboardSummary;
