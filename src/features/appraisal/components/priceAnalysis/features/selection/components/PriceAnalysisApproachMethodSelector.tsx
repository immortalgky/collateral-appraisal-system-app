import { Toggle } from '@/shared/components';
import { PriceAnalysisApproachAccordion } from './PriceAnalysisApproachAccordion';
import type { PriceAnalysisSelectorState } from '@features/appraisal/components/priceAnalysis/features/selection/domain/useReducer.tsx';

interface PriceAnalysisApproachMethodSelectorProps {
  state: PriceAnalysisSelectorState;
  isSystemCalculation: string;
  onSystemCalculationChange: (check: boolean) => void;
  onEnterEdit: () => void;
  onEditModeSave: () => void;
  onCancelEditMode: () => void;
  onSummaryModeSave: () => void;
  onToggleMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;
  onCancelPricingAccordian: () => void;

  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;
}

export const PriceAnalysisApproachMethodSelector = ({
  state,
  isSystemCalculation,
  onSystemCalculationChange,
  onEnterEdit,
  onEditModeSave,
  onCancelEditMode,
  onSummaryModeSave,
  onToggleMethod,
  onSelectCalculationMethod,
  onCancelPricingAccordian,

  onSelectCandidateMethod,
  onSelectCandidateApproach,
}: PriceAnalysisApproachMethodSelectorProps) => {
  return (
    <div className="flex flex-col overflow-hidden gap-4 h-full">
      {/* System Calculation */}
      <div className="flex items-center gap-4 justify-center">
        <span>Use System Calculation: </span>
        <Toggle
          options={['No', 'Yes']}
          checked={isSystemCalculation === 'System'}
          onChange={onSystemCalculationChange}
        ></Toggle>
      </div>
      {isSystemCalculation ? (
        <div className="flex flex-col min-h-0 h-full">
          {state.viewMode === 'editing' && (
            <div className="flex flex-col w-full h-full min-h-0 gap-4">
              {/* Approach and methods */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                {state.editDraft?.map(appr => (
                  <PriceAnalysisApproachAccordion
                    key={appr.id}
                    viewMode={state.viewMode}
                    approach={appr}
                    onToggleMethod={onToggleMethod}
                    onSelectCalculationMethod={onSelectCalculationMethod}
                    onSelectCandidateApproach={onSelectCandidateApproach}
                    onSelectCandidateMethod={onSelectCandidateMethod}
                  />
                ))}
              </div>

              {/* Footer Actions */}
              <div className="shrink-0 min-h-14 flex items-center justify-between py-2">
                <button type="button" className="btn btn-ghost" onClick={() => onCancelEditMode()}>
                  Cancel
                </button>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onEditModeSave()}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
          {state.viewMode === 'summary' && (
            <div className="flex flex-col w-full h-full min-h-0 gap-4">
              {/* summary mode */}

              {/* Approach and methods */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                <button
                  type="button"
                  className="flex justify-center items-center w-full p-2 border border-dashed border-primary text-primary rounded-md hover:bg-primary/10 duration-300 transition-all cursor-pointer"
                  onClick={() => onEnterEdit()}
                >
                  Determine Approach and Method
                </button>
                {state.summarySelected?.map(appr => (
                  <PriceAnalysisApproachAccordion
                    key={appr.id}
                    viewMode={state.viewMode}
                    approach={{
                      ...appr,
                      methods: appr.methods.filter(method => method.isSelected),
                    }}
                    onToggleMethod={onToggleMethod}
                    onSelectCalculationMethod={onSelectCalculationMethod}
                    onSelectCandidateApproach={onSelectCandidateApproach}
                    onSelectCandidateMethod={onSelectCandidateMethod}
                  />
                ))}
              </div>

              {/* Footer Actions */}
              <div className="shrink-0 min-h-14 flex items-center justify-between py-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => onCancelPricingAccordian()}
                >
                  Cancel
                </button>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onSummaryModeSave()}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div></div>
      )}
      {/* Approach and Method Selection */}
    </div>
  );
};
