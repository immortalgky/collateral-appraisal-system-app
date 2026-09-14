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
  useApplyPricingSelection,
  useSetManualCostBreakdown,
  useUpdateMethodValue,
  useUpdatePricingAnalysis,
  useUpdateRemark,
  useSetPricingAnalysisSystemCalc,
} from '../api';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import type {
  SetManualCostBreakdownRequestType,
  UpdateMethodRequestType,
  UpdatePricingAnalysisRequestType,
  UpdateRemarkRequestType,
} from '../schemas';
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

  // Per-method calc-mode toggle confirmation dialog
  const {
    isOpen: isToggleCalcModeConfirmOpen,
    onOpen: openToggleCalcModeConfirm,
    onClose: closeToggleCalcModeConfirm,
  } = useDisclosure();
  const [pendingToggleCalcMode, setPendingToggleCalcMode] = useState<MethodKey | null>(null);

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

  const applySelectionMutation = useApplyPricingSelection();
  const updateMethodMutation = useUpdateMethodValue();
  const manualCostBreakdownMutation = useSetManualCostBreakdown();
  const uploadDocumentMutation = useUploadDocument();
  const updateRemarkMutation = useUpdateRemark();
  const setSystemCalcMutation = useSetPricingAnalysisSystemCalc();
  const updatePricingAnalysisMutation = useUpdatePricingAnalysis();
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

    // Supporting documents are required whenever a value is entered by hand — either the
    // whole analysis is Manual, or at least one included method has been individually
    // overridden to manual (useSystemCalc === false). Existing docs + new PDFs are combined.
    const requiresManualEvidence =
      state.systemCalculationMode !== 'System' ||
      state.summarySelected.some((a: Approach) =>
        a.methods.some((m: Method) => m.isIncluded && !m.useSystemCalc),
      );
    if (requiresManualEvidence) {
      const totalDocuments = (state.documents?.length ?? 0) + pdfFiles.length;
      if (totalDocuments === 0) {
        toast.error(tp('toasts.documentRequired'));
        return { success: false, failedFileNames: getFailedFileNames() };
      }
    }

    setIsSaving(true);
    try {
      // ── Step 0: Documents ───────────────────────────────────────────────────
      // Evidence must land before the selection below "locks in" a final value — the
      // selection call propagates ApproachValue → FinalAppraisedValue on the server,
      // i.e. it's the actual finalization step. If we applied the selection first and a
      // PDF upload then failed, we'd be left with a finalized analysis missing the
      // supporting documents that manual mode required in the first place.

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
      // Must land before Step 2 — selecting a method now adopts that method's value
      // VERBATIM on the server, null included, so selecting one whose value hasn't been
      // saved yet actively CLEARS the approach value rather than leaving the old number.
      // No per-item try/catch here (unlike the PDF loop below) — a failed value save
      // must block the rest of the save.
      const dirtyValueKeys = state.dirtyManualValueKeys;
      const dirtyBreakdownKeys = state.dirtyCostBreakdownKeys;

      if (dirtyValueKeys.length > 0 || dirtyBreakdownKeys.length > 0) {
        const dirtyMethods = state.summarySelected
          .flatMap(appr => appr.methods)
          .filter(
            m => m.id && (dirtyValueKeys.includes(m.id) || dirtyBreakdownKeys.includes(m.id)),
          );

        for (const method of dirtyMethods) {
          if (!method.id || !isServerId(method.id)) continue;

          // A touched land rate goes to the breakdown endpoint, which stores the rate, the
          // title-deed land value and the depreciated building total alongside the price —
          // that per-component record is what makes the appraisal summary print ที่ดิน and
          // สิ่งปลูกสร้าง on separate rows, and a null rate there removes it again.
          //
          // Keyed on the rate having actually been edited, never on the method merely being
          // dirty: a Cost method whose price alone changed would otherwise be sent rate null
          // and lose a breakdown it never had — a MachineryCost method's FMV row, say.
          //
          // Exactly one endpoint per method. Both write the method value, so falling through
          // to updateMethod afterwards would race the two writes.
          if (dirtyBreakdownKeys.includes(method.id)) {
            await manualCostBreakdownMutation.mutateAsync({
              id: pricingAnalysisId,
              methodId: method.id,
              request: {
                landRatePerSqWa: method.landRatePerSqWa ?? null,
                appraisalPrice: method.appraisalValue,
              } as SetManualCostBreakdownRequestType,
            });
            continue;
          }

          await updateMethodMutation.mutateAsync({
            id: pricingAnalysisId,
            methodId: method.id,
            request: { methodValue: method.appraisalValue } as UpdateMethodRequestType,
          });
        }
      }

      // ── Step 2: Selection — changed methods AND the final approach, ONE request ──
      // Previously this was a loop of selectMethod calls followed by a separate
      // selectApproach, i.e. N+1 transactions: if selectApproach failed after the method
      // calls had committed, the analysis was left with the new methods but the old final
      // approach. The server now applies both atomically and raises the valuation-summary
      // event once instead of up to twice.
      //
      // Only approaches whose method choice actually changed are sent (unchanged ones keep
      // the selection from a previous save), but finalApproachId is always sent — it is what
      // the server propagates to FinalAppraisedValue.
      const changedSelections = state.dirtyMethodApproachTypes
        .map((approachType: string) => {
          const appr = state.summarySelected.find((a: Approach) => a.approachType === approachType);
          const selectedMethod = appr?.methods.find((m: Method) => m.isSelected);
          return appr?.id &&
            isServerId(appr.id) &&
            selectedMethod?.id &&
            isServerId(selectedMethod.id)
            ? { approachId: appr.id, methodId: selectedMethod.id }
            : null;
        })
        .filter((s): s is { approachId: string; methodId: string } => s !== null);

      const hasSelectionChange = changedSelections.length > 0 || state.dirtyApproachSelection;
      if (hasSelectionChange && finalApproach.id && isServerId(finalApproach.id)) {
        await applySelectionMutation.mutateAsync({
          pricingAnalysisId,
          selections: changedSelections,
          finalApproachId: finalApproach.id,
        });
      }

      // ── Step 3: Remark — persisted on the final selected method last, once ──
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

      // ── Step 4: Calculation mode — the Manual/System toggle, written LAST ────
      // The toggle is the user's explicit choice, so it has to outrank the implicit writes
      // the other save paths make: SetFinalValue/UpdateFinalValue force UseSystemCalc false,
      // SetManualCostBreakdown (step 1 above, for a touched land rate) forces it false too,
      // and SaveComparativeAnalysis forces it true — each as a side-effect of whichever
      // screen was saved last. Sending it after everything else makes the toggle the
      // authoritative value and repairs a flag an earlier save left inconsistent.
      // Sent unconditionally (it is idempotent) — the mode may be the only thing the user
      // changed, in which case every step above is a no-op and nothing else would persist it.
      await updatePricingAnalysisMutation.mutateAsync({
        pricingAnalysisId,
        request: {
          marketValue: null,
          appraisedValue: null,
          forcedSaleValue: null,
          useSystemCalc: state.systemCalculationMode === 'System',
        } as UpdatePricingAnalysisRequestType,
      });

      dispatch({ type: 'EDIT_SAVE' });
      // Clears every dirty tracker (values, cost breakdowns, selection) now
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

  const changeSystemCalculation = async (method: boolean) => {
    dispatch({
      type: 'CHANGE_CALCULATION_METHOD',
      payload: { systemCalculationMethodType: method ? 'System' : 'FillIn' },
    });

    try {
      await setSystemCalcMutation.mutateAsync({
        pricingAnalysisId,
        useSystemCalc: method,
      });
      await qc.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(pricingAnalysisId),
      });
    } catch (err) {
      dispatch({
        type: 'CHANGE_CALCULATION_METHOD',
        payload: { systemCalculationMethodType: method ? 'FillIn' : 'System' },
      });
      throw err;
    }
  };

  // Toggling a method's calc mode clears its value (and land value, if it has one) on either
  // direction — same reset the backend now applies (UpdateMethodCommandHandler). Always confirm
  // first, matching the existing analysis-wide toggle's unconditional-confirm behavior.
  const requestToggleMethodCalcMode = (arg: MethodKey) => {
    const appr = state.summarySelected.find((a: Approach) => a.approachType === arg.approachType);
    const method = appr?.methods.find((m: Method) => m.methodType === arg.methodType);
    if (!method?.id || !isServerId(method.id)) return;

    setPendingToggleCalcMode(arg);
    openToggleCalcModeConfirm();
  };

  // True when this specific toggle is the one that will trip UpdateMethodCommandHandler's
  // ClearDocuments() guard: toggling manual → system, the analysis is already System mode, and
  // no *other* method is still manual — i.e. this is the last one. Mirrors the backend check so
  // the confirm text only warns about document loss when it's actually about to happen.
  const willClearDocuments = (() => {
    if (!pendingToggleCalcMode) return false;
    if (state.systemCalculationMode !== 'System') return false;
    if ((state.documents?.length ?? 0) === 0) return false;

    const appr = state.summarySelected.find(
      (a: Approach) => a.approachType === pendingToggleCalcMode.approachType,
    );
    const method = appr?.methods.find(
      (m: Method) => m.methodType === pendingToggleCalcMode.methodType,
    );
    if (!method || method.useSystemCalc) return false;

    return state.summarySelected.every((a: Approach) =>
      a.methods.every(
        (m: Method) =>
          (a.approachType === pendingToggleCalcMode!.approachType &&
            m.methodType === pendingToggleCalcMode!.methodType) ||
          m.useSystemCalc,
      ),
    );
  })();

  const toggleCalcModeConfirmMessage: string = (() => {
    if (!pendingToggleCalcMode) return '';
    const appr = state.summarySelected.find(
      (a: Approach) => a.approachType === pendingToggleCalcMode.approachType,
    );
    const method = appr?.methods.find(
      (m: Method) => m.methodType === pendingToggleCalcMode.methodType,
    );
    const hasLandValue = method?.landRatePerSqWa != null;
    const key = hasLandValue
      ? willClearDocuments
        ? 'confirm.toggleMethodCalcModeValueAndLandDocuments'
        : 'confirm.toggleMethodCalcModeValueAndLand'
      : willClearDocuments
        ? 'confirm.toggleMethodCalcModeValueDocuments'
        : 'confirm.toggleMethodCalcModeValue';
    return String(tp(key));
  })();

  const confirmToggleMethodCalcMode = async () => {
    const arg = pendingToggleCalcMode;
    if (!arg) return;

    const appr = state.summarySelected.find((a: Approach) => a.approachType === arg.approachType);
    const method = appr?.methods.find((m: Method) => m.methodType === arg.methodType);
    if (!method?.id || !isServerId(method.id)) {
      setPendingToggleCalcMode(null);
      closeToggleCalcModeConfirm();
      return;
    }

    const prevUseSystemCalc = method.useSystemCalc;
    const nextUseSystemCalc = !prevUseSystemCalc;

    dispatch({
      type: 'SUMMARY_SET_METHOD_CALC_MODE',
      payload: {
        approachType: arg.approachType,
        methodType: arg.methodType,
        useSystemCalc: nextUseSystemCalc,
      },
    });

    try {
      await updateMethodMutation.mutateAsync({
        id: pricingAnalysisId,
        methodId: method.id,
        request: { useSystemCalc: nextUseSystemCalc } as UpdateMethodRequestType,
      });
    } catch (err: any) {
      // Revert on failure.
      dispatch({
        type: 'SUMMARY_SET_METHOD_CALC_MODE',
        payload: {
          approachType: arg.approachType,
          methodType: arg.methodType,
          useSystemCalc: prevUseSystemCalc,
        },
      });
      toast.error(err?.apiError?.detail ?? tp('toasts.saveFailed'));
    } finally {
      setPendingToggleCalcMode(null);
      closeToggleCalcModeConfirm();
    }
  };

  const cancelToggleMethodCalcMode = () => {
    setPendingToggleCalcMode(null);
    closeToggleCalcModeConfirm();
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

      // Adding a method invalidates every existing approach/method selection —
      // consumed by the INIT that follows the query invalidation above.
      dispatch({ type: 'PREPARE_SELECTION_RESET' });

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

      // Removing a method invalidates every existing approach/method selection —
      // consumed by the INIT that follows the query invalidation above.
      dispatch({ type: 'PREPARE_SELECTION_RESET' });

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
    isChangingSystemCalc: setSystemCalcMutation.isPending,
    requestToggleMethodCalcMode,
    addMethod,
    requestDeleteMethod,
    requestRemoveDocument,

    confirm: {
      isOpen: isConfirmOpen,
      pending: pendingDeselect,
      confirmDeselect,
      cancelDeselect,
    },

    toggleCalcModeConfirm: {
      isOpen: isToggleCalcModeConfirmOpen,
      pending: pendingToggleCalcMode,
      message: toggleCalcModeConfirmMessage,
      confirmToggle: confirmToggleMethodCalcMode,
      cancelToggle: cancelToggleMethodCalcMode,
      isToggling: updateMethodMutation.isPending,
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
