import { useLocation } from 'react-router-dom';
import { useEffect, useState, type JSX } from 'react';
import { PriceAnalysisAccordion } from '@features/appraisal/components/priceAnalysis/features/selection/components/PriceAnalysisAccordion.tsx';
import { ActiveMethodPanel } from '@features/appraisal/components/priceAnalysis/components/ActiveMethodPanel.tsx';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useSelectionFlowController } from '@features/appraisal/components/priceAnalysis/application/useSelectionFlowController.ts';

export function PriceAnalysisTab({ groupId }: { groupId: string }): JSX.Element {
  const appraisalId = '00000000-0000-0000-0000-000000000001';

  /** State link between component `PriceAnalysisAccordion` and `ActiveMethodPanel`
   * - when user clicks on pencil button to start calculation on the method, will set methodId on this state
   * - the state will pass to `ActiveMethodPanel` to show method
   */
  const [calculationMethod, setCalculationMethod] = useState<
    { approachId: string; methodId: string; methodType: string } | undefined
  >(undefined);

  /** state to control accordian disclosure */
  const {
    isOpen: isPriceAnalysisAccordionOpen,
    onToggle: onPriceAnalysisAccordionChange,
    onClose: onPriceAnalysisAccordianClose,
  } = useDisclosure({ defaultIsOpen: true });

  const handleOnStartCalculation = (args: {
    approachId: string;
    methodId: string;
    methodType: string;
  }) => {
    setCalculationMethod({
      approachId: args.approachId,
      methodId: args.methodId,
      methodType: args.methodType,
    });
    onPriceAnalysisAccordianClose();
  };

  const handleOnCloseSelectionPanel = () => {};

  const {
    state,

    // change calculatino mode
    changeSystemCalculation,

    initial,

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

  useEffect(() => {
    console.log('Reload');
  }, []);

  /** ================================= */
  /** Initial data                      */
  /** ================================= */

  const [isDirty, setIsDirty] = useState(false);
  const handleOnCalculationMethodDirty = (check: boolean) => {
    setIsDirty(check);
  };

  /** Query selected approach & method */
  // TODO:

  // When a user tries to switch method while there are unsaved changes,
  // we confirm first and only then allow the switch.
  const confirmDiscardUnsavedChanges = () => {
    return window.confirm(
      'You have unsaved changes in the current calculation method.\n\nDiscard changes and switch methods?',
    );
  };

  const handleOnSelectCalculationMethod = (
    nextApproachId: string | undefined,
    nextMethodId: string | undefined,
    nextMethodType: string,
  ) => {
    // no-op if selecting the same method
    if (nextMethodId === calculationMethod?.methodId) return;

    // TODO: If current method has unsaved changes, confirm before switching.
    if (isDirty && calculationMethod?.methodId) {
      const ok = confirmDiscardUnsavedChanges();
      if (!ok) return;

      // Clear dirty flag for the current method since we're discarding changes.
      // (The current method component will unmount after we switch.)
      setIsDirty(false);
    }

    // [!] right now, after save methods on editing mode and refresh page. Mock data not cover add method
    if (!!nextApproachId && !!nextMethodId) {
      setCalculationMethod({
        approachId: nextApproachId,
        methodId: nextMethodId,
        methodType: nextMethodType,
      });
      onPriceAnalysisAccordianClose();
    }
  };

  /**
   * How to manage property to send to each method?
   * (1) In case that we have 1 land multiple building, how to map?
   */

  useEffect(() => {
    if (initial.isLoading) {
      console.log('Initializing...');
      return;
    }
    console.log('Completed!');
  }, [initial.isLoading]);

  return (
    <div className="flex-1 min-w-0 min-h-0 flex-col">
      {!initial.isLoading && (
        <div>
          <PriceAnalysisAccordion
            state={state}
            appraisalId={appraisalId}
            group={{
              id: groupId ?? '',
              number: state.groupDetails?.groupNumber ?? 0,
              name: state.groupDetails?.groupName ?? '',
              description: state.groupDetails?.description ?? '',
              useSystemCalc: state.groupDetails?.useSystemCalc ?? true,
              properties: state.property ?? [],
            }}
            onSelectCalculationMethod={startCalculation}
            onSummaryModeSave={saveSummary}
            onEditModeSave={saveEdit}
            onToggleMethod={toggleMethod}
            onPriceAnalysisAccordionChange={onPriceAnalysisAccordionChange}
            isPriceAnalysisAccordionOpen={isPriceAnalysisAccordionOpen}
            onSystemCalculationChange={changeSystemCalculation}
            systemCalculationMode={state.systemCalculationMode}
            isConfirmDeselectedMethodOpen={confirm.isOpen}
            onConfirmDeselectMethod={confirm.confirmDeselect}
            onCancelDeselectMethod={confirm.cancelDeselect}
            onEnterEdit={enterEdit}
            onCancelEditMode={cancelEdit}
            onSelectCandidateMethod={selectCandidateMethod}
            onSelectCandidateApproach={selectCandidateApproach}
          />
          {!!calculationMethod && (
            <ActiveMethodPanel
              methodId={calculationMethod.methodId}
              methodType={calculationMethod.methodType}
              property={state.property}
              marketSurveys={state.marketSurveys}
              onCalculationMethodDirty={handleOnCalculationMethodDirty}
            />
          )}
        </div>
      )}
    </div>
  );
}
