import { Icon } from '@/shared/components';
import clsx from 'clsx';
import type { Approach } from '../../types/selection';
import type { ViewMode } from '@features/pricingAnalysis/store/selectionReducer';

interface PricingAnalysisApproachCard {
  viewMode: ViewMode;
  approach: Approach;
  isOpen: boolean;
  onToggle: () => void;
  onSelectCandidateApproach: (approachType: string) => void;
}
export const PricingAnalysisApproachCard = ({
  viewMode,
  approach,
  isOpen,
  onToggle,
  onSelectCandidateApproach,
}: PricingAnalysisApproachCard) => {
  const hasSelectedMethods = approach.methods.some(m => m.isIncluded);

  if (viewMode === 'editing') {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={onToggle}
          className={clsx(
            'cursor-pointer text-sm rounded-lg border transition-all duration-200',
            hasSelectedMethods
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-gray-200 text-gray-500 hover:border-gray-300',
          )}
        >
          <div className="flex items-center gap-3 h-14 px-4">
            <Icon
              name={approach.icon}
              style="solid"
              className="size-4 shrink-0"
            />
            <span className="flex-1 text-left font-medium">{approach.label}</span>
            <Icon
              name="chevron-down"
              style="solid"
              className={clsx(
                'size-2 transition-transform duration-300 ease-in-out shrink-0',
                isOpen ? 'rotate-180' : '',
              )}
            />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div
        className={clsx(
          'flex items-center gap-3 h-14 px-3 text-sm rounded-lg',
          approach.isSelected
            ? 'bg-primary/5 border border-primary'
            : 'border border-transparent',
        )}
      >
        <button
          type="button"
          onClick={() => onSelectCandidateApproach(approach.approachType)}
          className="cursor-pointer shrink-0"
        >
          <div
            className={clsx(
              'size-5 rounded border-2 flex items-center justify-center transition-all',
              approach.isSelected
                ? 'bg-primary border-primary'
                : 'border-gray-300 hover:border-gray-400',
            )}
          >
            {approach.isSelected && (
              <Icon name="check" style="solid" className="size-3 text-white" />
            )}
          </div>
        </button>
        <Icon
          name={approach.icon}
          style="solid"
          className={clsx(
            'size-4 shrink-0',
            approach.isSelected ? 'text-primary' : 'text-gray-400',
          )}
        />
        <span
          className={clsx(
            'flex-1 font-medium',
            approach.isSelected ? 'text-primary' : 'text-gray-600',
          )}
        >
          {approach.label}
        </span>
        <div
          className={clsx(
            'flex items-center gap-1 text-sm',
            approach.isSelected ? 'text-primary font-semibold' : 'text-gray-500',
          )}
        >
          <span>{Number(approach.appraisalValue).toLocaleString()}</span>
          <Icon name="baht-sign" style="light" className="size-2" />
        </div>
      </div>
    </div>
  );
};
