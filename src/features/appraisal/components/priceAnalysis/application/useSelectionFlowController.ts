import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useDisclosure } from '@/shared/hooks/useDisclosure';
import {
  useSelectionDispatch,
  useSelectionState,
} from '@features/appraisal/components/priceAnalysis/features/selection/domain/selectionContext.tsx';
import { usePriceAnalysisGateway } from '@features/appraisal/components/priceAnalysis/features/selection/domain/priceAnalysisGateway.ts';
import toast from 'react-hot-toast';
import {
  useGetComparativeFactors,
  useGetPricingTemplate,
} from '@features/appraisal/components/priceAnalysis/api/api.ts';
import { createInitialState } from '@features/appraisal/components/priceAnalysis/features/selection/domain/createInitialState.ts';
import type { Method } from '@features/appraisal/components/priceAnalysis/features/selection/type.ts';
import { useNavigate } from 'react-router-dom'; // your use-case fn
import { useInitializePriceAnalysis } from '../shared/hooks/useInitializePriceAnalysis';
import { ALL_FACTORS } from '../data/allFactorsData';
import type { TemplateDetailType } from '@features/appraisal/components/priceAnalysis/schemas/v1.ts';
import { useSaveEditingSelection } from '@features/appraisal/components/priceAnalysis/features/selection/domain/saveEditingSelection.ts';

type MethodKey = { approachType: string; methodType: string };
type StartCalculationArgs = { approachId: string; methodId: string; methodType: string }; // what ActiveMethodPanel needs

function findMethodByType(state: any, k: MethodKey) {
  const appr = state.summarySelected.find((a: any) => a.approachType === k.approachType);
  const method = appr?.methods.find((m: any) => m.methodType === k.methodType);
  return { appr, method };
}

export function useSelectionFlowController(opts: {
  appraisalId: string;
  groupId: string;
  pricingAnalysisId: string;
  // UI boundary callbacks (keeps controller decoupled from specific components)
  onStartCalculation: (args: StartCalculationArgs) => void;
  closeSelectionPanel?: () => void; // e.g. close accordion
}) {
  console.log('Check useSelectionFlowController refresh!');

  const navigate = useNavigate();
  const state = useSelectionState();
  const dispatch = useSelectionDispatch();

  const gateway = usePriceAnalysisGateway();
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

  const { groupDetail, properties, marketSurveyDetails, pricingConfiguration, pricingSelection } =
    useMemo(() => {
      return initialData;
    }, [initialData]);

  useEffect(() => {
    if (isInitialDataLoading) return;

    console.log(initialData);

    if (
      !!groupDetail &&
      !!properties &&
      !!marketSurveyDetails &&
      !!pricingConfiguration &&
      !!pricingSelection
    ) {
      const approaches = createInitialState(pricingConfiguration, pricingSelection);
      /** (2) after complete preparing data, trigger first state 'INIT' with initial data */

      console.log(approaches, pricingConfiguration, pricingSelection);
      dispatch({
        type: 'INIT',
        payload: {
          approaches,
          groupDetails: groupDetail,
          property: properties,
          marketSurveys: marketSurveyDetails,
          allFactors: ALL_FACTORS, // TODO: replace by query all factors
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
  const [calcKey, setCalcKey] = useState<MethodKey | null>(null);

  /** (2) Derive IDs needed for the comparative factors call (from current state + calcKey) */
  const calcIds = useMemo(() => {
    if (!calcKey) return null;
    /** find approach ID and method ID in reducer's state */
    const { appr, method } = findMethodByType(state, calcKey);
    if (!appr?.id || !method?.id) return toast.error('Unique key not found!');
    return { appr, method };
  }, [state, calcKey]);

  /** (3.1) Fetch template that belonging to method*/
  const templateQuery = useGetPricingTemplate(state.activeMethod?.methodType);

  /** (3.2) Fetch comparative factors only when user initiated calculation and IDs exist */
  const comparativeFactorsQuery = useGetComparativeFactors(
    opts.appraisalId,
    state.activeMethod?.methodId,
  );
  const isEditMode = Boolean(comparativeFactorsQuery.data);

  useEffect(() => {
    if (!calcKey) return;
    if (!calcIds) return; // safety
    if (!templateQuery.data) return;

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
      setCalcKey(null);
      return;
    }

    /** if got comparative value, mapping, pass to calculation section.
     * if not, initail data
     */

    dispatch({
      type: 'CALCULATION_ENTER',
      payload: {
        allFactors: ALL_FACTORS,
        templates: templateQuery.data.templates as TemplateDetailType[],
        approachId: appr.id,
        methodId: method.id,
        methodType: method.methodType,
      },
    });

    opts.onStartCalculation({
      approachId: appr.approachId,
      methodId: method.id,
      methodType: method.methodType,
    });
    opts.closeSelectionPanel?.();

    setCalcKey(null);
  }, [calcKey, calcIds]);

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
        .filter((a: any) => a.methods.some((m: any) => m.isSelected))
        .map((a: any) => ({
          approachType: a.approachType,
          methodTypes: a.methods.filter((m: any) => m.isSelected).map((m: any) => m.methodType),
        }))
        .sort((a, b) => a.approachType.localeCompare(b.approachType)) ?? [];

    const prevSelections =
      state.summarySelected
        .map((a: any) => ({
          approachType: a.approachType,
          methodTypes: a.methods.map((m: any) => m.methodType),
        }))
        .sort((a, b) => a.approachType.toLocaleCompare(b.approachType)) ?? [];

    /** compare has any changes or not */
    const isEqualSelection = JSON.stringify(selections) === JSON.stringify(prevSelections);

    try {
      if (isEqualSelection) {
        dispatch({ type: 'SUMMARY_ENTER' });
        return;
      }

      console.log('Saving selection', selections);
      const pricingIds: Array<{ approachId: string; methodIds: Array<{ id: string }> }> =
        await saveEditingSelection({
          pricingAnalysisId: opts.pricingAnalysisId,
          groupId: opts.groupId,
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

    setCalcKey(k); // trigger query
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

  const saveCalculation = () => {};

  return {
    state,
    vm,
    isInitialDataLoading,

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

    // confirm dialog state
    confirm: {
      isOpen: isConfirmOpen,
      pending: pendingDeselect,
      confirmDeselect,
      cancelDeselect,
    },
  };
}
