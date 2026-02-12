import { Toggle } from '@/shared/components';
import { PriceAnalysisApproachAccordion } from './PriceAnalysisApproachAccordion';
import { useSelectionDispatch, useSelectionState } from '../domain/selectionContext';

interface PriceAnalysisApproachMethodSelectorProps {
  isSystemCalculation: boolean;
  onSystemCalculationChange: () => void;
  onEditModeSave: (data: any, dispatch: React.Dispatch<any>) => void;
  onSummaryModeSave: (data: any, dispatch: React.Dispatch<any>) => void;
  onSelectMethod: (approachId: string, methodId: string) => void;
  onSelectCalculationMethod: (approachId: string, methodId: string, methodType: string) => void;
}

export const PriceAnalysisApproachMethodSelector = ({
  isSystemCalculation,
  onSystemCalculationChange,
  onEditModeSave,
  onSummaryModeSave,

  onSelectMethod,
  onSelectCalculationMethod,
}: PriceAnalysisApproachMethodSelectorProps) => {
  const { viewMode, editDraft, summarySelected } = useSelectionState();
  const dispatch = useSelectionDispatch();

  return (
    <div className="flex flex-col overflow-hidden gap-4 h-full">
      {/* System Calculation */}
      <div className="flex items-center gap-4 justify-center">
        <span>Use System Calculation: </span>
        <Toggle
          options={['No', 'Yes']}
          checked={isSystemCalculation}
          onChange={onSystemCalculationChange}
        ></Toggle>
      </div>
      {isSystemCalculation ? (
        <div className="flex flex-col min-h-0 h-full">
          {viewMode === 'editing' && (
            <div className="flex flex-col w-full h-full min-h-0 gap-4">
              {/* Approach and methods */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                {editDraft?.map(appr => (
                  <PriceAnalysisApproachAccordion
                    key={appr.id}
                    viewMode={viewMode}
                    approach={appr}
                    onSelectMethod={onSelectMethod}
                  />
                ))}
              </div>

              {/* Footer Actions */}
              <div className="shrink-0 min-h-14 flex items-center justify-between py-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => dispatch({ type: 'EDIT_CANCEL' })}
                >
                  Cancel
                </button>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onEditModeSave(editDraft, dispatch)}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
          {viewMode === 'summary' && (
            <div className="flex flex-col w-full h-full min-h-0 gap-4">
              {/* summary mode */}

              {/* Approach and methods */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                <button
                  type="button"
                  className="flex justify-center items-center w-full p-2 border border-dashed border-primary text-primary rounded-md hover:bg-primary/10 duration-300 transition-all cursor-pointer"
                  onClick={() => dispatch({ type: 'EDIT_ENTER' })}
                >
                  Determine Approach and Method
                </button>
                {summarySelected?.map(appr => (
                  <PriceAnalysisApproachAccordion
                    key={appr.id}
                    viewMode={viewMode}
                    approach={{
                      ...appr,
                      methods: appr.methods.filter(method => method.isSelected),
                    }}
                    onSelectMethod={onSelectMethod}
                    onSelectCalculationMethod={onSelectCalculationMethod}
                  />
                ))}
              </div>

              {/* Footer Actions */}
              <div className="shrink-0 min-h-14 flex items-center justify-between py-2">
                <button type="button" className="btn btn-ghost" onClick={() => null}>
                  Cancel
                </button>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onSummaryModeSave(summarySelected, dispatch)}
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
