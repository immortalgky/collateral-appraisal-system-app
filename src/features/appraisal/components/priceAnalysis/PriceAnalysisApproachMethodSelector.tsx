import { Toggle } from '@/shared/components';
import { useSelectionDispatch, useSelectionState } from './PriceAnalysisAccordion';
import { PriceAnalysisApproachAccordion } from './PriceAnalysisApproachAccordion';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

export interface Method {
  id: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isSelected: boolean;
  isCandidated: boolean;
}

export interface Approach {
  id: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isCandidated: boolean; // if no method means not selected
  methods: Method[]; // selected methods from database
}

interface PriceAnalysisApproachMethodSelectorProps {
  isSystemCalculation: boolean;
  onSystemCalculationChange: () => void;
  onEditModeSave: (data: any, dispatch: React.Dispatch<any>) => void;
  onSummaryModeSave: (data: any, dispatch: React.Dispatch<any>) => void;
  onSelectMethod: (approachId: string, methodId: string) => void;
}

export const PriceAnalysisApproachMethodSelector = ({
  isSystemCalculation,
  onSystemCalculationChange,
  onEditModeSave,
  onSummaryModeSave,

  onSelectMethod,
}: PriceAnalysisApproachMethodSelectorProps) => {
  const { viewMode, editDraft, summarySelected } = useSelectionState();
  const dispatch = useSelectionDispatch();

  return (
    <div className="flex flex-col overflow-hidden gap-4 max-h-96">
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
        <div className="flex w-full">
          {viewMode === 'editing' && (
            <div className="flex flex-col w-full gap-4">
              {/* edit mode */}

              {/* Approach and methods */}
              <div className="flex flex-col overflow-y-auto w-full max-h-58 gap-2">
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
              <div className="flex w-full justify-between py-2">
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
            <div className="flex flex-col w-full gap-4">
              {/* summary mode */}
              <button
                type="button"
                className="flex justify-center items-center w-full p-2 border border-dashed border-gray-200 rounded-md hover:bg-gray-100 duration-300 transition-all cursor-pointer"
                onClick={() => dispatch({ type: 'EDIT_ENTER' })}
              >
                Determine Approach and Method
              </button>

              {/* Approach and methods */}
              <div className="flex flex-col overflow-y-auto w-full max-h-44 gap-2">
                {summarySelected?.map(appr => (
                  <PriceAnalysisApproachAccordion
                    key={appr.id}
                    viewMode={viewMode}
                    approach={{
                      ...appr,
                      methods: appr.methods.filter(method => method.isSelected),
                    }}
                    onSelectMethod={onSelectMethod}
                  />
                ))}
              </div>

              {/* Footer Actions */}
              <div className="flex w-full justify-between py-2">
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
