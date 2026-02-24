import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useDisclosure } from '@/shared/hooks/useDisclosure';
import {
  useSelectionDispatch,
  useSelectionState,
} from '@features/appraisal/components/priceAnalysis/features/selection/domain/selectionContext.tsx';
import toast from 'react-hot-toast';
import { createInitialState } from '@features/appraisal/components/priceAnalysis/features/selection/domain/createInitialState.ts';
import type {
  Approach,
  Method,
} from '@features/appraisal/components/priceAnalysis/features/selection/type.ts';
import { useInitializePriceAnalysis } from '../hooks/useInitializePriceAnalysis';
import { ALL_FACTORS } from '../data/allFactorsData';
import { useSaveEditingSelection } from '@features/appraisal/components/priceAnalysis/features/selection/domain/saveEditingSelection.ts';
import type { PriceAnalysisSelectorState } from '../features/selection/domain/useReducer';
import { useInitializeCalculationMethod } from '../hooks/useInitailizeCalculationMethod';

type MethodKey = { approachType: string; methodType: string };

function findMethodByType(state: PriceAnalysisSelectorState, k: MethodKey) {
  const appr = state.summarySelected.find(
    (approach: Approach) => approach.approachType === k.approachType,
  );
  const method = appr?.methods.find((method: Method) => method.methodType === k.methodType);
  return { appr, method };
}

