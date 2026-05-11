import { useState } from 'react';
import Icon from '@shared/components/Icon';

const GUIDELINES = [
  {
    no: 1,
    criteria: 'Report book quality',
    rating1: '>5 corrections',
    rating2: '3–4 corrections',
    rating3: '1–2 corrections',
    rating4: 'No revision',
  },
  {
    no: 2,
    criteria: 'Delivery time',
    rating1: '>3.5 days',
    rating2: '2.5–3.5 days',
    rating3: '2–2.5 days',
    rating4: '<2 days',
  },
  {
    no: 3,
    criteria: 'Preparing company personnel',
    rating1: 'Should be improved',
    rating2: 'Fairly prepared',
    rating3: 'Well prepared',
    rating4: 'Very well prepared',
  },
  {
    no: 4,
    criteria: 'Response time to problem',
    rating1: 'Fix >90 min',
    rating2: 'Fix within 60 min',
    rating3: 'Fix within 30 min',
    rating4: 'Fix within 30 min',
  },
  {
    no: 5,
    criteria: 'Coordination & responsibility',
    rating1: 'Fairly good level',
    rating2: 'Moderate level',
    rating3: 'Good level',
    rating4: 'Very good level',
  },
];

function RatingGuidelinesTable() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-2">
          <Icon name="circle-info" style="solid" className="size-4 text-blue-500" />
          Rating Guidelines
        </span>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          style="solid"
          className="size-3.5 text-gray-500"
        />
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-t border-gray-200">
                <th className="text-left font-medium text-gray-600 px-3 py-2 whitespace-nowrap w-8">
                  No
                </th>
                <th className="text-left font-medium text-gray-600 px-3 py-2">Criteria</th>
                <th className="text-left font-medium text-gray-600 px-3 py-2 whitespace-nowrap">
                  Rating 1
                </th>
                <th className="text-left font-medium text-gray-600 px-3 py-2 whitespace-nowrap">
                  Rating 2
                </th>
                <th className="text-left font-medium text-gray-600 px-3 py-2 whitespace-nowrap">
                  Rating 3
                </th>
                <th className="text-left font-medium text-gray-600 px-3 py-2 whitespace-nowrap">
                  Rating 4
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {GUIDELINES.map(row => (
                <tr key={row.no} className="even:bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-500">{row.no}</td>
                  <td className="px-3 py-2 font-medium text-gray-700">{row.criteria}</td>
                  <td className="px-3 py-2 text-gray-600">{row.rating1}</td>
                  <td className="px-3 py-2 text-gray-600">{row.rating2}</td>
                  <td className="px-3 py-2 text-gray-600">{row.rating3}</td>
                  <td className="px-3 py-2 text-gray-600">{row.rating4}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RatingGuidelinesTable;
