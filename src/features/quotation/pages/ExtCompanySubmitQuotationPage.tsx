import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { useAuthStore } from '@/features/auth/store';
import {
  useGetQuotationById,
  useSubmitQuotation,
  useSaveDraftQuotation,
  useSubmitDraftToChecker,
} from '../api/quotation';
import { submitQuotationFormSchema, type SubmitQuotationFormValues } from '../schemas/quotation';
import QuotationStatusBadge from '../components/QuotationStatusBadge';
import RespondNegotiationPanel from '../components/RespondNegotiationPanel';
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
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
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
      (mySubmission.status === 'Draft' || mySubmission.status === 'PendingCheckerReview');

    const items = appraisals.map(ap => {
      const existingItem = hydrateFromSubmission
        ? mySubmission?.items?.find(it => it.appraisalId === ap.appraisalId)
        : undefined;

      return {
        appraisalId: ap.appraisalId,
        quotedPrice: existingItem?.quotedPrice,
        estimatedDays: existingItem?.estimatedDays ?? (undefined as unknown as number),
        feeAmount: existingItem?.feeAmount ?? undefined,
        discount: existingItem?.discount ?? undefined,
        negotiatedDiscount: existingItem?.negotiatedDiscount ?? undefined,
        vatPercent: existingItem?.vatPercent ?? 7,
      };
    });

    reset({
      quotationNumber: hydrateFromSubmission ? (mySubmission?.quotationNumber ?? '') : '',
      items,
      validUntil: hydrateFromSubmission ? (mySubmission?.validUntil ?? null) : null,
      remarks: hydrateFromSubmission ? (mySubmission?.remarks ?? null) : null,
      contactName: hydrateFromSubmission ? (mySubmission?.contactName ?? null) : null,
      contactEmail: hydrateFromSubmission ? (mySubmission?.contactEmail ?? null) : null,
      contactPhone: hydrateFromSubmission ? (mySubmission?.contactPhone ?? null) : null,
    });
    setIsParticipating(mySubmission?.status !== 'Declined');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appraisals.length, mySubmission?.id]);

  // ─── Computed grand total ─────────────────────────────────────────────────
  const watchedItems = useWatch({ control, name: 'items' });

  const netAmountsPerItem = useMemo(
    () =>
      (watchedItems ?? []).map(item =>
        deriveFeeTotals(
          item.feeAmount,
          item.discount,
          item.negotiatedDiscount,
          item.vatPercent,
        ).netAmount,
      ),
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
      onSuccess: () => toast.success('Draft saved'),
      onError: (err: unknown) => {
        const e = err as { apiError?: { detail?: string } };
        toast.error(e?.apiError?.detail ?? 'Failed to save draft');
      },
    });
  };

  const handleSubmitToChecker = () => {
    // First save the draft, then promote to PendingCheckerReview
    saveDraft(buildDraftPayload(), {
      onSuccess: () => {
        submitToChecker(
          { quotationRequestId: id ?? '', companyId },
          {
            onSuccess: () => {
              toast.success('Sent to checker');
              navigate('/ext/quotations');
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

  const handleSubmitQuotation = handleSubmit(values => {
    submitQuotation(
      {
        quotationNumber: values.quotationNumber,
        estimatedDays: Math.max(...values.items.map(i => i.estimatedDays), 1),
        items: values.items.map((item, idx) => {
          const { netAmount } = deriveFeeTotals(
            item.feeAmount ?? 0,
            item.discount ?? 0,
            item.negotiatedDiscount ?? null,
            item.vatPercent ?? 0,
          );
          return {
            quotationRequestItemId: '00000000-0000-0000-0000-000000000000',
            appraisalId: item.appraisalId,
            itemNumber: idx + 1,
            quotedPrice: netAmount,
            estimatedDays: item.estimatedDays,
            feeAmount: item.feeAmount,
            discount: item.discount,
            negotiatedDiscount: item.negotiatedDiscount,
            vatPercent: item.vatPercent,
          };
        }),
        validUntil: values.validUntil ?? null,
        remarks: values.remarks ?? null,
        contactName: values.contactName ?? null,
        contactEmail: values.contactEmail ?? null,
        contactPhone: values.contactPhone ?? null,
      },
      {
        onSuccess: () => {
          toast.success('Quotation submitted');
          navigate('/ext/quotations');
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

  // Editable when: quotation is Sent, not past due, and either no submission or an editable-status one
  const canEdit =
    !isDeclined &&
    !isSubmitted &&
    !isPastDue &&
    quotation?.status === 'Sent' &&
    (isMaker || isChecker);

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
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-5">
        <button
          type="button"
          onClick={() => navigate('/ext/quotations')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <Icon name="arrow-left" style="regular" className="size-4" />
          Back to Invitations
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              External Appraisal Company Quotation Information&nbsp;
              <span className="text-primary">[{roleLabel}]</span>
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
              <span>
                <span className="font-medium text-gray-700">Quotation ID:</span>{' '}
                {quotation.quotationNumber}
              </span>
              <span>·</span>
              <span>
                <span className="font-medium text-gray-700">Cut-Off Date:</span>{' '}
                {new Date(quotation.dueDate).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <QuotationStatusBadge status={quotation.status} />
            </div>
          </div>

          {mySubmission && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Submission status:</span>
              <QuotationStatusBadge status={mySubmission.status} />
            </div>
          )}
        </div>
      </div>

      {/* ── Respond negotiation panel (ext-company responds to admin's round) ─ */}
      {openNegotiation && mySubmission && (
        <div className="mb-5">
          <RespondNegotiationPanel
            quotationId={quotation.id}
            companyQuotationId={mySubmission.id}
            openNegotiation={openNegotiation}
          />
        </div>
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
          {/* Two-pane layout */}
          <div className="flex flex-col md:flex-row min-h-[600px]">
            {/* Left rail */}
            {isHydrated && (
              <AppraisalLeftRail
                appraisals={appraisals}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                netAmounts={netAmountsPerItem}
              />
            )}

            {/* Right pane */}
            <div className="flex-1 overflow-auto">
              {selectedAppraisal && selectedItem ? (
                <div className="p-5 space-y-6">
                  {/* Section 1: Appraisal Report Information (read-only) */}
                  <section aria-label="Appraisal Report Information">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1.5 border-b border-gray-100">
                      Appraisal Report Information
                    </h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block text-xs text-gray-500 mb-0.5">
                          Appraisal Report No.
                        </span>
                        <span className="font-medium text-gray-900">
                          {selectedAppraisal.appraisalNumber ?? '—'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500 mb-0.5">Property Type</span>
                        <span className="font-medium text-gray-900">
                          {selectedAppraisal.propertyType ?? '—'}
                        </span>
                      </div>
                      {selectedAppraisal.address && (
                        <div className="col-span-2">
                          <span className="block text-xs text-gray-500 mb-0.5">Address</span>
                          <span className="font-medium text-gray-900">
                            {selectedAppraisal.address}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Section 2: Attached Documents */}
                  {selectedDocs.length > 0 && (
                    <section aria-label="Attached Documents">
                      <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1.5 border-b border-gray-100">
                        Attach Document
                      </h2>
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left px-3 py-2 font-medium text-gray-500">
                                Document Type
                              </th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">
                                File Name
                              </th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500">
                                Level
                              </th>
                              <th className="w-10" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedDocs.map(doc => (
                              <tr key={doc.documentId} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-700">
                                  {doc.documentTypeName ?? '—'}
                                </td>
                                <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">
                                  {doc.fileName ?? '—'}
                                </td>
                                <td className="px-3 py-2 text-gray-500">{doc.level}</td>
                                <td className="px-3 py-2">
                                  {doc.fileName && (
                                    <button
                                      type="button"
                                      aria-label={`View ${doc.fileName}`}
                                      onClick={() =>
                                        setDocViewer({
                                          documentId: doc.documentId,
                                          fileName: doc.fileName ?? '',
                                          fileType: doc.fileType,
                                        })
                                      }
                                      className="text-primary hover:text-primary/70 transition-colors"
                                    >
                                      <Icon name="eye" style="regular" className="size-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
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
                    <input
                      type="hidden"
                      {...register(`items.${selectedIndex}.appraisalId`)}
                    />

                    <QuotationFeeBreakdown
                      control={control}
                      register={register}
                      index={selectedIndex}
                      readOnly={!canEdit}
                    />
                  </section>

                  {/* Section 4: Duration / Mandays */}
                  <section aria-label="Duration and Mandays">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1.5 border-b border-gray-100">
                      Duration
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor={`est-days-${selectedIndex}`}
                          className="block text-sm text-gray-600 mb-1"
                        >
                          Max Appraisal Duration (day)
                        </label>
                        <input
                          id={`est-days-${selectedIndex}`}
                          type="number"
                          min="1"
                          disabled={!canEdit}
                          aria-label="Max Appraisal Duration"
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-gray-50"
                          placeholder="30"
                          {...register(`items.${selectedIndex}.estimatedDays`, {
                            valueAsNumber: true,
                          })}
                        />
                        {errors.items?.[selectedIndex]?.estimatedDays && (
                          <p className="mt-1 text-xs text-danger">
                            {errors.items[selectedIndex].estimatedDays?.message}
                          </p>
                        )}
                      </div>
                    </div>
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
          <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 space-y-4">
            {/* Total + Participating */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <span className="text-sm font-semibold text-gray-700">Total Fee Amount:</span>
                <span className="ml-2 text-base font-bold text-primary">
                  {grandTotal > 0 ? THB.format(grandTotal) : '—'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  Participating <span className="text-danger">*</span>
                </span>
                <div className="flex items-center gap-2">
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
                </div>
              </div>
            </div>

            {/* Quotation Remark */}
            <div>
              <label htmlFor="quotation-remark" className="block text-sm font-medium text-gray-700 mb-1">
                Quotation Remark
              </label>
              <textarea
                id="quotation-remark"
                rows={3}
                disabled={!canEdit}
                aria-label="Quotation Remark"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none disabled:bg-gray-100"
                placeholder="Add overall remarks or conditions..."
                {...register('remarks')}
              />
            </div>

            {/* Quotation Number (required for submission) */}
            <div>
              <label htmlFor="quotation-number" className="block text-sm font-medium text-gray-700 mb-1">
                Your Quotation Reference <span className="text-danger">*</span>
              </label>
              <input
                id="quotation-number"
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-gray-100"
                placeholder="e.g. QT-2024-001"
                {...register('quotationNumber')}
              />
              {errors.quotationNumber && (
                <p className="mt-1 text-xs text-danger">{errors.quotationNumber.message}</p>
              )}
            </div>

            {/* Action bar — only shown when the form is editable */}
            {canEdit && (
              <QuotationActionBar
                variant={variant}
                isSavePending={isSavePending}
                isSubmitPending={isSubmitPending || isCheckerPending}
                onSaveDraft={handleSaveDraft}
                onSubmitToChecker={handleSubmitToChecker}
                onSubmitQuotation={handleSubmitQuotation}
              />
            )}
          </div>
        </div>
      )}

      {/* Withdraw button for submitted-but-open state */}
      {mySubmission && !isDeclined && !openNegotiation && quotation.status === 'Sent' && (
        <div className="mt-4 flex justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDeclineModalOpen(true)}
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            <Icon name="arrow-rotate-left" style="solid" className="size-4 mr-2" />
            Withdraw Bid
          </Button>
        </div>
      )}

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
  );
};

export default ExtCompanySubmitQuotationPage;
