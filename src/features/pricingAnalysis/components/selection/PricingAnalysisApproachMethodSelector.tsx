import { Icon, Toggle } from '@/shared/components';
import Modal from '@/shared/components/Modal';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { PricingAnalysisApproachAccordion } from './PricingAnalysisApproachAccordion';
import type { SelectionState } from '@features/pricingAnalysis/store/selectionReducer';
import type { PricingAnalysisConfigType } from '../../schemas';

interface DeleteConfirmState {
  isOpen: boolean;
  hasData: boolean;
  isDeleting: boolean;
  confirmDelete: () => void;
  cancelDelete: () => void;
}

interface PricingAnalysisApproachMethodSelectorProps {
  state: SelectionState;
  isSystemCalculation: string;
  onSystemCalculationChange: (check: boolean) => void;
  onEnterEdit: () => void;
  onEditModeSave: () => void;
  onCancelEditMode: () => void;
  onSummaryModeSave: () => void;
  onToggleMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;
  onCancelPricingAccordion: () => void;

  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;

  onAddMethod?: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  pricingConfiguration?: PricingAnalysisConfigType[];
  deleteConfirm?: DeleteConfirmState;
}

export const PricingAnalysisApproachMethodSelector = ({
  state,
  isSystemCalculation,
  onSystemCalculationChange,
  onEnterEdit,
  onEditModeSave,
  onCancelEditMode,
  onSummaryModeSave,
  onToggleMethod,
  onSelectCalculationMethod,
  onCancelPricingAccordion,

  onSelectCandidateMethod,
  onSelectCandidateApproach,

  onAddMethod,
  onDeleteMethod,
  pricingConfiguration,
  deleteConfirm,
}: PricingAnalysisApproachMethodSelectorProps) => {
  // Build a lookup of config methods per approach type
  const configMethodsByApproach = new Map(
    (pricingConfiguration ?? []).map(conf => [conf.approachType, conf.methods]),
  );
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
          {/* Edit modal */}
          <Modal
            isOpen={state.viewMode === 'editing'}
            onClose={() => { if (!deleteConfirm?.isOpen) onCancelEditMode(); }}
            title="Edit Approach & Method"
            size="lg"
          >
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              {state.editDraft?.map(appr => (
                <PricingAnalysisApproachAccordion
                  key={appr.id}
                  viewMode={state.viewMode}
                  approach={appr}
                  onToggleMethod={onToggleMethod}
                  onSelectCalculationMethod={onSelectCalculationMethod}
                  onSelectCandidateApproach={onSelectCandidateApproach}
                  onSelectCandidateMethod={onSelectCandidateMethod}
                  onAddMethod={onAddMethod}
                  onDeleteMethod={onDeleteMethod}
                  configMethods={configMethodsByApproach.get(appr.approachType)}
                />
              ))}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end pt-4 mt-4 border-t border-gray-200">
              <button type="button" className="btn btn-primary" onClick={() => onCancelEditMode()}>
                Close
              </button>
            </div>

            {/* Delete confirmation — must be inside Modal to be within Headless UI focus trap */}
            {deleteConfirm && (
              <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={deleteConfirm.cancelDelete}
                onConfirm={deleteConfirm.confirmDelete}
                title="Delete Method"
                message={
                  deleteConfirm.hasData
                    ? 'This method has calculated data. Deleting will permanently remove all results.'
                    : 'Are you sure you want to delete this method?'
                }
                confirmText="Delete"
                variant={deleteConfirm.hasData ? 'danger' : 'warning'}
                isLoading={deleteConfirm.isDeleting}
              />
            )}
          </Modal>

          {/* Summary view (always visible when not editing) */}
          <div className="flex flex-col w-full h-full min-h-0 gap-4">
            {/* Approach and methods */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
              <button
                type="button"
                className="flex justify-center items-center gap-2 w-full p-3 border border-dashed border-primary text-primary rounded-lg hover:bg-primary/10 duration-200 transition-all cursor-pointer font-medium"
                onClick={() => onEnterEdit()}
              >
                <Icon name="pen-to-square" style="regular" className="size-4" />
                Edit Approach & Method
              </button>
              {state.summarySelected?.map(appr => (
                <PricingAnalysisApproachAccordion
                  key={appr.id}
                  viewMode="summary"
                  approach={{
                    ...appr,
                    methods: appr.methods.filter(method => method.isIncluded),
                  }}
                  onToggleMethod={onToggleMethod}
                  onSelectCalculationMethod={onSelectCalculationMethod}
                  onSelectCandidateApproach={onSelectCandidateApproach}
                  onSelectCandidateMethod={onSelectCandidateMethod}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="shrink-0 min-h-14 flex items-center py-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onCancelPricingAccordion()}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
};
