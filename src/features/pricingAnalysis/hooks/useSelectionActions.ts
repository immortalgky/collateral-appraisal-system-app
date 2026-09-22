import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useNavigate } from 'react-router-dom';
import { useBasePath } from '@/features/appraisal/context/AppraisalContext';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const tp = (key: string, options?: Record<string, unknown>) =>
  // i18next's overload resolution can't match a dynamic Record<string, unknown> against
  // its TOptions union when the key is a template-literal string; narrow cast on just the
  // options argument (not the return value) since no interpolation-safe overload exists.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  i18n.t(`pricingAnalysis:${key}`, options as any);

import type { SelectionAction, SelectionState } from '../store/selectionReducer';
import type { Approach, Method, MethodRole } from '../types/selection';
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

export type MethodKey = { approachType: string; methodType: string };

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
  // Properly-typed alternative to the module-level tp() below, for the one call site (the
  // role picker's success toast) that can't dodge tp()'s TS2345 the way the catch-block
  // calls do — see selectMethodRole. Not used to replace tp() itself; every other call in
  // this file stays as-is (pre-existing, out of scope here).
  const { t } = useTranslation('pricingAnalysis');

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

  const applySelectionMutation = useApplyPricingSelection();
  const updateMethodMutation = useUpdateMethodValue();
  const manualCostBreakdownMutation = useSetManualCostBreakdown();
  const uploadDocumentMutation = useUploadDocument();
  const updateRemarkMutation = useUpdateRemark();
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

  // Cost approach's role picker (Land/Building/LandAndBuilding/Machinery) — a discrete
  // choice, written immediately (unlike the debounced value/remark below) because multi-select
  // and the Cost formula row both key off Role server-side, same "reflect the real state right
  // away" reasoning as the calc-mode toggle in PricingAnalysisMethodBoardRow. No local dispatch:
  // the invalidate below re-INITs from the server, the same round trip that toggle already uses.
  const selectMethodRole = async (arg: MethodKey & { role: MethodRole }) => {
    const appr = state.summarySelected.find((a: Approach) => a.approachType === arg.approachType);
    const method = appr?.methods.find((m: Method) => m.methodType === arg.methodType);
    if (!method?.id || !isServerId(method.id) || !pricingAnalysisId) return;

    try {
      await updateMethodMutation.mutateAsync({
        id: pricingAnalysisId,
        methodId: method.id,
        request: { role: arg.role } as UpdateMethodRequestType,
      });
      await qc.invalidateQueries({ queryKey: pricingAnalysisKeys.detail(pricingAnalysisId) });
      // t(), not tp() — tp()'s untyped `key: string` param can't narrow to a literal, so
      // i18next infers its return as the union of every value in the namespace (groups
      // included), which is why every bare tp() call in this file already fails the same
      // TS2345 (the catch-block calls dodge it by `??`-combining with `err: any`, which
      // has no equivalent on this success path). useTranslation's t is generic over the
      // literal key here, so it comes back typed as plain string — no cast needed.
      toast.success(t('toasts.changed'));
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? tp('toasts.saveFailed'));
    }
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
    // No "every approach must have a selected method" rule here: only the approach chosen as
    // the group's value has to be complete, which the two checks below enforce — and which is
    // exactly what the domain requires (PricingAnalysis.SelectApproach). Demanding it of every
    // added approach blocked saving whenever any other approach was still being worked on.

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
      const dirtyRemarkKeys = state.dirtyMethodRemarkKeys;

      if (
        dirtyValueKeys.length > 0 ||
        dirtyBreakdownKeys.length > 0 ||
        dirtyRemarkKeys.length > 0
      ) {
        const dirtyMethods = state.summarySelected
          .flatMap(appr => appr.methods)
          .filter(
            m =>
              m.id &&
              (dirtyValueKeys.includes(m.id) ||
                dirtyBreakdownKeys.includes(m.id) ||
                dirtyRemarkKeys.includes(m.id)),
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
          // Exactly one endpoint writes the *value* per method — the breakdown endpoint and
          // updateMethod below never both fire for the same method, so the value is never
          // raced. Remark is a separate field on a separate write: when both the rate and the
          // remark are dirty on the same method, the breakdown call above lands first, then a
          // second call here sends remark alone (no methodValue — already written above) so
          // typing a note while adjusting a land rate isn't silently lost.
          if (dirtyBreakdownKeys.includes(method.id)) {
            await manualCostBreakdownMutation.mutateAsync({
              id: pricingAnalysisId,
              methodId: method.id,
              request: {
                landRatePerSqWa: method.landRatePerSqWa ?? null,
                indicatedValue: method.appraisalValue,
              } as SetManualCostBreakdownRequestType,
            });

            if (dirtyRemarkKeys.includes(method.id)) {
              await updateMethodMutation.mutateAsync({
                id: pricingAnalysisId,
                methodId: method.id,
                request: { remark: method.remark ?? '' } as UpdateMethodRequestType,
              });
            }
            continue;
          }

          // Remark folded into this same request when dirty — never a second write to the
          // same method (see onManualNoteSync's contract on PricingAnalysisMethodBoardRow).
          await updateMethodMutation.mutateAsync({
            id: pricingAnalysisId,
            methodId: method.id,
            request: {
              methodValue: method.appraisalValue,
              ...(dirtyRemarkKeys.includes(method.id) ? { remark: method.remark ?? '' } : {}),
            } as UpdateMethodRequestType,
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
      // One pair per selected method, not one per approach — a Cost approach can have several
      // (a Land-role method and a Building-role method selected together), so multiple entries
      // sharing an approachId compose correctly.
      //
      // `fullyDescribedApproachIds` is what makes an UNTICK reach the server. The pairs above
      // only ever say "this is selected"; a method the appraiser just unticked simply drops out
      // of the list, and the server's SelectMethod is additive within a Cost approach (it clears
      // only same-Role siblings), so the old selection survived and came straight back on the
      // next load. Naming the touched approaches tells the server those lists are complete, so
      // it clears them first and omission finally means deselection — for those approaches only,
      // never for ones this save did not touch.
      //
      // Note the two are built from the same dirty set but are NOT interchangeable: an approach
      // whose last method was unticked contributes no pairs at all, yet must still be named here
      // or the server would never hear about it.
      const dirtyApproachIds = state.dirtyMethodApproachTypes
        .map(
          (approachType: string) =>
            state.summarySelected.find((a: Approach) => a.approachType === approachType)?.id,
        )
        .filter((id): id is string => !!id && isServerId(id));

      const changedSelections = state.dirtyMethodApproachTypes.flatMap((approachType: string) => {
        const appr = state.summarySelected.find((a: Approach) => a.approachType === approachType);
        if (!appr?.id || !isServerId(appr.id)) return [];
        return appr.methods
          .filter((m: Method) => m.isSelected && m.id && isServerId(m.id))
          .map((m: Method) => ({ approachId: appr.id as string, methodId: m.id as string }));
      });

      // dirtyApproachIds, not changedSelections, decides whether to call: unticking an
      // approach's last method leaves no pairs to send but is exactly the change that has to
      // be persisted.
      const hasSelectionChange = dirtyApproachIds.length > 0 || state.dirtyApproachSelection;
      if (hasSelectionChange && finalApproach.id && isServerId(finalApproach.id)) {
        await applySelectionMutation.mutateAsync({
          pricingAnalysisId,
          selections: changedSelections,
          finalApproachId: finalApproach.id,
          fullyDescribedApproachIds: dirtyApproachIds,
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
          useSystemCalc: !isManualMode,
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

  // ==================== Add Method (batch — top-bar popover) ====================
  // Sequential, not Promise.all: two picks landing on the same brand-new approach must share
  // one created approachId rather than each creating their own. No toast here — the caller
  // (AddMethodPopover) knows the pick count and needs succeeded/failed to decide whether to
  // close the popover or leave the failed ones checked for retry.
  const addMethods = async (
    picks: MethodKey[],
  ): Promise<{ succeeded: MethodKey[]; failed: MethodKey[] }> => {
    const succeeded: MethodKey[] = [];
    const failed: MethodKey[] = [];
    const approachIdCache = new Map<string, string>();

    for (const pick of picks) {
      try {
        let approachId = approachIdCache.get(pick.approachType);
        if (!approachId) {
          const appr = state.editDraft.find((a: Approach) => a.approachType === pick.approachType);
          if (appr?.id && isServerId(appr.id)) {
            approachId = appr.id;
          } else {
            const res = await addApproachMutation.mutateAsync({
              pricingAnalysisId,
              request: { approachType: mapToServerApproachType(pick.approachType), weight: null },
            });
            approachId = res.id;
          }
          approachIdCache.set(pick.approachType, approachId);
        }

        await addMethodMutation.mutateAsync({
          pricingAnalysisId,
          approachId,
          request: { methodType: mapToServerMethodType(pick.methodType), status: null },
        });
        succeeded.push(pick);
      } catch {
        failed.push(pick);
      }
    }

    return { succeeded, failed };
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
    selectMethodRole,
    saveSummary,
    isSavingSummary: isSaving,
    cancelPricingAccordion,
    changeSystemCalculation,
    addMethod,
    addMethods,
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
