import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { PropertyGroup } from '../types';

/**
 * Three states, not two.
 *
 * A pricing analysis is created as soon as anyone opens the screen, so its existence means
 * nothing on its own — on the development database half of them hold no approach, no method and
 * no value. Work has actually started once there is at least one method; until then the group is
 * untouched, whatever the analysis row says.
 */
type PricingState = 'valued' | 'started' | 'none';

const pricingStateOf = (group: PropertyGroup): PricingState =>
  typeof group.appraisedValue === 'number'
    ? 'valued'
    : group.hasPricingMethods
      ? 'started'
      : 'none';

const STATE_CLASSES: Record<PricingState, string> = {
  valued: 'border-primary bg-primary text-white hover:bg-primary-700',
  started: 'border-primary/40 bg-white text-primary-700 hover:bg-primary-50',
  none: 'border-gray-200 bg-gray-50 text-gray-400 hover:border-primary/40 hover:text-primary-700',
};

interface GroupPricingButtonProps {
  group: PropertyGroup;
  onGoToPricingAnalysis: (groupId: string) => void;
  /**
   * `compact` drops the words and keeps the ฿ and the colour — for the split view's rail, which
   * is 14rem wide and already spends most of that on the group's name.
   */
  variant?: 'full' | 'compact';
  className?: string;
}

/**
 * The group's appraised value, and the way into its pricing analysis.
 *
 * It belongs to the group and nothing smaller: one analysis prices the whole group, so the same
 * figure sitting beside a single property would read as that property's own worth. That is what
 * the split view used to do, and with 4 properties in the group it was off by four.
 */
export const GroupPricingButton = ({
  group,
  onGoToPricingAnalysis,
  variant = 'full',
  className,
}: GroupPricingButtonProps) => {
  const { t } = useTranslation('appraisal');
  const state = pricingStateOf(group);
  const value = typeof group.appraisedValue === 'number' ? group.appraisedValue : null;
  const label = t(
    state === 'valued'
      ? 'properties.pricing.done'
      : state === 'started'
        ? 'properties.pricing.inProgress'
        : 'properties.pricing.todo',
  );

  return (
    <button
      type="button"
      onClick={() => onGoToPricingAnalysis(group.id)}
      title={`${t('properties.pricingAnalysis')} · ${label}`}
      className={clsx(
        'inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border font-semibold transition-colors',
        variant === 'full' ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-px text-[10px]',
        STATE_CLASSES[state],
        className,
      )}
    >
      ฿{' '}
      {value != null ? (
        <span className="tabular-nums">
          {value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      ) : (
        variant === 'full' && label
      )}
    </button>
  );
};

export default GroupPricingButton;
