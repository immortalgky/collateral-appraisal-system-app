import { useEffect, useMemo, useState, type JSX } from 'react';
import { PriceAnalysisAccordion } from '@features/appraisal/components/priceAnalysis/features/selection/components/PriceAnalysisAccordion.tsx';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useSelectionFlowController } from '@features/appraisal/components/priceAnalysis/application/useSelectionFlowController.ts';
import { MethodSectionRenderer } from './MethodSectionRenderer';

export function PriceAnalysisTab({ groupId }: { groupId: string }): JSX.Element {
  const appraisalId = '00000000-0000-0000-0000-000000000001';

  /** State link between component `PriceAnalysisAccordion` and `ActiveMethodPanel`
   * - when user clicks on pencil button to start calculation on the method, will set methodId on this state
   * - the state will pass to `ActiveMethodPanel` to show method
   */
  const [activeCalculationMethod, setActiveCalculationMethod] = useState<
    { approachId: string; methodId: string; methodType: string } | undefined
  >(undefined);

  /** state to control accordian disclosure */
  const {
    isOpen: isPriceAnalysisAccordionOpen,
    onToggle: onPriceAnalysisAccordionChange,
    onClose: onPriceAnalysisAccordianClose,
  } = useDisclosure({ defaultIsOpen: true });

  /** functino to trigger calculation section */
  const handleOnStartCalculation = (args: {
    approachId: string;
    methodId: string;
    methodType: string;
  }) => {
    setActiveCalculationMethod({
      approachId: args.approachId,
      methodId: args.methodId,
      methodType: args.methodType,
    });
    onPriceAnalysisAccordianClose();
  };

  /** function to close price analysis page */
  const handleOnCloseSelectionPanel = () => {};

  const {
    state,

    // change calculatino mode
    changeSystemCalculation,

    isInitialDataLoading,

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

    // confirm dialog state
    confirm,
  } = useSelectionFlowController({
    appraisalId: appraisalId,
    groupId: groupId,
    onStartCalculation: handleOnStartCalculation,
    closeSelectionPanel: handleOnCloseSelectionPanel,
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
          {!!activeCalculationMethod && (
            <MethodSectionRenderer
              allFactors={priceAnalysisState.allFactors}
              methodId={priceAnalysisState.activeMethod?.methodId}
              methodType={priceAnalysisState.activeMethod?.methodType}
              property={priceAnalysisState.property}
              templates={priceAnalysisState.methodTemplates}
              marketSurveys={priceAnalysisState.marketSurveys}
              onCalculationMethodDirty={handleOnCalculationMethodDirty}
            />
          )}
        </div>
      )}
    </div>
  );
}
