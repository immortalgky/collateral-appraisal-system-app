import { useTranslation } from 'react-i18next';

function AppraisalList() {
  const { t } = useTranslation('dashboard');

  // This would typically fetch data from an API
  // For now, we'll use placeholder data
  const appraisals = [
    {
      id: 1,
      property: '123 Main St',
      type: 'Residential',
      status: 'Completed',
      date: '2025-05-20',
      value: '$320,000',
    },
    {
      id: 2,
      property: '456 Oak Ave',
      type: 'Commercial',
      status: 'Pending',
      date: '2025-05-22',
      value: 'TBD',
    },
    {
      id: 3,
      property: '789 Pine Rd',
      type: 'Residential',
      status: 'In Progress',
      date: '2025-05-23',
      value: 'TBD',
    },
    {
      id: 4,
      property: '101 Cedar Ln',
      type: 'Residential',
      status: 'Completed',
      date: '2025-05-18',
      value: '$275,000',
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('appraisalList.columns.property')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('appraisalList.columns.type')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('appraisalList.columns.status')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('appraisalList.columns.date')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('appraisalList.columns.value')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('appraisalList.columns.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {appraisals.map(appraisal => (
            <tr key={appraisal.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">{appraisal.property}</td>
              <td className="px-6 py-4 whitespace-nowrap">{appraisal.type}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    appraisal.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : appraisal.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {appraisal.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{appraisal.date}</td>
              <td className="px-6 py-4 whitespace-nowrap">{appraisal.value}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-blue-600 hover:text-blue-900 mr-3">
                  {t('appraisalList.actions.view')}
                </button>
                {appraisal.status !== 'Completed' && (
                  <button className="text-green-600 hover:text-green-900">
                    {t('appraisalList.actions.edit')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AppraisalList;
