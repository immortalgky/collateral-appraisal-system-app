import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { GUIDELINE_DESCRIPTIONS, RATING_VALUES } from '../constants/guidelines';

const CRITERIA_COUNT = 5;

// Red (1, worst) → Green (5, best). Static class names so Tailwind keeps them.
const RATING_COLOR: Record<number, { header: string; cell: string }> = {
  1: { header: 'bg-red-100 text-red-800',       cell: 'bg-red-50 text-red-900' },
  2: { header: 'bg-orange-100 text-orange-800', cell: 'bg-orange-50 text-orange-900' },
  3: { header: 'bg-amber-100 text-amber-800',   cell: 'bg-amber-50 text-amber-900' },
  4: { header: 'bg-lime-100 text-lime-800',     cell: 'bg-lime-50 text-lime-900' },
  5: { header: 'bg-green-100 text-green-800',   cell: 'bg-green-50 text-green-900' },
};

function RatingGuidelinesTable() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation('serviceQualityEvaluation');

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-2">
          <Icon name="circle-info" style="solid" className="size-4 text-blue-500" />
          {t('ratingGuidelines.title')}
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
              <tr className="bg-gray-50 border-t border-b border-gray-200">
                <th className="text-center font-medium text-gray-600 px-3 py-2 whitespace-nowrap w-8">
                  {t('ratingGuidelines.no')}
                </th>
                {RATING_VALUES.map(rating => (
                  <th
                    key={rating}
                    className={`text-center font-medium px-3 py-2 whitespace-nowrap ${RATING_COLOR[rating].header}`}
                  >
                    {t('ratingGuidelines.rating', { value: rating })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: CRITERIA_COUNT }, (_, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
                  {RATING_VALUES.map(rating => (
                    <td key={rating} className={`px-3 py-2 ${RATING_COLOR[rating].cell}`}>
                      {GUIDELINE_DESCRIPTIONS[i][rating]}
                    </td>
                  ))}
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
