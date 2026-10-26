import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { EvaluationFormValues } from '../schemas/form';
import { CRITERIA_WEIGHTS } from '../schemas/form';
import { GUIDELINE_DESCRIPTIONS, RATING_VALUES } from '../constants/guidelines';
import Icon from '@shared/components/Icon';

export type CriteriaIndex = 0 | 1 | 2 | 3 | 4;

// Red (1, worst) → Green (5, best). Static class names so Tailwind keeps them.
const RATING_PILL: Record<number, { selected: string; unselected: string }> = {
  1: {
    selected: 'bg-red-500 text-white ring-1 ring-red-600',
    unselected:
      'bg-(--palette-req-wash) text-(--palette-req) hover:bg-red-100 dark:hover:bg-red-500/20',
  },
  2: {
    selected: 'bg-orange-500 text-white ring-1 ring-orange-600',
    unselected:
      'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-500/20',
  },
  3: {
    selected: 'bg-amber-500 text-white ring-1 ring-amber-600',
    unselected:
      'bg-(--palette-warn-wash) text-(--palette-warn) hover:bg-amber-100 dark:hover:bg-amber-500/20',
  },
  4: {
    selected: 'bg-lime-500 text-white ring-1 ring-lime-600',
    unselected:
      'bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-300 hover:bg-lime-100 dark:hover:bg-lime-500/20',
  },
  5: {
    selected: 'bg-green-500 text-white ring-1 ring-green-600',
    unselected:
      'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/20',
  },
};

interface EvaluationCriteriaRowProps {
  index: CriteriaIndex;
  criteriaLabel: string;
  disabled?: boolean;
  forceDisabled?: boolean;
  /** True when the parent's form state says criterion #2 was auto-detected. */
  deliveryAutoDetected?: boolean;
  /** Detected business-days value (only meaningful when deliveryAutoDetected). */
  deliveryDetectedDays?: number | null;
  /** Override weight from config (falls back to CRITERIA_WEIGHTS[index]). */
  weight?: number;
  /** Override guidance from config keyed by rating level string. */
  guidance?: Record<string, { en: string; th: string }>;
}

const RATING_KEYS: readonly [
  'criteria1Rating',
  'criteria2Rating',
  'criteria3Rating',
  'criteria4Rating',
  'criteria5Rating',
] = ['criteria1Rating', 'criteria2Rating', 'criteria3Rating', 'criteria4Rating', 'criteria5Rating'];

function EvaluationCriteriaRow({
  index,
  criteriaLabel,
  disabled = false,
  forceDisabled = false,
  deliveryAutoDetected = false,
  deliveryDetectedDays = null,
  weight: weightProp,
  guidance: guidanceProp,
}: EvaluationCriteriaRowProps) {
  const { t, i18n } = useTranslation('serviceQualityEvaluation');
  const { control } = useFormContext<EvaluationFormValues>();

  // Use config weight if provided, else fall back to hardcoded constant.
  const weight = weightProp ?? CRITERIA_WEIGHTS[index];

  const ratingName = RATING_KEYS[index];

  const { field: ratingField } = useController({ name: ratingName, control });

  const rating = ratingField.value as number | null | undefined;
  const hasRating = rating != null && rating >= 1 && rating <= 5;
  const clampedRating = hasRating ? (rating as 1 | 2 | 3 | 4 | 5) : null;
  const score = hasRating ? weight * (rating as number) : null;

  // Resolve description: config guidance (locale-aware) → hardcoded fallback.
  const description = (() => {
    if (!clampedRating) return '—';
    if (guidanceProp) {
      const entry = guidanceProp[String(clampedRating)];
      if (entry) {
        return i18n.language.startsWith('th') ? entry.th || entry.en : entry.en;
      }
    }
    return GUIDELINE_DESCRIPTIONS[index][clampedRating] ?? '—';
  })();

  const isSelectDisabled = disabled || forceDisabled;

  // Badge is driven by props — the parent owns the whole-form useWatch and the
  // single hydration reset, so we don't subscribe a second time here.
  const isDeliveryRow = index === 1;
  const showDetectedBadge =
    isDeliveryRow && deliveryAutoDetected === true && deliveryDetectedDays != null;

  return (
    <tr
      className={`border-b border-(--palette-line-soft) last:border-0 ${
        forceDisabled ? 'bg-blue-50/40 dark:bg-blue-500/10' : ''
      }`}
    >
      <td className="px-3 py-2.5 text-sm text-(--palette-gray-500) text-center w-8">{index + 1}</td>
      <td className="px-3 py-2.5 text-sm text-(--palette-ink)">
        <span className="inline-flex items-center gap-1.5">
          {forceDisabled && <Icon name="lock" style="solid" className="size-3 text-blue-500" />}
          {criteriaLabel}
          {showDetectedBadge && (
            <span className="relative group inline-flex">
              <Icon name="circle-info" style="solid" className="size-4 text-blue-500 cursor-help" />
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 z-20 rounded-md bg-gray-900 px-3 py-2 text-xs font-normal text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal text-left"
              >
                {t('deliveryTime.tooltip')}
              </span>
            </span>
          )}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm text-(--palette-gray-600) text-center tabular-nums w-16">
        {weight.toFixed(2)}
      </td>
      <td className="px-3 py-2.5 w-48">
        <div
          role="radiogroup"
          aria-label={`${criteriaLabel} rating`}
          className={`inline-flex gap-1 ${forceDisabled ? 'opacity-40 saturate-50' : isSelectDisabled ? 'opacity-60' : ''}`}
        >
          {RATING_VALUES.map(value => {
            const isSelected = value === clampedRating;
            const palette = RATING_PILL[value];
            const classes = isSelected ? palette.selected : palette.unselected;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isSelectDisabled}
                onClick={() => ratingField.onChange(value)}
                onBlur={ratingField.onBlur}
                className={`w-7 h-7 rounded-md text-sm font-semibold tabular-nums transition focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed ${classes}`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </td>
      <td className="px-3 py-2.5 text-sm text-(--palette-ink) text-center tabular-nums w-16">
        {score == null ? '—' : score.toFixed(2)}
      </td>
      <td
        className={`px-3 py-2.5 text-sm ${description === '—' ? 'text-(--palette-gray-400)' : 'text-(--palette-gray-600)'}`}
      >
        {description}
        {showDetectedBadge && (
          <span className="ml-1 text-(--palette-gray-500) whitespace-nowrap">
            {t('deliveryTime.detectedDays', { days: (deliveryDetectedDays as number).toFixed(2) })}
          </span>
        )}
      </td>
    </tr>
  );
}

export default EvaluationCriteriaRow;
