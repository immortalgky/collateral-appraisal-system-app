import clsx from 'clsx';
import { PricingAnalysisApproachCard } from './PricingAnalysisApproachCard';
import { PricingAnalysisMethodCard } from './PricingAnalysisMethodCard';
import { Icon } from '@/shared/components';
import type { Approach } from '../../types/selection';
import type { PricingAnalysisConfigType } from '../../schemas';
import type { ViewMode } from '@features/pricingAnalysis/store/selectionReducer';
import { useState } from 'react';

interface PricingAnalysisApproachAccordionProps {
  viewMode: ViewMode;
  approach: Approach;
  onToggleMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;

  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;

  onAddMethod?: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  configMethods?: PricingAnalysisConfigType['methods'];
}

export const PricingAnalysisApproachAccordion = ({
  viewMode,
  approach,
  onToggleMethod,
  onSelectCalculationMethod,

  onSelectCandidateMethod,
  onSelectCandidateApproach,

  onAddMethod,
  onDeleteMethod,
  configMethods,
}: PricingAnalysisApproachAccordionProps) => {
  const hasSelectedMethods = approach.methods.some(m => m.isIncluded);
  const [isOpen, setIsOpen] = useState(viewMode === 'editing' ? true : false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Methods from config that are not yet selected in the approach
  const selectedMethodTypes = new Set(
    approach.methods.filter(m => m.isIncluded).map(m => m.methodType),
  );
  const availableMethods = (configMethods ?? []).filter(cm => !selectedMethodTypes.has(cm.methodType));

  if (viewMode === 'editing') {
    return (
      <div>
        <PricingAnalysisApproachCard
          viewMode={viewMode}
          approach={approach}
          isOpen={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
          onSelectCandidateApproach={onSelectCandidateApproach}
        />
        <div
          className={clsx(
            'flex flex-col gap-1 ml-4 pl-4 border-l-2',
            'transition-all ease-in-out duration-300 overflow-hidden',
            hasSelectedMethods ? 'border-primary/30' : 'border-gray-200',
            isOpen ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0',
          )}
        >
          {approach.methods
            .filter(m => m.isIncluded)
            .map(method => (
              <PricingAnalysisMethodCard
                key={method.methodType}
                viewMode={viewMode}
                approachId={approach.id}
                approachType={approach.approachType}
                method={method}
                onToggleMethod={onToggleMethod}
                onSelectCalculationMethod={onSelectCalculationMethod}
                onSelectCandidateMethod={onSelectCandidateMethod}
                onDeleteMethod={onDeleteMethod}
              />
            ))}

          {/* + Add Method inline list */}
          {onAddMethod && availableMethods.length > 0 && (
            <div>
              <button
                type="button"
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Icon name={isDropdownOpen ? 'minus' : 'plus'} style="solid" className="size-3" />
                <span className="font-medium">Add Method</span>
              </button>
              {isDropdownOpen && (
                <div className="flex flex-col gap-0.5 mt-1 ml-2 pl-3 border-l border-dashed border-gray-300">
                  {availableMethods.map(cm => (
                    <button
                      key={cm.methodType}
                      type="button"
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        onAddMethod({ approachType: approach.approachType, methodType: cm.methodType });
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Icon name={cm.icon ?? 'image'} style="solid" className="size-3 shrink-0" />
                      <span>{cm.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PricingAnalysisApproachCard
        viewMode={viewMode}
        approach={approach}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        onSelectCandidateApproach={onSelectCandidateApproach}
      />
      <div
        className={clsx(
          'flex flex-col gap-1 ml-4 pl-4 border-l-2',
          'transition-all ease-in-out duration-300 overflow-hidden',
          approach.isSelected ? 'border-primary/30' : 'border-gray-200',
          'max-h-96 mt-2',
        )}
      >
        {approach.methods.map(method => (
          <PricingAnalysisMethodCard
            key={method.methodType}
            viewMode={viewMode}
            approachId={approach.id}
            approachType={approach.approachType}
            method={method}
            onToggleMethod={onToggleMethod}
            onSelectCandidateMethod={onSelectCandidateMethod}
            onSelectCalculationMethod={onSelectCalculationMethod}
          />
        ))}
      </div>
    </div>
  );
};
