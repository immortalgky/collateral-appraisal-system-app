import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import NumberInput from '@/shared/components/inputs/NumberInput';
import Textarea from '@/shared/components/inputs/Textarea';
import { useAuthStore } from '@/features/auth/store';
import {
  useGetQuotationById,
  useRespondNegotiation,
  useSaveDraftQuotation,
  useSubmitDraftToChecker,
  useSubmitQuotation,
  useTakeWorkflowAction,
} from '../api/quotation';
import { submitQuotationFormSchema, type SubmitQuotationFormValues } from '../schemas/quotation';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import DeclineInvitationModal from '../components/DeclineInvitationModal';
import SharedDocumentViewer from '../components/SharedDocumentViewer';
import AppraisalLeftRail from '../components/AppraisalLeftRail';
import QuotationFeeBreakdown, { deriveFeeTotals } from '../components/QuotationFeeBreakdown';
import { useQuotationIdFromRoute } from '../hooks/useQuotationIdFromRoute';

const THB = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });

// ─── Role-aware action bar ────────────────────────────────────────────────────

interface QuotationActionBarProps {
  variant: 'maker' | 'checker';
  isSavePending: boolean;
  isSubmitPending: boolean;
  onSaveDraft: () => void;
  onSubmitToChecker: () => void;
  onSubmitQuotation: () => void;
}

const QuotationActionBar = ({
  variant,
  isSavePending,
  isSubmitPending,
  onSaveDraft,
  onSubmitToChecker,
  onSubmitQuotation,
}: QuotationActionBarProps) => {
  const anyPending = isSavePending || isSubmitPending;
  return (
    <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={onSaveDraft}
        disabled={anyPending}
        isLoading={isSavePending}
      >
        <Icon name="floppy-disk" style="solid" className="size-4 mr-2" />
        Save Quotation
      </Button>

      {variant === 'maker' ? (
        <Button
          type="button"
          onClick={onSubmitToChecker}
          disabled={anyPending}
          isLoading={isSubmitPending}
        >
          <Icon name="paper-plane" style="solid" className="size-4 mr-2" />
          Submit to Checker
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onSubmitQuotation}
          disabled={anyPending}
          isLoading={isSubmitPending}
        >
          <Icon name="circle-check" style="solid" className="size-4 mr-2" />
          Submit Quotation
        </Button>
      )}
    </div>
  );
};

// ─── Document row ─────────────────────────────────────────────────────────────

interface DocViewerState {
  documentId: string;
  fileName: string;
  fileType?: string | null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * External company quotation submission page — Maker/Checker variant.
 *
 * Routes:
 *   Standalone:    /ext/quotations/:id  (gated by RoleProtectedRoute for ['ExtAdmin','ExtAppraisalChecker'])
 *   Task-wrapped:  /tasks/:taskId/quotation/submit
 *                  /tasks/:taskId/quotation/respond-negotiation
 *
 * Role-aware rendering:
 *   ExtAdmin            → Maker: Save draft + Submit to Checker
 *   ExtAppraisalChecker → Checker: Save draft + Submit Quotation
 *   Both roles          → Checker buttons take precedence
 */
const ExtCompanySubmitQuotationPage = () => {
  const id = useQuotationIdFromRoute();
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId?: string }>();
  const queryClient = useQueryClient();

