import clsx from 'clsx';
import { PriceAnalysisApproachCard } from './PriceAnalysisApproachCard';
import { PriceAnalysisMethodCard } from './PriceAnalysisMethodCard';
import type { Approach } from '../type';
import type { ViewMode } from '@features/appraisal/components/priceAnalysis/features/selection/domain/useReducer.tsx';
import { useState } from 'react';

interface PriceAnalysisApproachAccordian {
  viewMode: ViewMode;
  approach: Approach;
  onToggleMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;

  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;
}

export const PriceAnalysisApproachAccordion = ({
  viewMode,
  approach,
  onToggleMethod,
  onSelectCalculationMethod,

  onSelectCandidateMethod,
  onSelectCandidateApproach,
}: PriceAnalysisApproachAccordian) => {
  const [isOpen, setIsOpen] = useState(false);
  if (viewMode === 'editing') {
    return (
      <div>
        <PriceAnalysisApproachCard
          viewMode={viewMode}
          approach={approach}
          isOpen={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
          onSelectCandidateApproach={onSelectCandidateApproach}
        />
        <div
          className={clsx(
            'flex flex-col gap-2 ml-4 pl-4 border-l border-base-300',
            'transition-all ease-in-out duration-300 overflow-hidden',
            isOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0',
          )}
        >
          {/* method */}
          {approach.methods.map(method => (
            <PriceAnalysisMethodCard
              key={method.methodType}
              viewMode={viewMode}
              approachId={approach.id}
              approachType={approach.approachType}
              method={method}
              onToggleMethod={onToggleMethod}
              onSelectCalculationMethod={onSelectCalculationMethod}
              onSelectCandidateMethod={onSelectCandidateMethod}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PriceAnalysisApproachCard
        viewMode={viewMode}
        approach={approach}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        onSelectCandidateApproach={onSelectCandidateApproach}
      />
      <div
        className={clsx(
          'flex flex-col gap-2 ml-4 pl-4 border-l border-base-300',
          'transition-all ease-in-out duration-300 overflow-hidden',
          'max-h-96 mt-2',
        )}
      >
        {/* method */}
        {approach.methods.map(method => (
          <PriceAnalysisMethodCard
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
