import clsx from 'clsx';
import { PricingAnalysisApproachCard } from './PricingAnalysisApproachCard';
import { PricingAnalysisMethodCard } from './PricingAnalysisMethodCard';
import type { ViewLayout } from './PricingAnalysisMethodCard';
import { Icon } from '@/shared/components';
import type { Approach } from '../../types/selection';
import type { PricingAnalysisConfigType } from '../../schemas';
import type { ViewMode } from '@features/pricingAnalysis/store/selectionReducer';
import { useState } from 'react';

interface PricingAnalysisApproachAccordionProps {
  viewMode: ViewMode;
  viewLayout?: ViewLayout;
  approach: Approach;
  onToggleMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;

  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;

  onAddMethod?: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  configMethods?: PricingAnalysisConfigType['methods'];
  onViewLayoutChange?: (layout: ViewLayout) => void;
  isManualMode?: boolean;
  onManualValueChange?: (arg: { approachType: string; methodType: string; value: number }) => void;
}

export const PricingAnalysisApproachAccordion = ({
  viewMode,
  viewLayout = 'grid',
  approach,
  onToggleMethod,
  onSelectCalculationMethod,

  onSelectCandidateMethod,
  onSelectCandidateApproach,

  onAddMethod,
  onDeleteMethod,
  configMethods,
  onViewLayoutChange,
  isManualMode,
  onManualValueChange,
}: PricingAnalysisApproachAccordionProps) => {
  const hasSelectedMethods = approach.methods.some(m => m.isIncluded);
  const [isOpen, setIsOpen] = useState(viewMode === 'editing' ? true : false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Methods from config that are not yet selected in the approach
  const selectedMethodTypes = new Set(
    approach.methods.filter(m => m.isIncluded).map(m => m.methodType),
  );
  const availableMethods = (configMethods ?? []).filter(cm => !selectedMethodTypes.has(cm.methodType));

  const includedMethods = approach.methods.filter(m => m.isIncluded);

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
        {isOpen && <div
          className={clsx(
            'flex flex-col gap-1 ml-4 pl-4 border-l-2 mt-2',
            hasSelectedMethods ? 'border-primary/30' : 'border-gray-200',
          )}
        >
          {includedMethods.map(method => (
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
        </div>}
      </div>
    );
  }

  // Summary mode — grid or list layout for methods
  const methodCount = approach.methods.length;
  const gridCols = methodCount >= 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div>
      <PricingAnalysisApproachCard
        viewMode={viewMode}
        viewLayout={viewLayout}
        approach={approach}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        onSelectCandidateApproach={onSelectCandidateApproach}
        onViewLayoutChange={onViewLayoutChange}
      />
      <div
        className={clsx(
          'mt-2 ml-4 pl-4 border-l-2',
          approach.isSelected ? 'border-primary/30' : 'border-gray-200',
        )}
      >
        {viewLayout === 'grid' ? (
          <div className={clsx('grid gap-2', gridCols)}>
            {approach.methods.map(method => (
              <PricingAnalysisMethodCard
                key={method.methodType}
                viewMode={viewMode}
                viewLayout="grid"
                approachId={approach.id}
                approachType={approach.approachType}
                method={method}
                onToggleMethod={onToggleMethod}
                onSelectCandidateMethod={onSelectCandidateMethod}
                onSelectCalculationMethod={onSelectCalculationMethod}
                isManualMode={isManualMode}
                onManualValueChange={onManualValueChange}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {approach.methods.map(method => (
              <PricingAnalysisMethodCard
                key={method.methodType}
                viewMode={viewMode}
                viewLayout="list"
                approachId={approach.id}
                approachType={approach.approachType}
                method={method}
                onToggleMethod={onToggleMethod}
                onSelectCandidateMethod={onSelectCandidateMethod}
                onSelectCalculationMethod={onSelectCalculationMethod}
                isManualMode={isManualMode}
                onManualValueChange={onManualValueChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