  const navigateAfterSubmit = () => {
    if (taskId) {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['task-counts'] });
      navigate('/tasks');
    } else {
      navigate('/ext/quotations');
    }
  };
  const { i18n } = useTranslation();

  /** Locale-aware cutoff formatter — Thai Buddhist for th-*, `dd/MM/yyyy HH:mm` otherwise. */
  const formatCutoff = (dateString: string) => {
    const d = new Date(dateString);
    if (i18n.language?.startsWith('th')) {
      return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  // ─── Auth / role derivation ───────────────────────────────────────────────
  const currentUser = useAuthStore(state => state.user);
  const companyId = currentUser?.companyId ?? '';

  const isMaker = currentUser?.roles.includes('ExtAdmin') ?? false;
  const isChecker = currentUser?.roles.includes('ExtAppraisalChecker') ?? false;
  // Checker takes precedence when a user holds both roles
  const variant: 'maker' | 'checker' = isChecker ? 'checker' : 'maker';

  // ─── Data fetching ────────────────────────────────────────────────────────
  const { data: quotation, isLoading, isError } = useGetQuotationById(id);
  const { mutate: submitQuotation, isPending: isSubmitPending } = useSubmitQuotation(id ?? '');
  const { mutate: saveDraft, isPending: isSavePending } = useSaveDraftQuotation(id ?? '');
  const { mutate: submitToChecker, isPending: isCheckerPending } = useSubmitDraftToChecker(
    id ?? '',
  );
  const { mutate: respondNegotiation, isPending: isNegotiationPending } = useRespondNegotiation(
    id ?? '',
  );
  const { mutateAsync: takeWorkflowAction } = useTakeWorkflowAction();

  /**
   * Activity id of the per-company fan-out PendingTask in `quotation-workflow.json`.
   * Hard-coded here because it's a workflow contract — the JSON owns the stages,
   * the FE just needs to address the right activity when chaining the action call.
   */
  const QUOTATION_ACTIVITY_ID = 'ext-collect-submissions';

  /**
   * After a quotation data-update succeeds (save draft, submit, decline), advance the
   * workflow's per-company fan-out task by posting the matching action value. Best-effort:
   * an error here is logged but doesn't fail the user-visible operation, since the
   * data-side change has already committed.
   */
  const advanceWorkflowStage = async (actionValue: string) => {
    // The child quotation workflow's CorrelationId is the QuotationRequest.Id (set by the
    // QuotationStartedIntegrationEventConsumer when spawning). The action endpoint resolves
    // the PendingTask by correlationId fallback when the workflowInstanceId param doesn't
    // hit a matching instance — so passing quotation.id here works without needing the
    // child workflow's actual instance id denormalised onto the QuotationRequest.
    if (!quotation?.id || !companyId) return;
    try {
      await takeWorkflowAction({
        workflowInstanceId: quotation.id,
        activityId: QUOTATION_ACTIVITY_ID,
        companyId,
        actionValue,
      });
    } catch (err) {
      // Non-fatal: surface in console for diagnosis but don't pop a toast — the
      // primary data action succeeded. A periodic retry / engine watchdog would
      // pick up any stuck tasks.
      // eslint-disable-next-line no-console
      console.warn('Workflow stage advance failed', actionValue, err);
    }
  };

  // ─── Local state ─────────────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [docViewer, setDocViewer] = useState<DocViewerState | null>(null);

  const appraisals = quotation?.appraisals ?? [];

  // ─── RHF ─────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors },
  } = useForm<SubmitQuotationFormValues>({
    resolver: zodResolver(submitQuotationFormSchema),
    defaultValues: {
      quotationNumber: '',
      items: [],
    },
  });

  const { fields } = useFieldArray({ control, name: 'items' });

  // Find this company's existing submission (Draft, PendingCheckerReview, or Submitted)
  const mySubmission = useMemo(
    () => quotation?.companyQuotations?.find(cq => cq.companyId === companyId),
    [quotation, companyId],
  );

  // Find an open negotiation for this company's submission
  const openNegotiation = mySubmission?.negotiations?.find(n => !n.verb && !n.respondedAt);

  // Hydrate form from existing draft/submission once data arrives.
  // Priority: Draft or PendingCheckerReview → editable. Submitted → read-only display.
  const isHydrated = fields.length > 0;

  useEffect(() => {
    if (appraisals.length === 0) return;

    // Determine the initial item values — prefer from existing draft/submission
    const hydrateFromSubmission =
      mySubmission &&
      (mySubmission.status === 'Draft' ||
        mySubmission.status === 'PendingCheckerReview' ||
        mySubmission.status === 'Negotiating');

    const items = appraisals.map(ap => {
      const existingItem = hydrateFromSubmission
        ? mySubmission?.items?.find(it => it.appraisalId === ap.appraisalId)
        : undefined;

      return {
        appraisalId: ap.appraisalId,
        estimatedDays: existingItem?.estimatedDays ?? (undefined as unknown as number),
        feeAmount: existingItem?.feeAmount ?? undefined,
        discount: existingItem?.discount ?? undefined,
        negotiatedDiscount: existingItem?.negotiatedDiscount ?? undefined,
        vatPercent: existingItem?.vatPercent ?? 7,
        itemNotes: existingItem?.itemNotes ?? null,
      };
    });

    reset(
      {
        quotationNumber: hydrateFromSubmission ? (mySubmission?.quotationNumber ?? '') : '',
        items,
        validUntil: hydrateFromSubmission ? (mySubmission?.validUntil ?? null) : null,
        remarks: hydrateFromSubmission ? (mySubmission?.remarks ?? null) : null,
        contactName: hydrateFromSubmission ? (mySubmission?.contactName ?? null) : null,
        contactEmail: hydrateFromSubmission ? (mySubmission?.contactEmail ?? null) : null,
        contactPhone: hydrateFromSubmission ? (mySubmission?.contactPhone ?? null) : null,
      },
      // Preserve any in-progress edits across background refetches (e.g. after save-success
      // invalidates the query). Initial hydrate still populates because fields are pristine.
      { keepDirtyValues: true },
    );
    setIsParticipating(mySubmission?.status !== 'Declined');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appraisals.length, mySubmission?.id]);

  // ─── Computed grand total ─────────────────────────────────────────────────
  const watchedItems = useWatch({ control, name: 'items' });

  const netAmountsPerItem = useMemo(
    () =>
      (watchedItems ?? []).map(
        item =>
          deriveFeeTotals(item.feeAmount, item.discount, item.negotiatedDiscount, item.vatPercent)
            .netAmount,
      ),
    [watchedItems],
  );

  /** Gross fee amounts — shown in the sidebar per user request (not net). */
  const feeAmountsPerItem = useMemo(
    () => (watchedItems ?? []).map(item => Number(item.feeAmount) || 0),
    [watchedItems],
  );

  const grandTotal = useMemo(
    () =>
      netAmountsPerItem.reduce((sum, net) => {
        return sum + (isNaN(net) ? 0 : net);
      }, 0),
    [netAmountsPerItem],
  );

  // ─── Action handlers ──────────────────────────────────────────────────────

  /** Build the save-draft payload from current form values. */
  const buildDraftPayload = () => {
    const values = getValues();
    return {
      quotationRequestId: id ?? '',
      companyId,
      quotationNumber: values.quotationNumber,
      estimatedDays: Math.max(...values.items.map(i => i.estimatedDays ?? 1), 1),
      items: values.items.map((item, idx) => ({
        quotationRequestItemId: '00000000-0000-0000-0000-000000000000',
        appraisalId: item.appraisalId,
        itemNumber: idx + 1,
        feeAmount: item.feeAmount ?? 0,
        discount: item.discount ?? 0,
        negotiatedDiscount: item.negotiatedDiscount ?? null,
        vatPercent: item.vatPercent ?? 7,
        estimatedDays: item.estimatedDays ?? 0,
        itemNotes: item.itemNotes ?? null,
      })),
      validUntil: values.validUntil ?? null,
      remarks: values.remarks ?? null,
      contactName: values.contactName ?? null,
      contactEmail: values.contactEmail ?? null,
      contactPhone: values.contactPhone ?? null,
    };
  };

  const handleSaveDraft = () => {
    saveDraft(buildDraftPayload(), {
      onSuccess: () => toast.success('Quotation saved successfully'),
      onError: (err: unknown) => {
        const e = err as { apiError?: { detail?: string } };
        toast.error(e?.apiError?.detail ?? 'Failed to save draft');
      },
    });
  };

  const handleSubmitToChecker = () => {
    // Submitting to checker promotes the draft — enforce the duration cap here, same as final submit.
    const violations = findDurationCapViolations(getValues());
    if (violations.length > 0) {
      toast.error(`Estimated Mandays exceeds the maximum duration for: ${violations.join(', ')}`);
      return;
    }
    // First save the draft, then promote to PendingCheckerReview
    saveDraft(buildDraftPayload(), {
      onSuccess: () => {
        submitToChecker(
          { quotationRequestId: id ?? '', companyId },
          {
            onSuccess: async () => {
              // Chain the workflow action so the per-company task advances Maker → Checker.
              await advanceWorkflowStage('SubmitToChecker');
              toast.success('Sent to checker');
              navigateAfterSubmit();
            },
            onError: (err: unknown) => {
              const e = err as { apiError?: { detail?: string } };
              toast.error(e?.apiError?.detail ?? 'Failed to submit to checker');
            },
          },
        );
      },
      onError: (err: unknown) => {
        const e = err as { apiError?: { detail?: string } };
        toast.error(e?.apiError?.detail ?? 'Failed to save draft before submitting');
      },
    });
  };

  /**
   * Returns a list of appraisal numbers whose Estimated Mandays exceeds the admin-set cap.
   * Submit paths block on this; save-draft does not.
   */
  const findDurationCapViolations = (formValues: SubmitQuotationFormValues): string[] => {
    const violations: string[] = [];
    for (const item of formValues.items) {
      const ap = appraisals.find(a => a.appraisalId === item.appraisalId);
      const cap = ap?.maxAppraisalDays;
      if (cap != null && (item.estimatedDays ?? 0) > cap) {
        violations.push(ap?.appraisalNumber?.trim() || item.appraisalId.slice(0, 8));
      }
    }
    return violations;
  };

  /**
   * Decline the current negotiation round (verb=Reject). The CompanyQuotation is
   * withdrawn and the parent RFQ returns to UnderAdminReview. Backend publishes the
   * workflow resume event, so no advanceWorkflowStage call here. Confirmed via
   * ConfirmDialog (declineNegotiationOpen state).
   */
  const [isDeclineNegotiationOpen, setIsDeclineNegotiationOpen] = useState(false);

  const confirmDeclineNegotiation = () => {
    if (!openNegotiation || !mySubmission) {
      setIsDeclineNegotiationOpen(false);
      return;
    }

    respondNegotiation(
      {
        negotiationId: openNegotiation.id,
        companyQuotationId: mySubmission.id,
        verb: 'Reject',
        message: null,
      },
      {
        onSuccess: () => {
          toast.success('Negotiation round declined');
          setIsDeclineNegotiationOpen(false);
          navigateAfterSubmit();
        },
        onError: (err: unknown) => {
          const e = err as { apiError?: { detail?: string } };
          toast.error(e?.apiError?.detail ?? 'Failed to decline negotiation');
          setIsDeclineNegotiationOpen(false);
        },
      },
    );
  };

  /**
   * Submit a negotiation counter-proposal back to the bank. Mirrors the initial Submit
   * Quotation flow but goes straight from Maker → bank — no Checker hop during a
   * negotiation round. The backend publishes the workflow resume event itself, so
   * we don't call advanceWorkflowStage here.
   */
  const handleSubmitNegotiation = handleSubmit(
    values => {
      if (!openNegotiation || !mySubmission) return;

      const items = values.items.map(item => ({
        appraisalId: item.appraisalId,
        negotiatedDiscount:
          item.negotiatedDiscount == null || isNaN(Number(item.negotiatedDiscount))
            ? null
            : Number(item.negotiatedDiscount),
      }));

      // Per-item over-cap check (defensive; the schema's superRefine also catches this,
      // but a hidden tab's error would be silent without an explicit pre-flight).
      const overCap = values.items.find(item => {
        const fee = Number(item.feeAmount) || 0;
        const disc = Number(item.discount) || 0;
        const neg = Number(item.negotiatedDiscount) || 0;
        return fee > 0 && disc + neg > fee;
      });
      if (overCap) {
        const ap = appraisals.find(a => a.appraisalId === overCap.appraisalId);
        toast.error(
          `Discount + Negotiated Discount exceeds Fee Amount on ${
            ap?.appraisalNumber?.trim() || 'an appraisal'
          }`,
        );
        return;
      }

      const hasAnyDiscount = items.some(i => i.negotiatedDiscount != null && i.negotiatedDiscount > 0);
      if (!hasAnyDiscount) {
        toast.error('Enter a Negotiated Discount on at least one appraisal before submitting');
        return;
      }

      respondNegotiation(
        {
          negotiationId: openNegotiation.id,
          companyQuotationId: mySubmission.id,
          verb: 'Counter',
          message: values.remarks ?? null,
          items,
        },
        {
          onSuccess: () => {
            toast.success('Proposal sent to bank');
            navigateAfterSubmit();
          },
          onError: (err: unknown) => {
            const e = err as { apiError?: { detail?: string } };
            toast.error(e?.apiError?.detail ?? 'Failed to submit proposal');
          },
        },
      );
    },
    errors => {
      // Surface schema-validation failures (e.g. invalid Negotiated Discount on a tab the
      // user isn't currently looking at) so they don't appear to be silently ignored.
      const itemErrors = (errors.items ?? []) as Array<Record<string, { message?: string }> | undefined>;
      const idx = itemErrors.findIndex(e => e && Object.keys(e).length > 0);
      if (idx >= 0) {
        const ap = appraisals[idx];
        const firstMsg =
          Object.values(itemErrors[idx] ?? {}).find(e => e?.message)?.message ?? 'Invalid value';
        toast.error(`${ap?.appraisalNumber?.trim() || 'Appraisal'}: ${firstMsg}`);
        if (idx !== selectedIndex) setSelectedIndex(idx);
        return;
      }
      toast.error('Please fix the highlighted errors before submitting');
    },
  );

  const handleSubmitQuotation = handleSubmit(values => {
    const violations = findDurationCapViolations(values);
    if (violations.length > 0) {
      toast.error(`Estimated Mandays exceeds the maximum duration for: ${violations.join(', ')}`);
      return;
    }
    submitQuotation(
      {
        quotationNumber: values.quotationNumber,
        estimatedDays: Math.max(...values.items.map(i => i.estimatedDays), 1),
        items: values.items.map((item, idx) => ({
          quotationRequestItemId: '00000000-0000-0000-0000-000000000000',
          appraisalId: item.appraisalId,
          itemNumber: idx + 1,
          estimatedDays: item.estimatedDays,
          feeAmount: item.feeAmount,
          discount: item.discount,
          negotiatedDiscount: item.negotiatedDiscount,
          vatPercent: item.vatPercent,
          itemNotes: item.itemNotes ?? null,
        })),
        validUntil: values.validUntil ?? null,
        remarks: values.remarks ?? null,
        contactName: values.contactName ?? null,
        contactEmail: values.contactEmail ?? null,
        contactPhone: values.contactPhone ?? null,
      },
      {
        onSuccess: async () => {
          // Checker's "Submit" action terminates the per-company fan-out item with `Submitted`.
          await advanceWorkflowStage('Submit');
          toast.success('Quotation submitted');
          navigateAfterSubmit();
        },
        onError: (err: unknown) => {
          const e = err as { apiError?: { detail?: string } };
          toast.error(e?.apiError?.detail ?? 'Failed to submit quotation');
        },
      },
    );
  });

  // ─── Derived flags ────────────────────────────────────────────────────────
  const isDeclined = mySubmission?.status === 'Declined';
  const isSubmitted = mySubmission?.status === 'Submitted';
  const isPastDue = quotation ? new Date(quotation.dueDate) < new Date() : false;

  // Editable when:
  //   • Initial submission flow: quotation is Sent and user is Maker/Checker, OR
  //   • Negotiation flow: quotation is Negotiating and there's an open round for this company
  //     (user is Maker — we go straight back to the bank during a round, no Checker hop).
  const canEdit =
    !isDeclined &&
    !isSubmitted &&
    !isPastDue &&
    ((quotation?.status === 'Sent' && (isMaker || isChecker)) ||
      (quotation?.status === 'Negotiating' && !!openNegotiation && isMaker));

  /**
   * During a negotiation round, only the Negotiated Discount field is editable —
   * everything else (fee amount, base discount, estimated mandays, item notes,
   * quotation remark, contact info, participating toggle) is locked to the values
   * already submitted. This flag drives the `disabled` prop of those inputs while
   * leaving Negotiated Discount unlocked via QuotationFeeBreakdown's own gating.
   */
  const isNegotiatingLock = canEdit && !!openNegotiation;

  // ─── Participating toggle ─────────────────────────────────────────────────
  const [isParticipating, setIsParticipating] = useState(() => mySubmission?.status !== 'Declined');
  // Tracks whether the decline modal succeeded so onClose doesn't snap back
  const declineSucceededRef = useRef(false);

  const handleParticipatingToggle = (value: boolean) => {
    if (!value) {
      setIsDeclineModalOpen(true);
    } else {
      setIsParticipating(true);
    }
  };

  // ─── Selected appraisal ───────────────────────────────────────────────────
  const selectedAppraisal = appraisals[selectedIndex];
  const selectedItem = fields[selectedIndex];

  // Documents for the selected appraisal
  const selectedDocs = useMemo(
    () =>
      (quotation?.sharedDocuments ?? []).filter(
        doc => doc.appraisalId === selectedAppraisal?.appraisalId,
      ),
    [quotation?.sharedDocuments, selectedAppraisal?.appraisalId],
  );

  /**
   * Documents grouped by server-supplied section label (e.g. "Application Documents",
   * "Land and Building · Title No. 1"). Mirrors the DocumentChecklist page layout.
   */
  const docSectionGroups = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; titleNumber: string | null; docs: typeof selectedDocs }
    >();
    for (const doc of selectedDocs) {
      const label = doc.sectionLabel ?? 'Documents';
      const bucket = groups.get(label);
      if (bucket) {
        bucket.docs.push(doc);
      } else {
        groups.set(label, { label, titleNumber: doc.titleNumber ?? null, docs: [doc] });
      }
    }
    // Stable order: Application Documents first, then title sections in titleNumber order.
    return Array.from(groups.values()).sort((a, b) => {
      if (a.titleNumber === null && b.titleNumber !== null) return -1;
      if (a.titleNumber !== null && b.titleNumber === null) return 1;
      return (a.titleNumber ?? '').localeCompare(b.titleNumber ?? '');
    });
  }, [selectedDocs]);

  // ─── Loading / error states ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="triangle-exclamation" style="solid" className="w-12 h-12 text-red-400" />
        <p className="text-sm text-gray-600">Unable to load quotation invitation.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/ext/quotations')}>
          Back to Invitations
        </Button>
      </div>
    );
  }

  const roleLabel = isChecker ? 'Checker' : 'Maker';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable content area — owns the page scroll; action bar below sits at shrink-0 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="text-base font-semibold text-gray-900 leading-snug">
            External Appraisal Company Quotation Information{' '}
            <span className="text-primary">[{roleLabel}]</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
            <span>
              <span className="font-medium text-gray-700">Quotation ID:</span>{' '}
              {quotation.quotationNumber}
            </span>
            <span>·</span>
            <span>
              <span className="font-medium text-gray-700">Cut-Off Date:</span>{' '}
              {formatCutoff(quotation.dueDate)}
            </span>
          </div>
        </div>

        {/* ── Top banner ────────────────────────────────────────────────────────
            During a negotiation round, replace Special Instructions with the admin's
            note for this round so the maker has the most relevant context up top.
            Outside negotiation, show Special Instructions as before.                */}
        {openNegotiation ? (
          <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="comment-dots" style="solid" className="size-4 text-orange-600 shrink-0" />
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                Admin Negotiation Note — Round {openNegotiation.roundNumber}
              </span>
            </div>
            {openNegotiation.message ? (
              <p className="text-sm text-orange-900 whitespace-pre-wrap">{openNegotiation.message}</p>
            ) : (
              <p className="text-sm text-orange-700 italic">No note provided.</p>
            )}
            <p className="mt-2 text-xs text-orange-700 border-t border-orange-200 pt-2">
              Adjust the per-item <span className="font-medium">Discount (Negotiate)</span> below,
              then click <span className="font-medium">Submit Proposal</span> to send your response
              to the bank.
            </p>
          </div>
        ) : (
          quotation.specialRequirements && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon name="circle-exclamation" style="solid" className="size-4 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  Special Instructions
                </span>
              </div>
              <p className="text-sm text-amber-900 whitespace-pre-line">{quotation.specialRequirements}</p>
            </div>
          )
        )}

        {/* ── Declined banner ───────────────────────────────────────────────── */}
        {isDeclined && (
          <div className="rounded-xl border border-red-200 overflow-hidden mb-5">
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200">
              <Icon name="ban" style="solid" className="size-5 text-red-500" />
              <span className="text-sm font-semibold text-gray-900">Invitation Declined</span>
            </div>
            <div className="px-4 py-3 text-sm text-gray-500">
              You have declined this invitation. The bank has been notified.
            </div>
          </div>
        )}

        {/* ── Submitted read-only banner ────────────────────────────────────── */}
        {isSubmitted && !openNegotiation && (
          <div className="rounded-xl border border-green-200 overflow-hidden mb-5">
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-200">
              <Icon name="circle-check" style="solid" className="size-5 text-green-600" />
              <span className="text-sm font-semibold text-gray-900">Quotation Submitted</span>
            </div>
            <div className="px-4 py-4 space-y-3 text-sm text-gray-600">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Total Quoted Price</div>
                  <div className="font-semibold text-gray-900">
                    {mySubmission?.totalQuotedPrice != null
                      ? THB.format(mySubmission.totalQuotedPrice)
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Estimated Days</div>
                  <div className="font-semibold text-gray-900">
                    {mySubmission?.estimatedDays ?? '—'}
                  </div>
                </div>
              </div>
              {mySubmission?.remarks && (
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Remarks</div>
                  <div>{mySubmission.remarks}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Past due without submission ───────────────────────────────────── */}
        {isPastDue && !mySubmission && !isDeclined && (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <Icon name="clock" style="regular" className="size-10 text-gray-300" />
            <p className="text-sm text-gray-500">The submission deadline has passed.</p>
          </div>
        )}

        {/* ── Main two-pane form (visible when canEdit or draft/pending) ─────── */}
        {(canEdit || mySubmission?.status === 'PendingCheckerReview') && appraisals.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Two-pane layout — desktop uses CSS grid so the row's height is driven by the
              right pane; the rail's `min-h-0 overflow-hidden` prevents its intrinsic content
              from enlarging the row, and its inner list scrolls when it exceeds that height. */}
            <div className="flex flex-col md:grid md:grid-cols-[16rem_1fr] min-h-[600px]">
              {/* Left rail */}
              {isHydrated && (
                <AppraisalLeftRail
                  appraisals={appraisals}
                  selectedIndex={selectedIndex}
                  onSelect={setSelectedIndex}
                  feeAmounts={feeAmountsPerItem}
                />
              )}

              {/* Right pane — flows naturally; page-level scroll (Layout.tsx) handles overflow */}
              <div className="min-w-0">
                {selectedAppraisal && selectedItem ? (
                  <div className="p-5 space-y-6">
                    {/* Section 1: Appraisal Information (read-only) */}
                    <section aria-label="Appraisal Information">
                      <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1.5 border-b border-gray-100">
                        Appraisal Information
                      </h2>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="block text-xs text-gray-500 mb-0.5">
                            Appraisal Number
                          </span>
                          <span className="font-medium text-gray-900">
                            {selectedAppraisal.appraisalNumber?.trim() || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500 mb-0.5">Customer Name</span>
                          <span className="font-medium text-gray-900">
                            {selectedAppraisal.customerName ?? '—'}
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* Section 2: Attached Documents — grouped by section, mirroring DocumentChecklist. */}
                    {selectedDocs.length > 0 && (
                      <section aria-label="Attached Documents">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1.5 border-b border-gray-100">
                          Attach Document
                        </h2>
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full text-xs table-fixed">
                            <colgroup>
                              <col className="w-[24%]" />
                              <col className="w-[34%]" />
                              <col className="w-[18%]" />
                              <col />
                            </colgroup>
                            <thead className="bg-gray-100 text-[11px] uppercase tracking-wider text-gray-700 border-b-2 border-gray-300">
                              <tr>
                                <th className="text-left px-3 py-2.5 font-semibold">Type</th>
                                <th className="text-left px-3 py-2.5 font-semibold">File Name</th>
                                <th className="text-left px-3 py-2.5 font-semibold">Uploaded At</th>
                                <th className="text-left px-3 py-2.5 font-semibold">Notes</th>
                              </tr>
                            </thead>
                            {docSectionGroups.map(group => (
                              <tbody key={group.label} className="divide-y divide-gray-100">
                                <tr className="bg-gray-50/60">
                                  <td colSpan={4} className="px-3 py-1.5">
                                    <div className="flex items-center gap-2">
                                      <Icon
                                        name={group.titleNumber ? 'building' : 'file-lines'}
                                        style="solid"
                                        className="size-3 text-gray-400 shrink-0"
                                      />
                                      <span className="text-[11px] font-medium text-gray-600">
                                        {group.label}
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        ({group.docs.length})
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {group.docs.map(doc => (
                                  <tr key={doc.documentId} className="hover:bg-gray-50">
                                    <td
                                      className="px-3 py-2 text-gray-700 truncate"
                                      title={doc.documentTypeName ?? ''}
                                    >
                                      {doc.documentTypeName ?? '—'}
                                    </td>
                                    <td className="px-3 py-2 truncate" title={doc.fileName ?? ''}>
                                      {doc.fileName ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDocViewer({
                                              documentId: doc.documentId,
                                              fileName: doc.fileName ?? '',
                                              fileType: doc.fileType,
                                            })
                                          }
                                          className="text-primary hover:text-primary/70 hover:underline underline-offset-2 transition-colors text-left truncate max-w-full"
                                        >
                                          {doc.fileName}
                                        </button>
                                      ) : (
                                        <span className="text-gray-500">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 truncate">
                                      {doc.uploadedAt ? formatCutoff(doc.uploadedAt) : '—'}
                                    </td>
                                    <td
                                      className="px-3 py-2 text-gray-500 truncate italic"
                                      title={doc.notes ?? ''}
                                    >
                                      {doc.notes ?? '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            ))}
                          </table>
                        </div>
                      </section>
                    )}

                    {/* Section 3: Quotation Information — Fee Breakdown */}
                    <section aria-label="Quotation Information">
                      <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1.5 border-b border-gray-100">
                        Quotation Information — Appraisal Fee
                      </h2>

                      {/* Hidden appraisalId binding */}
                      <input type="hidden" {...register(`items.${selectedIndex}.appraisalId`)} />

                      <QuotationFeeBreakdown
                        control={control}
                        index={selectedIndex}
                        readOnly={!canEdit || !!openNegotiation}
                        isNegotiating={!!openNegotiation}
                      />
                    </section>

                    {/* Section 4: Duration / Mandays */}
                    <section aria-label="Duration and Mandays">
                      <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1.5 border-b border-gray-100">
                        Duration
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Admin-set cap — read-only. When set, company's Estimated Mandays must not exceed it. */}
                        <div>
                          <label
                            className="block text-sm text-gray-600 mb-1"
                            title="Set by the requester; you cannot change this"
                          >
                            Max Appraisal Duration (days)
                          </label>
                          <div className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600">
                            {selectedAppraisal?.maxAppraisalDays ?? '—'}
                          </div>
                        </div>

                        {/* Company's proposed mandays — editable, required. */}
                        <div>
                          <label
                            htmlFor={`est-mandays-${selectedIndex}`}
                            className="block text-sm text-gray-600 mb-1"
                          >
                            Estimated Mandays <span className="text-danger">*</span>
                          </label>
                          <Controller
                            control={control}
                            name={`items.${selectedIndex}.estimatedDays`}
                            render={({ field }) => (
                              <NumberInput
                                {...field}
                                id={`est-mandays-${selectedIndex}`}
                                aria-label="Estimated Mandays"
                                disabled={!canEdit || isNegotiatingLock}
                                decimalPlaces={0}
                                thousandSeparator={false}
                                maxIntegerDigits={3}
                                min={1}
                                error={errors.items?.[selectedIndex]?.estimatedDays?.message}
                              />
                            )}
                          />
                          {(() => {
                            const cap = selectedAppraisal?.maxAppraisalDays;
                            const entered = watchedItems?.[selectedIndex]?.estimatedDays;
                            if (cap != null && entered != null && entered > cap) {
                              return (
                                <p className="mt-1 text-xs text-danger">
                                  Exceeds the maximum duration set by the requester ({cap} days).
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </section>

                    {/* Section 5: Per-item Remark */}
                    <section aria-label="Appraisal Remark">
                      <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1.5 border-b border-gray-100">
                        Remark for this Appraisal
                      </h2>
                      <Textarea
                        disabled={!canEdit || isNegotiatingLock}
                        placeholder="Add any notes specific to this appraisal (conditions, assumptions, scope caveats)..."
                        maxLength={4000}
                        showCharCount
                        {...register(`items.${selectedIndex}.itemNotes`)}
                      />
                    </section>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-8 text-sm text-gray-400">
                    Select an appraisal from the list to begin.
                  </div>
                )}
              </div>
            </div>

            {/* Footer row */}
            <div className="border-t border-primary/20 bg-primary/5 px-5 py-4 space-y-4">
              {/* Total + Participating */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className="text-sm font-semibold text-gray-700">Total Fee Amount:</span>
                  <span className="ml-2 text-base font-bold text-primary">
                    {grandTotal > 0 ? THB.format(grandTotal) : '—'}
                  </span>
                </div>

                {/* Participating toggle hidden during negotiation — invitation acceptance
                    isn't being decided here; the company can only counter or decline
                    via the action bar below. */}
                {!isNegotiatingLock && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      Participating <span className="text-danger">*</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleParticipatingToggle(false)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          !isParticipating
                            ? 'bg-red-500 text-white border-red-500'
                            : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-500'
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => handleParticipatingToggle(true)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          isParticipating
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-300 text-gray-600 hover:border-primary hover:text-primary'
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quotation Remark */}
              <div>
                <Textarea
                  label="Quotation Remark"
                  disabled={!canEdit || isNegotiatingLock}
                  placeholder="Add overall remarks or conditions..."
                  maxLength={4000}
                  showCharCount
                  {...register('remarks')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Decline-this-round confirmation (negotiation flow) */}
        <ConfirmDialog
          isOpen={isDeclineNegotiationOpen}
          onClose={() => {
            if (!isNegotiationPending) setIsDeclineNegotiationOpen(false);
          }}
          onConfirm={confirmDeclineNegotiation}
          title="Decline this negotiation round?"
          message="Your quotation will be withdrawn and the bank will return to choosing another winner. This cannot be undone."
          confirmText="Decline Round"
          cancelText="Keep Negotiating"
          variant="danger"
          isLoading={isNegotiationPending}
        />

        {/* Decline / Withdraw modal */}
        <DeclineInvitationModal
          isOpen={isDeclineModalOpen}
          onClose={() => {
            setIsDeclineModalOpen(false);
            if (!declineSucceededRef.current) {
              // User cancelled without confirming — snap participating back to true
              setIsParticipating(true);
            }
            declineSucceededRef.current = false;
          }}
          onSuccess={() => {
            // Decline confirmed — leave isParticipating false; refetch will confirm via status
            declineSucceededRef.current = true;
            setIsParticipating(false);
            // Terminate the per-company fan-out item with the `Declined` outcome.
            // Both Maker and Checker stages expose a "Decline" action with that outcome,
            // so this works regardless of which stage the user is in.
            void advanceWorkflowStage('Decline');
          }}
          quotationId={quotation.id}
          companyId={companyId}
          mode={mySubmission && mySubmission.status !== 'Declined' ? 'withdraw' : 'decline'}
        />

        {/* Shared document viewer modal */}
        {docViewer && (
          <SharedDocumentViewer
            quotationRequestId={quotation.id}
            documentId={docViewer.documentId}
            fileName={docViewer.fileName}
            fileType={docViewer.fileType}
            isOpen={true}
            onClose={() => setDocViewer(null)}
          />
        )}
      </div>

      {/* ── Sticky action bar — shrink-0 sibling below the scrollable content (matches AdministrationPage) ── */}
      {canEdit && appraisals.length > 0 && (
        openNegotiation ? (
          /* Negotiation round — Decline this round + Submit Proposal. Maker → bank direct. */
          <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="danger"
              onClick={() => setIsDeclineNegotiationOpen(true)}
              disabled={isNegotiationPending}
            >
              <Icon name="ban" style="solid" className="size-4 mr-2" />
              Decline this round
            </Button>
            <Button
              type="button"
              onClick={handleSubmitNegotiation}
              disabled={isNegotiationPending}
              isLoading={isNegotiationPending}
            >
              <Icon name="paper-plane" style="solid" className="size-4 mr-2" />
              Submit Proposal
            </Button>
          </div>
        ) : (
          <QuotationActionBar
            variant={variant}
            isSavePending={isSavePending}
            isSubmitPending={isSubmitPending || isCheckerPending}
            onSaveDraft={handleSaveDraft}
            onSubmitToChecker={handleSubmitToChecker}
            onSubmitQuotation={handleSubmitQuotation}
          />
        )
      )}
    </div>
  );
};

export default ExtCompanySubmitQuotationPage;
