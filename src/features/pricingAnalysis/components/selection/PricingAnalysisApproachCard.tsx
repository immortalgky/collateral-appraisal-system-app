import { Icon } from '@/shared/components';
import clsx from 'clsx';
import type { Approach } from '../../types/selection';
import type { ViewMode } from '@features/pricingAnalysis/store/selectionReducer';
import type { ViewLayout } from './PricingAnalysisMethodCard';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

interface PricingAnalysisApproachCardProps {
  viewMode: ViewMode;
  viewLayout?: ViewLayout;
  approach: Approach;
  isOpen: boolean;
  onToggle: () => void;
  onSelectCandidateApproach: (approachType: string) => void;
  onViewLayoutChange?: (layout: ViewLayout) => void;
}

export const PricingAnalysisApproachCard = ({
  viewMode,
  viewLayout = 'grid',
  approach,
  isOpen,
  onToggle,
  onSelectCandidateApproach,
  onViewLayoutChange,
}: PricingAnalysisApproachCardProps) => {
  const isReadOnly = usePageReadOnly();
  const hasSelectedMethods = approach.methods.some(m => m.isIncluded);

  if (viewMode === 'editing') {
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
                'size-2 shrink-0',
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
          'flex items-center gap-3 h-12 px-3 text-sm rounded-lg border-l-4',
          approach.isSelected
            ? 'bg-primary/5 border border-primary border-l-primary'
            : 'border border-transparent border-l-gray-300',
        )}
      >
        {isReadOnly ? (
          <div
            className={clsx(
              'size-5 rounded border-2 flex items-center justify-center shrink-0',
              approach.isSelected
                ? 'bg-primary border-primary'
                : 'border-gray-300',
            )}
          >
            {approach.isSelected && (
              <Icon name="check" style="solid" className="size-3 text-white" />
            )}
          </div>
        ) : (
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
        )}
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

        {/* View toggle */}
        {onViewLayoutChange && (
          <div className="flex items-center gap-0.5 ml-1 border-l border-gray-200 pl-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewLayoutChange('grid'); }}
              className={clsx(
                'p-1 rounded transition-colors cursor-pointer',
                viewLayout === 'grid' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-600',
              )}
              title="Grid view"
            >
              <Icon name="grid-2" style="solid" className="size-3" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewLayoutChange('list'); }}
              className={clsx(
                'p-1 rounded transition-colors cursor-pointer',
                viewLayout === 'list' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-600',
              )}
              title="List view"
            >
              <Icon name="list" style="solid" className="size-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
