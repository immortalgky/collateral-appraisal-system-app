import { useEffect, useMemo, useState } from 'react';
import { PriceAnalysisAccordion } from '@features/appraisal/components/priceAnalysis/features/selection/components/PriceAnalysisAccordion.tsx';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useSelectionFlowController } from '@features/appraisal/components/priceAnalysis/application/useSelectionFlowController.ts';
import { MethodSectionRenderer } from './MethodSectionRenderer';

interface PriceAnalysisTabProps {
  appraisalId: string;
  groupId: string;
  pricingAnalysisId: string;
}
export function PriceAnalysisTab({
  appraisalId,
  groupId,
  pricingAnalysisId,
}: PriceAnalysisTabProps) {
  /** State link between component `PriceAnalysisAccordion` and `ActiveMethodPanel`
   * - when user clicks on pencil button to start calculation on the method, will set methodId on this state
   * - the state will pass to `ActiveMethodPanel` to show method
   */

  /** state to control accordian disclosure */
  const {
    isOpen: isPriceAnalysisAccordionOpen,
    onToggle: onPriceAnalysisAccordionChange,
    onClose: onPriceAnalysisAccordianClose,
    onOpen: onPriceAnalysisAccordianOpen,
  } = useDisclosure({ defaultIsOpen: true });

  /** function to close price analysis page */
  const handleOnCloseSelectionPanel = () => {
    onPriceAnalysisAccordianClose();
  };

  const handleOnOpenSelectionPanel = () => {
    onPriceAnalysisAccordianOpen();
  };

  const {
    state,

    // change calculatino mode
    changeSystemCalculation,

    isInitialDataLoading,
    isLoadingCalculationMethodData,

    // edit mode
    enterEdit,
    cancelEdit,
    toggleMethod,
    saveEdit,

    // summary mode
    selectCandidateMethod,
    selectCandidateApproach,
    startCalculation,
    saveSummary,

    // calculation
    cancelCalculationMethod,

    // confirm dialog state
    confirm,
  } = useSelectionFlowController({
    appraisalId: appraisalId,
    groupId: groupId,
    pricingAnalysisId: pricingAnalysisId,
    closeSelectionPanel: handleOnCloseSelectionPanel,
    openSelectionPanel: handleOnOpenSelectionPanel,
  });

  const { state: priceAnalysisState } = useMemo(() => {
    return {
      state,
    };
  }, [state]);

  useEffect(() => {
    console.log('Reload');
  }, []);

  console.log('Check component refresh!');

  /** ================================= */
  /** Initial data                      */
  /** ================================= */

  const [isDirty, setIsDirty] = useState(false);
  const handleOnCalculationMethodDirty = (check: boolean) => {
    setIsDirty(check);
  };

  /**
   * How to manage property to send to each method?
   * (1) In case that we have 1 land multiple building, how to map?
   */

  useEffect(() => {
    if (isInitialDataLoading) {
      console.log('Initializing...');
      return;
    }
    console.log('Completed!');
  }, [isInitialDataLoading]);

  return (
    <div className="flex-1 min-w-0 min-h-0 flex-col">
      {!isInitialDataLoading && (
        <div>
          <PriceAnalysisAccordion
            state={priceAnalysisState}
            appraisalId={appraisalId}
            group={{
              id: groupId ?? '',
              number: priceAnalysisState.groupDetails?.groupNumber ?? 0,
              name: priceAnalysisState.groupDetails?.groupName ?? '',
              description: priceAnalysisState.groupDetails?.description ?? '',
              useSystemCalc: priceAnalysisState.groupDetails?.useSystemCalc ?? true,
              properties: priceAnalysisState.property ?? [],
            }}
            onSelectCalculationMethod={startCalculation}
            onSummaryModeSave={saveSummary}
            onEditModeSave={saveEdit}
            onToggleMethod={toggleMethod}
            onPriceAnalysisAccordionChange={onPriceAnalysisAccordionChange}
            isPriceAnalysisAccordionOpen={isPriceAnalysisAccordionOpen}
            onSystemCalculationChange={changeSystemCalculation}
            systemCalculationMode={priceAnalysisState.systemCalculationMode}
            isConfirmDeselectedMethodOpen={confirm.isOpen}
            onConfirmDeselectMethod={confirm.confirmDeselect}
            onCancelDeselectMethod={confirm.cancelDeselect}
            onEnterEdit={enterEdit}
            onCancelEditMode={cancelEdit}
            onSelectCandidateMethod={selectCandidateMethod}
            onSelectCandidateApproach={selectCandidateApproach}
          />
          {!isLoadingCalculationMethodData && (
            <MethodSectionRenderer
              state={state}
              onCalculationMethodDirty={handleOnCalculationMethodDirty}
              onCancelCalculationMethod={cancelCalculationMethod}
            />
          )}
        </div>
      )}
    </div>
  );
}
