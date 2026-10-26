import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { GUIDELINE_DESCRIPTIONS, RATING_VALUES } from '../constants/guidelines';
import type { EvaluationConfig } from '../api/types';

const CRITERIA_COUNT = 5;

// Red (1, worst) → Green (5, best). Static class names so Tailwind keeps them.
const RATING_COLOR: Record<number, { header: string; cell: string }> = {
  1: {
    header: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300',
    cell: 'bg-(--palette-req-wash) text-red-900 dark:text-red-200',
  },
  2: {
    header: 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300',
    cell: 'bg-orange-50 dark:bg-orange-500/10 text-orange-900 dark:text-orange-200',
  },
  3: {
    header: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300',
    cell: 'bg-(--palette-warn-wash) text-amber-900 dark:text-amber-200',
  },
  4: {
    header: 'bg-lime-100 dark:bg-lime-500/20 text-lime-800 dark:text-lime-300',
    cell: 'bg-lime-50 dark:bg-lime-500/10 text-lime-900 dark:text-lime-200',
  },
  5: {
    header: 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300',
    cell: 'bg-green-50 dark:bg-green-500/10 text-green-900 dark:text-green-200',
  },
};

interface RatingGuidelinesTableProps {
  /** When provided, guidance text comes from config (locale-aware). */
  configs?: EvaluationConfig[];
}

function RatingGuidelinesTable({ configs }: RatingGuidelinesTableProps) {
  const [open, setOpen] = useState(false);
  const { t, i18n } = useTranslation('serviceQualityEvaluation');

  /**
   * Resolve guidance description for a given criteria index (0-based) and rating level.
   * Config is keyed by criteriaSlot (1-based) and rating level (as a string).
   * Falls back to the hardcoded GUIDELINE_DESCRIPTIONS.
   */
  const getDescription = (criteriaIndex: number, rating: number): string => {
    if (configs && configs.length > 0) {
      const slot = criteriaIndex + 1;
      const cfg = configs.find(c => c.criteriaSlot === slot);
      if (cfg) {
        const entry = cfg.guidance[String(rating)];
        if (entry) {
          return i18n.language.startsWith('th') ? entry.th || entry.en : entry.en;
        }
      }
    }
    return GUIDELINE_DESCRIPTIONS[criteriaIndex]?.[rating] ?? '—';
  };

  return (
    <div className="border border-(--palette-line) rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-(--palette-surface-2) hover:bg-(--palette-surface-3) transition-colors text-sm font-medium text-(--palette-ink)"
      >
        <span className="flex items-center gap-2">
          <Icon name="circle-info" style="solid" className="size-4 text-blue-500" />
          {t('ratingGuidelines.title')}
        </span>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          style="solid"
          className="size-3.5 text-(--palette-gray-500)"
        />
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-(--palette-surface-2) border-t border-b border-(--palette-line)">
                <th className="text-xs text-center font-semibold text-(--palette-gray-600) px-3 py-2 whitespace-nowrap w-8">
                  {t('ratingGuidelines.no')}
                </th>
                {RATING_VALUES.map(rating => (
                  <th
                    key={rating}
                    className={`text-xs text-center font-semibold px-3 py-2 whitespace-nowrap ${RATING_COLOR[rating].header}`}
                  >
                    {t('ratingGuidelines.rating', { value: rating })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--palette-line-soft)">
              {Array.from({ length: CRITERIA_COUNT }, (_, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-center text-(--palette-gray-500)">{i + 1}</td>
                  {RATING_VALUES.map(rating => (
                    <td key={rating} className={`px-3 py-2 ${RATING_COLOR[rating].cell}`}>
                      {getDescription(i, rating)}
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
