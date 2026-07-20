import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useNavigate } from 'react-router-dom';
import { useBasePath } from '@/features/appraisal/context/AppraisalContext';
import toast from 'react-hot-toast';
import i18n from '@/i18n';

const tp = (key: string, options?: Record<string, unknown>) =>
  // i18next's overload resolution can't match a dynamic Record<string, unknown> against
  // its TOptions union when the key is a template-literal string; narrow cast on just the
  // options argument (not the return value) since no interpolation-safe overload exists.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  i18n.t(`pricingAnalysis:${key}`, options as any);

import type { SelectionAction, SelectionState } from '../store/selectionReducer';
import type { Approach, Method } from '../types/selection';
import { useSaveEditingSelection } from '../store/saveEditingSelection';
import { pricingAnalysisKeys } from '../api/queryKeys';
import {
  useAddPricingAnalysisApproach,
  useAddPricingAnalysisMethod,
  useAttachPricingAnalysisDocument,
  useDeletePricingAnalysisMethod,
  useRemovePricingAnalysisDocument,
  useSelectApproach,
  useSelectMethod,
  useUpdateMethodValue,
  useUpdateRemark,
} from '../api';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import type { UpdateMethodRequestType, UpdateRemarkRequestType } from '../schemas';
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
  returnTo,
}: {
  state: SelectionState;
  dispatch: React.Dispatch<SelectionAction>;
  pricingAnalysisId: string;
  groupId: string;
  /** Override the "Back" navigation destination.
   *  Defaults to `${basePath}/property` (PropertyGroup subject).
   *  Pass `${basePath}/block-condo/model/:id` etc. for model subjects. */
  returnTo?: string;
}) {
  const navigate = useNavigate();
  const basePath = useBasePath();
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
        // returnTo is the model detail path (e.g. block-condo/model/:id) for model subjects;
        // for propertyGroup subjects fall back to the groups segment.
        const analysisPath = returnTo
          ? `${returnTo}/pricing-analysis/${result.pricingAnalysisId}`
          : `${basePath}/groups/${groupId}/pricing-analysis/${result.pricingAnalysisId}`;
        navigate(analysisPath, { replace: true });
      }

      // Refresh from server so IDs appear in state via INIT effect
      await qc.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(result.pricingAnalysisId ?? pricingAnalysisId),
      });

      toast.success(tp('toasts.selectionSaved'));
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? tp('toasts.saveFailed'));
    }
  };

  const selectMethodMutation = useSelectMethod();
  const selectApproachMutation = useSelectApproach();
  const updateMethodMutation = useUpdateMethodValue();
  const uploadDocumentMutation = useUploadDocument();
  const updateRemarkMutation = useUpdateRemark();
  const attachDocumentMutation = useAttachPricingAnalysisDocument();
  const removeDocumentMutation = useRemovePricingAnalysisDocument();
  const {
    isOpen: isRemoveDocumentOpen,
    onOpen: openRemoveDocument,
    onClose: closeRemoveDocument,
  } = useDisclosure();
  const [pendingRemoveDocument, setPendingRemoveDocument] = useState<{
    documentEntryId: string;
    fileName?: string | null;
  } | null>(null);

  const requestRemoveDocument = (documentEntryId: string, fileName?: string | null) => {
    setPendingRemoveDocument({ documentEntryId, fileName });
    openRemoveDocument();
  };

  const confirmRemoveDocument = async () => {
    if (!pendingRemoveDocument) return;

    try {
      await removeDocumentMutation.mutateAsync({
        pricingAnalysisId,
        documentEntryId: pendingRemoveDocument.documentEntryId,
      });
      toast.success(tp('toasts.documentRemoved'));
      setPendingRemoveDocument(null);
      closeRemoveDocument();
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? tp('toasts.documentRemoveFailed'));
    }
  };

  const cancelRemoveDocument = () => {
    setPendingRemoveDocument(null);
    closeRemoveDocument();
  };

  const selectCandidateMethod = (arg: MethodKey) => {
    const appr = state.summarySelected.find((a: Approach) => a.approachType === arg.approachType);
    const method = appr?.methods.find((m: Method) => m.methodType === arg.methodType);
    const appraisalValue = method?.appraisalValue ?? 0;

    if (appraisalValue <= 0) {
      toast.error(tp('toasts.calculateFirst'));
      return;
    }
    dispatch({ type: 'SUMMARY_SELECT_METHOD', payload: arg });
  };

  const selectCandidateApproach = (approachType: string) => {
    const appr = state.summarySelected.find((a: Approach) => a.approachType === approachType);
    const method = appr?.methods.some((m: Method) => m.isSelected);

    if (!method) {
      toast.error(tp('toasts.methodNotSelected'));
      return;
    }
    dispatch({ type: 'SUMMARY_SELECT_APPROACH', payload: { approachType } });
  };

  const [isSaving, setIsSaving] = useState(false);

  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  const getOrCreateSession = useCallback(async (): Promise<string> => {
    if (uploadSessionIdRef.current) {
      return uploadSessionIdRef.current;
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    sessionPromiseRef.current = createUploadSession()
      .then(response => {
        uploadSessionIdRef.current = response.sessionId;
        return response.sessionId;
      })
      .catch(error => {
        sessionPromiseRef.current = null;
        throw error;
      });

    return sessionPromiseRef.current;
  }, []);

  const saveSummary = async (
    pdfFiles: File[] = [],
    remark?: string,
  ): Promise<{ success: boolean; failedFileNames: string[] }> => {
    const unprocessedIndices = new Set<number>(pdfFiles.map((_, i) => i));
    const getFailedFileNames = () =>
      pdfFiles.filter((_, i) => unprocessedIndices.has(i)).map(f => f.name);
    const isEveryMethodSelected = state.summarySelected.every((a: Approach) =>
      a.methods.some((m: Method) => m.isSelected),
    );

    // validate every method under approach must be selected
    if (!isEveryMethodSelected) {
      toast.error(tp('toasts.methodNotSelected'));
      return { success: false, failedFileNames: getFailedFileNames() };
    }

    // Final approach must be selected
    const finalApproach = state.summarySelected.find((a: Approach) => a.isSelected);
    if (!finalApproach) {
      toast.error(tp('toasts.approachNotSelected'));
      return { success: false, failedFileNames: getFailedFileNames() };
    }

    const finalMethod = finalApproach.methods.find((m: Method) => m.isSelected);
    if (!finalMethod) {
      toast.error(tp('toasts.methodNotSelected'));
      return { success: false, failedFileNames: getFailedFileNames() };
    }

    // Manual mode requires at least one supporting document — existing docs already
    // attached to the analysis plus any new PDFs picked in this save, combined.
    const isManualMode = state.systemCalculationMode !== 'System';
    if (isManualMode) {
      const totalDocuments = (state.documents?.length ?? 0) + pdfFiles.length;
      if (totalDocuments === 0) {
        toast.error(tp('toasts.documentRequired'));
        return { success: false, failedFileNames: getFailedFileNames() };
      }
    }

    setIsSaving(true);
    try {
      // ── Step 0: Documents ───────────────────────────────────────────────────
      // Evidence must land before the selection below "locks in" a final value —
      // selectApproach propagates ApproachValue → FinalAppraisedValue on the server,
      // i.e. it's the actual finalization step. If we selected method/approach first
      // and a PDF upload then failed, we'd be left with a finalized analysis missing
      // the supporting documents that manual mode required in the first place.

      // Manual-mode PDF uploads: each raw File still needs to go through the Document
      // module's two-step flow (create session → multipart upload) before it has a
      // documentId we can attach to the pricing analysis. One upload session is created
      // for the whole batch (not per file), and each file's upload+attach is isolated in
      // its own try/catch so one bad file doesn't stop the others in the same batch —
      // but if *any* file fails, we stop before touching method/approach/remark below,
      // so the analysis is never finalized against an incomplete document set.
      if (pdfFiles.length > 0) {
        const sessionId = await getOrCreateSession();
        for (let i = 0; i < pdfFiles.length; i++) {
          const file = pdfFiles[i];
          try {
            const uploaded = await uploadDocumentMutation.mutateAsync({
              uploadSessionId: sessionId,
              file,
              documentType: 'PA_MANUAL',
              documentCategory: 'support',
            });
            await attachDocumentMutation.mutateAsync({
              pricingAnalysisId,
              documentId: uploaded.documentId,
              fileName: file.name,
            });
            unprocessedIndices.delete(i);
          } catch {
            // leave this index in unprocessedIndices so it's reported as failed/retryable
          }
        }

        if (unprocessedIndices.size > 0) {
          const failedFileNames = getFailedFileNames();
          toast.error(tp('toasts.someFilesFailed', { files: failedFileNames.join(', ') }));
          return { success: false, failedFileNames };
        }
      }

      // ── Step 1: Persist dirty manual-mode values ────────────────────────────
      // Must land before Step 2 (selectMethod) — the server's SelectMethod only
      // propagates ApproachValue/FinalAppraisedValue `if (targetMethod.MethodValue.HasValue)`;
      // it doesn't error if the value is missing, it just silently skips propagation.
      // No per-item try/catch here (unlike the PDF loop below) — a failed value save
      // must block the rest of the save, since selecting a method with a stale/missing
      // value would silently fail to propagate on the server.
      if (state.dirtyManualValueKeys.length > 0) {
        const dirtyMethods = state.summarySelected
          .flatMap(appr => appr.methods)
          .filter(m => m.id && state.dirtyManualValueKeys.includes(m.id));

        for (const method of dirtyMethods) {
          if (!method.id || !isServerId(method.id)) continue;
          await updateMethodMutation.mutateAsync({
            id: pricingAnalysisId,
            methodId: method.id,
            request: { methodValue: method.appraisalValue } as UpdateMethodRequestType,
          });
        }
      }

      // ── Step 2: Select the currently-selected method, but only for approaches ──
      // where that selection actually changed since the last successful save.
      // Must still happen before selectApproach below — the server's SelectApproach
      // guards on "approach already has a selected method", which for untouched
      // approaches is already satisfied from a prior save (or from server data on load).
      for (const approachType of state.dirtyMethodApproachTypes) {
        const appr = state.summarySelected.find((a: Approach) => a.approachType === approachType);
        const selectedMethod = appr?.methods.find((m: Method) => m.isSelected);
        if (selectedMethod?.id && isServerId(selectedMethod.id)) {
          await selectMethodMutation.mutateAsync({
            pricingAnalysisId,
            methodId: selectedMethod.id,
          });
        }
      }

      // ── Step 3: Select which approach is final — only if that choice changed ───
      if (state.dirtyApproachSelection && finalApproach.id && isServerId(finalApproach.id)) {
        await selectApproachMutation.mutateAsync({
          pricingAnalysisId,
          approachId: finalApproach.id,
        });
      }

      // ── Step 4: Remark — persisted on the final selected method last, once ──
      // everything it documents/justifies has already been committed. Compared
      // against the last-known server value (not just truthiness) so clearing the
      // box back to empty and saving actually propagates the clear.
      const nextRemark = remark ?? '';
      if (nextRemark !== (state.remark ?? '')) {
        await updateRemarkMutation.mutateAsync({
          pricingAnalysisId: pricingAnalysisId,
          request: { remark: nextRemark } as UpdateRemarkRequestType,
        });
      }

      dispatch({ type: 'EDIT_SAVE' });
      // Clears dirtyManualValueKeys/dirtyMethodApproachTypes/dirtyApproachSelection now
      // that everything dirty has landed server-side.
      dispatch({ type: 'SUMMARY_SAVE' });
      await qc.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(pricingAnalysisId),
      });

      toast.success(tp('toasts.selectionSaved'));
      return { success: true, failedFileNames: [] };
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? tp('toasts.saveFailed'));
      return { success: false, failedFileNames: getFailedFileNames() };
    } finally {
      setIsSaving(false);
    }
  };

  const cancelPricingAccordion = () => {
    navigate(returnTo ?? `${basePath}/property`);
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
          request: { approachType: mapToServerApproachType(arg.approachType), weight: null },
        });
        approachId = res.id;
      }

      await addMethodMutation.mutateAsync({
        pricingAnalysisId,
        approachId,
        request: { methodType: mapToServerMethodType(arg.methodType), status: null },
      });

      toast.success(tp('toasts.methodAdded'));
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? tp('toasts.saveFailed'));
    }
  };

  // ==================== Delete Method ====================
  const deleteMethodMutation = useDeletePricingAnalysisMethod();
  const { isOpen: isDeleteOpen, onOpen: openDelete, onClose: closeDelete } = useDisclosure();
  const [pendingDelete, setPendingDelete] = useState<
    (MethodKey & { methodId: string; hasData: boolean }) | null
  >(null);

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

    const appr = state.editDraft.find(
      (a: Approach) => a.approachType === pendingDelete.approachType,
    );
    if (!appr?.id || !isServerId(appr.id)) return;

    try {
      await deleteMethodMutation.mutateAsync({
        pricingAnalysisId,
        approachId: appr.id,
        methodId: pendingDelete.methodId,
      });
      toast.success(tp('toasts.methodDeleted'));
      setPendingDelete(null);
      closeDelete();
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? tp('toasts.failedReset'));
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
    isSavingSummary: isSaving,
    cancelPricingAccordion,
    changeSystemCalculation,
    addMethod,
    requestDeleteMethod,
    requestRemoveDocument,

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

    removeDocumentConfirm: {
      isOpen: isRemoveDocumentOpen,
      pending: pendingRemoveDocument,
      confirmRemove: confirmRemoveDocument,
      cancelRemove: cancelRemoveDocument,
      isRemoving: removeDocumentMutation.isPending,
    },
  };
}
