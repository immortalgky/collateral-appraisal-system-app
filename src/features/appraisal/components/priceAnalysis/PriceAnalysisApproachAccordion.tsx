import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useState } from 'react';
import { PriceAnalysisMethodCard } from './PriceAnalysisMethodCard';
import { useSelectionDispatch } from './PriceAnalysisAccordion';
import { PriceAnalysisApproachCard } from './PriceAnalysisApproachCard';
import { useDisclosure } from '@/shared/hooks/useDisclosure';

interface PriceAnalysisApproachAccordian {
  viewMode: 'editing' | 'summary';
  approach: any;
  onSelectMethod: (approachId: string, methodId: string) => void;
}

export const PriceAnalysisApproachAccordion = ({
  viewMode,
  approach,
  onSelectMethod,
}: PriceAnalysisApproachAccordian) => {
  const { isOpen: isApproachAccordianOpen, onToggle: onApproachAccordianChange } = useDisclosure();

  if (viewMode === 'editing') {
    return (
      <div>
        <PriceAnalysisApproachCard
          approach={approach}
          isOpen={isApproachAccordianOpen}
          onToggle={onApproachAccordianChange}
        />
        <div
          className={clsx(
            'flex flex-col gap-2 ml-4 pl-4 border-l border-base-300',
            'transition-all ease-in-out duration-300 overflow-hidden',
            isApproachAccordianOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0',
          )}
        >
          {/* method */}
          {approach.methods.map(method => (
            <PriceAnalysisMethodCard
              key={method.id}
              viewMode={viewMode}
              approachId={approach.id}
              method={method}
              onSelectMethod={onSelectMethod}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PriceAnalysisApproachCard
        approach={approach}
        isOpen={isApproachAccordianOpen}
        onToggle={onApproachAccordianChange}
      />

      <div className={clsx('transition-all ease-in-out duration-300 overflow-hidden')}>
        {/* method */}
        <div className="flex flex-col gap-2 ml-6 pl-4 border-l border-base-300">
          {approach.methods.map(method => (
            <PriceAnalysisMethodCard
              key={method.id}
              viewMode={viewMode}
              approachId={approach.id}
              method={method}
              onSelectMethod={onSelectMethod}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