export function useSelectionFlowController(opts: {
  appraisalId: string;
  groupId: string;
  pricingAnalysisId: string;
  // UI boundary callbacks (keeps controller decoupled from specific components)
  closeSelectionPanel?: () => void;
  openSelectionPanel?: () => void;
}) {
  const state = useSelectionState();
  const dispatch = useSelectionDispatch();

  const qc = useQueryClient();

  /** (1) Initialize query data such as group detail, property under the group, market surveys, price analysis configuration file and, pricing data in database */
  const {
    initialData,
    isLoading: isInitialDataLoading,
    error: initialDataError,
  } = useInitializePriceAnalysis({
    appraisalId: opts.appraisalId,
    groupId: opts.groupId,
    pricingAnalysisId: opts.pricingAnalysisId,
  });

  const {
    groupDetail,
    properties,
    marketSurveyDetails,
    pricingConfiguration,
    pricingSelection,
    allFactors,
  } = useMemo(() => {
    return initialData;
  }, [initialData]);

  useEffect(() => {
    if (isInitialDataLoading) return;

    if (
      !!groupDetail &&
      !!properties &&
      !!marketSurveyDetails &&
      !!pricingConfiguration &&
      !!pricingSelection &&
      !!allFactors
    ) {
      const approaches = createInitialState(pricingConfiguration, pricingSelection);
      /** (2) after complete preparing data, trigger first state 'INIT' with initial data */

      dispatch({
        type: 'INIT',
        payload: {
          pricingAnalysisId: opts.pricingAnalysisId,
          approaches,
          groupDetails: groupDetail,
          property: properties,
          marketSurveys: marketSurveyDetails,
          allFactors: allFactors, // TODO: replace by query all factors
        },
      });
      /** (3) enter summary selection screen */
      dispatch({ type: 'SUMMARY_ENTER' });
    }
  }, [isInitialDataLoading]);

  const { isOpen: isConfirmOpen, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();

  const [pendingDeselect, setPendingDeselect] = useState<MethodKey | null>(null);

  /** Start calculation process */
  /** (1) When user clicks "Calculate" we set this, then the query below will run. */
  const calcKey = useMemo(() => {
    return {
      approachType: state.activeMethod?.approachType,
      methodType: state.activeMethod?.methodType,
    } as MethodKey;
  }, [state.activeMethod?.approachType, state.activeMethod?.methodType]);

  /** (2) Derive IDs needed for the comparative factors call (from current state + calcKey) */
  const calcIds = useMemo(() => {
    if (!state.activeMethod?.approachType || !state.activeMethod?.methodType) return;

    if (!calcKey) return null;

    /** find approach ID and method ID in reducer's state */
    const { appr, method } = findMethodByType(state, calcKey);
    if (!appr?.id || !method?.id) return toast.error('Unique key not found!');
    return { appr, method };
  }, [calcKey]);

  /** (3.1) Fetch template that belonging to method when methodType is existed */
  /** (3.2) Fetch comparative factors only when user initiated calculation and IDs exist */
  const {
    calculationMethodData,
    isLoading: isLoadingCalculationMethodData,
    error,
  } = useInitializeCalculationMethod({
    appraisalId: opts.appraisalId,
    methodId: state.activeMethod?.methodId ?? '',
    methodType: state.activeMethod?.methodType ?? '',
  });

  /** (4) mange result
   * (4.1) If got comparative value, mapping, pass to calculation section.
   * (4.2) If not, start new calulcation.
   */
  useEffect(() => {
    if (!state.activeMethod?.approachType || !state.activeMethod?.methodType) return;

    if (!calcIds) return; // safety

    if (isLoadingCalculationMethodData) return;

    /** Guard template data in case that we not allow user to do calculation if not choose method. so, if don't have any method to query, user still cannot do calculation */
    // if (!templateQuery.data) return;

    // if (comparativeQ.isLoading) return;
    //
    // if (comparativeQ.isError) {
    //   const msg = (comparativeQ.error as any)?.message ?? 'Failed to load comparative factors';
    //   toast.error(msg);
    //   setCalcKey(null);
    //   return;
    // }

    // success
    const { appr, method } = findMethodByType(state, calcKey);
    if (!method?.id || !appr?.id) {
      toast.error('Save selection first to generate method and approach IDs before calculation.');
      return;
    }

    /** (4.1) if got comparative value, mapping, pass to calculation section. */
    if (calculationMethodData.comparativeFactors) {
      dispatch({
        type: 'CALCULATION_ENTER',
        payload: {
          approachId: appr.id,
          methodId: method.id,
          methodType: method.methodType,
          allFactors: ALL_FACTORS,
          templates: calculationMethodData.pricingTemplate,
          comparativeFactors: calculationMethodData.comparativeFactors,
        },
      });
      opts.closeSelectionPanel?.();
      return;
    }

    dispatch({
      type: 'CALCULATION_ENTER',
      payload: {
        approachId: appr.id,
        methodId: method.id,
        methodType: method.methodType,
        allFactors: ALL_FACTORS,
        templates: calculationMethodData.pricingTemplate,
      },
    });
    opts.closeSelectionPanel?.();

    // TODO: don't forget to set active method to others when change method or cancel method
  }, [isLoadingCalculationMethodData]);

  const vm = useMemo(() => {
    const canFinalize =
      state.summarySelected.length > 0 &&
      state.summarySelected.every((a: any) =>
        a.methods.every((m: any) => (m.appraisalValue ?? 0) > 0),
      );

    return { canFinalize };
  }, [state.summarySelected]);

  const enterEdit = () => dispatch({ type: 'EDIT_ENTER' });
  const cancelEdit = () => dispatch({ type: 'EDIT_CANCEL' });

  const toggleMethod = (arg: MethodKey) => {
    const appr = state.editDraft.find((a: any) => a.approachType === arg.approachType);
    const method = appr?.methods.find((m: any) => m.methodType === arg.methodType);
    const appraisalValue = method?.appraisalValue ?? 0;

    if (appraisalValue > 0) {
      setPendingDeselect(arg);
      openConfirm();
      return;
    }

    dispatch({ type: 'EDIT_TOGGLE_METHOD', payload: arg });
  };

  const confirmDeselect = () => {
    if (!pendingDeselect) return;
    dispatch({ type: 'EDIT_TOGGLE_METHOD', payload: pendingDeselect });
    setPendingDeselect(null);
    closeConfirm();
  };

  const cancelDeselect = () => {
    setPendingDeselect(null);
    closeConfirm();
  };

  const { save: saveEditingSelection } = useSaveEditingSelection();
  const saveEdit = async () => {
    // Build API payload using natural keys (types). Backend generates IDs.
    const selections =
      state.editDraft
        .filter((a: Approach) => a.methods.some((m: Method) => m.isSelected))
        .map((a: Approach) => ({
          approachType: a.approachType,
          methodTypes: a.methods
            .filter((m: Method) => m.isSelected)
            .map((m: Method) => m.methodType),
        }))
        .sort((a, b) => a.approachType.localeCompare(b.approachType)) ?? [];

    const prevSelections =
      state.summarySelected
        .map((a: Approach) => ({
          approachType: a.approachType,
          methodTypes: a.methods.map((m: Method) => m.methodType),
        }))
        .sort((a, b) => a.approachType.localeCompare(b.approachType)) ?? [];

    /** compare has any changes or not */
    const isEqualSelection = JSON.stringify(selections) === JSON.stringify(prevSelections);

    try {
      if (isEqualSelection) {
        dispatch({ type: 'SUMMARY_ENTER' });
        return;
      }

      await saveEditingSelection({
        pricingAnalysisId: opts.pricingAnalysisId,
        selections,
      });

      dispatch({ type: 'EDIT_SAVE' });

      // refresh from server so IDs appear in state via your INIT effect
      await qc.invalidateQueries({ queryKey: ['pricing-analysis', opts.groupId] });

      toast.success('Selection saved');
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? 'Failed to save selection');
    }
  };

  const selectCandidateMethod = (arg: MethodKey) => {
    const appr = state.summarySelected.find((a: any) => a.approachType === arg.approachType);
    const method = appr?.methods.find((m: any) => m.methodType === arg.methodType);
    const appraisalValue = method?.appraisalValue ?? 0;

    if (appraisalValue <= 0) {
      toast.error('Please calculate appraisal value.');
      return;
    }
    dispatch({ type: 'SUMMARY_SELECT_METHOD', payload: arg });
  };

  const selectCandidateApproach = (approachType: string) => {
    const appr = state.summarySelected.find((a: any) => a.approachType === approachType);
    const method = appr?.methods.some((m: Method) => m.isCandidated);

    if (!method) {
      toast.error('Method does not select');
      return;
    }
    dispatch({ type: 'SUMMARY_SELECT_APPROACH', payload: { approachType } });
  };

  const startCalculation = (k: MethodKey) => {
    const { appr, method } = findMethodByType(state, k);

    if (!method?.id || !appr?.id) {
      toast.error('Save selection first to generate method and approach IDs before calculation.');
      return;
    }

    dispatch({
      type: 'CALCULATION_SELECTED',
      payload: {
        pricingAnalysisId: opts.pricingAnalysisId,
        approachId: appr.id,
        approachType: appr.approachType,
        methodId: method.id,
        methodType: method.methodType,
      },
    });
  };

  const saveSummary = async () => {
    try {
      /** replace by tanStackQuery */
      // await addCandidateApproachMutate({ groupId: groupId, data: data }); // convert to PriceAnalysisApproachRequest
      dispatch({ type: 'EDIT_SAVE' });

      // ✅ refresh from server so IDs appear in state via your INIT effect
      await qc.invalidateQueries({ queryKey: ['pricingAnalysis', opts.groupId] });

      toast.success('Selection saved');
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? 'Failed to save selection');
    }
  };

  const changeSystemCalculation = (method: boolean) => {
    if (method) {
      dispatch({
        type: 'CHANGE_CALCULATION_METHOD',
        payload: { systemCalculationMethodType: 'System' },
      });
      return;
    }

    dispatch({
      type: 'CHANGE_CALCULATION_METHOD',
      payload: { systemCalculationMethodType: 'FillIn' },
    });
    // clear data when change system calculation
    // pops up to confirm
  };

  const cancelCalculationMethod = () => {
    dispatch({ type: 'CALCULATION_CANCEL' });
    opts.openSelectionPanel?.();
  };

  return {
    state,
    vm,
    isInitialDataLoading,
    isLoadingCalculationMethodData,

    // change calculation mode
    changeSystemCalculation,

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
    confirm: {
      isOpen: isConfirmOpen,
      pending: pendingDeselect,
      confirmDeselect,
      cancelDeselect,
    },
  };
}
