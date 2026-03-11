import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import type { SelectionAction, SelectionState } from '../store/selectionReducer';
import type { Approach, Method } from '../types/selection';
import { useSaveEditingSelection } from '../store/saveEditingSelection';
import { pricingAnalysisKeys } from '../api/queryKeys';
import {
  useAddPricingAnalysisApproach,
  useAddPricingAnalysisMethod,
  useDeletePricingAnalysisMethod,
  useSelectMethod,
} from '../api';
import {
  isServerId,
  mapToServerApproachType,
  mapToServerMethodType,
} from '../store/saveEditingSelection';

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
        .filter((a: Approach) => a.methods.some((m: Method) => m.isIncluded))
        .map((a: Approach) => ({
          approachType: a.approachType,
          methodTypes: a.methods
            .filter((m: Method) => m.isIncluded)
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
        existingApproaches: state.editDraft,
      });

      dispatch({ type: 'EDIT_SAVE' });

      const isNew = !pricingAnalysisId;
      if (isNew && result.pricingAnalysisId) {
        navigate(
          `/appraisals/${appraisalId}/groups/${groupId}/pricing-analysis/${result.pricingAnalysisId}`,
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

  const selectMethodMutation = useSelectMethod();

  const selectCandidateMethod = (arg: MethodKey) => {
    const appr = state.summarySelected.find((a: Approach) => a.approachType === arg.approachType);
    const method = appr?.methods.find((m: Method) => m.methodType === arg.methodType);
    const appraisalValue = method?.appraisalValue ?? 0;

    if (appraisalValue <= 0) {
      toast.error('Please calculate appraisal value.');
      return;
    }
    dispatch({ type: 'SUMMARY_SELECT_METHOD', payload: arg });

    // Persist selection to server
    if (method?.id && isServerId(method.id)) {
      selectMethodMutation.mutate(
        { pricingAnalysisId, methodId: method.id },
        {
          onError: (err: any) => {
            toast.error(err?.apiError?.detail ?? 'Failed to select method');
          },
        },
      );
    }
  };

  const selectCandidateApproach = (approachType: string) => {
    const appr = state.summarySelected.find((a: Approach) => a.approachType === approachType);
    const method = appr?.methods.some((m: Method) => m.isSelected);

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
    navigate(`/appraisals/${appraisalId}/property`);
  };

  const changeSystemCalculation = (method: boolean) => {
    dispatch({
      type: 'CHANGE_CALCULATION_METHOD',
      payload: { systemCalculationMethodType: method ? 'System' : 'FillIn' },
    });
  };

  // ==================== Add Method ====================
  const addApproachMutation = useAddPricingAnalysisApproach();
  const addMethodMutation = useAddPricingAnalysisMethod();

  const addMethod = async (arg: MethodKey) => {
    try {
      const appr = state.editDraft.find((a: Approach) => a.approachType === arg.approachType);
      let approachId = appr?.id;

      // If approach doesn't have a server UUID, create it first
      if (!approachId || !isServerId(approachId)) {
        const res = await addApproachMutation.mutateAsync({
          pricingAnalysisId,
          request: { approachType: mapToServerApproachType(arg.approachType) },
        });
        approachId = res.id;
      }

      await addMethodMutation.mutateAsync({
        pricingAnalysisId,
        approachId,
        request: { methodType: mapToServerMethodType(arg.methodType) },
      });

      toast.success('Method added');
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? 'Failed to add method');
    }
  };

  // ==================== Delete Method ====================
  const deleteMethodMutation = useDeletePricingAnalysisMethod();
  const { isOpen: isDeleteOpen, onOpen: openDelete, onClose: closeDelete } = useDisclosure();
  const [pendingDelete, setPendingDelete] = useState<(MethodKey & { methodId: string; hasData: boolean }) | null>(null);

  const requestDeleteMethod = (arg: MethodKey) => {
    const appr = state.editDraft.find((a: Approach) => a.approachType === arg.approachType);
    const method = appr?.methods.find((m: Method) => m.methodType === arg.methodType);
    if (!method?.id || !isServerId(method.id) || !appr?.id || !isServerId(appr.id)) return;

    setPendingDelete({
      ...arg,
      methodId: method.id,
      hasData: (method.appraisalValue ?? 0) > 0,
    });
    openDelete();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    const appr = state.editDraft.find((a: Approach) => a.approachType === pendingDelete.approachType);
    if (!appr?.id || !isServerId(appr.id)) return;

    try {
      await deleteMethodMutation.mutateAsync({
        pricingAnalysisId,
        approachId: appr.id,
        methodId: pendingDelete.methodId,
      });
      toast.success('Method deleted');
      setPendingDelete(null);
      closeDelete();
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? 'Failed to delete method');
    }
  };

  const cancelDelete = () => {
    setPendingDelete(null);
    closeDelete();
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
    addMethod,
    requestDeleteMethod,

    confirm: {
      isOpen: isConfirmOpen,
      pending: pendingDeselect,
      confirmDeselect,
      cancelDeselect,
    },

    deleteConfirm: {
      isOpen: isDeleteOpen,
      pending: pendingDelete,
      hasData: pendingDelete?.hasData ?? false,
      confirmDelete,
      cancelDelete,
      isDeleting: deleteMethodMutation.isPending,
    },
  };
}
