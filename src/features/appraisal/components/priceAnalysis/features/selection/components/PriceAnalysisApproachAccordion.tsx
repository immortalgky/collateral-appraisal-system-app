import clsx from 'clsx';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { PriceAnalysisApproachCard } from './PriceAnalysisApproachCard';
import { PriceAnalysisMethodCard } from './PriceAnalysisMethodCard';
import type { Approach } from '../type';

interface PriceAnalysisApproachAccordian {
  viewMode: 'editing' | 'summary';
  approach: Approach;
  onSelectMethod: (approachId: string, methodId: string) => void;
  onSelectCalculationMethod: (methodId: string, methodType: string) => void;
}

export const PriceAnalysisApproachAccordion = ({
  viewMode,
  approach,
  onSelectMethod,
  onSelectCalculationMethod,
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
              key={method.methodType}
              viewMode={viewMode}
              approachId={approach.id}
              approachType={approach.approachType}
              method={method}
              onSelectMethod={onSelectMethod}
            />
          ))}
        </div>
      </div>
    );
  }

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
            onSelectMethod={onSelectMethod}
            onSelectCalculationMethod={onSelectCalculationMethod}
          />
        ))}
      </div>
    </div>
  );
};
