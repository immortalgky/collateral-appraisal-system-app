import { Icon } from '@/shared/components';
import clsx from 'clsx';
import type { Approach } from '../../types/selection';

interface PricingAnalysisApproachCardProps {
  /** Editing mode only — the summary-mode approach header now lives inside
   *  PricingAnalysisMethodBoard's own `<tr class="apr">` row. */
  viewMode: 'editing';
  approach: Approach;
  isOpen: boolean;
  onToggle: () => void;
}

export const PricingAnalysisApproachCard = ({
  approach,
  isOpen,
  onToggle,
}: PricingAnalysisApproachCardProps) => {
  const hasSelectedMethods = approach.methods.some(m => m.isIncluded);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          'cursor-pointer text-sm rounded-lg border-l-4 border transition-all duration-200',
          hasSelectedMethods
            ? 'border-l-primary border-primary bg-primary/5 text-primary'
            : 'border-l-gray-300 border-gray-200 text-gray-500 hover:border-gray-300',
        )}
      >
        <div className="flex items-center gap-3 h-12 px-4">
          <Icon name={approach.icon} style="solid" className="size-4 shrink-0" />
          <span className="flex-1 text-left font-medium">{approach.label}</span>
          <Icon
            name="chevron-down"
            style="solid"
            className={clsx('size-2 shrink-0', isOpen ? 'rotate-180' : '')}
          />
        </div>
      </button>
    </div>
  );
};
