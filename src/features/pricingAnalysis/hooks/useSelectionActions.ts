import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import type { SelectionAction, SelectionState } from '../store/selectionReducer';
import type { Approach, Method } from '../types/selection';
import { useSaveEditingSelection } from '../store/saveEditingSelection';
import { pricingAnalysisKeys } from '../api/queryKeys';

type MethodKey = { approachType: string; methodType: string };

export function useSelectionActions({
  state,
  dispatch,
  pricingAnalysisId,
  groupId,
}: {
  state: SelectionState;
  dispatch: React.Dispatch<SelectionAction>;
  pricingAnalysisId: string;
  groupId: string;
}) {
  const navigate = useNavigate();
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const qc = useQueryClient();

  // Deselect confirmation dialog
  const { isOpen: isConfirmOpen, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const [pendingDeselect, setPendingDeselect] = useState<MethodKey | null>(null);

  const enterEdit = () => dispatch({ type: 'EDIT_ENTER' });
  const cancelEdit = () => dispatch({ type: 'EDIT_CANCEL' });

  const toggleMethod = (arg: MethodKey) => {
    const appr = state.editDraft.find((a: Approach) => a.approachType === arg.approachType);
    const method = appr?.methods.find((m: Method) => m.methodType === arg.methodType);
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

  const { save: saveEditingSelectionFn } = useSaveEditingSelection();

  const saveEdit = async () => {
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

    const isEqualSelection = JSON.stringify(selections) === JSON.stringify(prevSelections);

    try {
      if (isEqualSelection) {
        dispatch({ type: 'SUMMARY_ENTER' });
        return;
      }

      const result = await saveEditingSelectionFn({
        pricingAnalysisId,
        groupId,
        selections,
      });

      dispatch({ type: 'EDIT_SAVE' });

      const isNew = !pricingAnalysisId;
      if (isNew && result.pricingAnalysisId) {
        navigate(
          `/appraisal/${appraisalId}/groups/${groupId}/pricing-analysis/${result.pricingAnalysisId}`,
          { replace: true },
        );
      }

      // Refresh from server so IDs appear in state via INIT effect
      await qc.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(result.pricingAnalysisId ?? pricingAnalysisId),
      });

      toast.success('Selection saved');
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? 'Failed to save selection');
    }
  };

  const selectCandidateMethod = (arg: MethodKey) => {
    const appr = state.summarySelected.find((a: Approach) => a.approachType === arg.approachType);
    const method = appr?.methods.find((m: Method) => m.methodType === arg.methodType);
    const appraisalValue = method?.appraisalValue ?? 0;

    if (appraisalValue <= 0) {
      toast.error('Please calculate appraisal value.');
      return;
    }
    dispatch({ type: 'SUMMARY_SELECT_METHOD', payload: arg });
  };

  const selectCandidateApproach = (approachType: string) => {
    const appr = state.summarySelected.find((a: Approach) => a.approachType === approachType);
    const method = appr?.methods.some((m: Method) => m.isCandidated);

    if (!method) {
      toast.error('Method does not select');
      return;
    }
    dispatch({ type: 'SUMMARY_SELECT_APPROACH', payload: { approachType } });
  };

  const saveSummary = async () => {
    try {
      dispatch({ type: 'EDIT_SAVE' });

      await qc.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(pricingAnalysisId),
      });

      toast.success('Selection saved');
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? 'Failed to save selection');
    }
  };

  const cancelPricingAccordion = () => {
    navigate(`/appraisal/${appraisalId}/property`);
  };

  const changeSystemCalculation = (method: boolean) => {
    dispatch({
      type: 'CHANGE_CALCULATION_METHOD',
      payload: { systemCalculationMethodType: method ? 'System' : 'FillIn' },
    });
  };

  return {
    enterEdit,
    cancelEdit,
    toggleMethod,
    saveEdit,
    selectCandidateMethod,
    selectCandidateApproach,
    saveSummary,
    cancelPricingAccordion,
    changeSystemCalculation,

    confirm: {
      isOpen: isConfirmOpen,
      pending: pendingDeselect,
      confirmDeselect,
      cancelDeselect,
    },
  };
}
