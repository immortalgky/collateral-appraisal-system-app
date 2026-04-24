import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { useGetAppraisalQuotations } from '../api/administration';
import {
  useGetQuotationById,
  useSendQuotation,
  useSetSharedDocuments,
} from '@/features/quotation/api/quotation';
import { useGetRequestDocuments } from '@/features/request/api/documents';
import type { QuotationStatus } from '../types/administration';
import type { AppraisalSummaryDto, SharedDocumentSelectionDto } from '@/features/quotation/schemas/quotation';
import QuotationStatusBadge from '@/features/quotation/components/QuotationStatusBadge';
import AdminShortlistPanel from '@/features/quotation/components/AdminShortlistPanel';
import ShortlistSentPanel from '@/features/quotation/components/ShortlistSentPanel';
import NegotiationPanel from '@/features/quotation/components/NegotiationPanel';
import AppraisalContextPanel from '@/features/quotation/components/AppraisalContextPanel';

// ─── ShareDocumentsStep ───────────────────────────────────────────────────────

/**
 * State: outer key = appraisalId, inner key = documentId,
 * value = { level: 'RequestLevel' | 'TitleLevel' }
 */
type ShareSelections = Record<string, Record<string, { level: SharedDocumentSelectionDto['level'] }>>;

interface ShareDocumentsStepProps {
  appraisals: AppraisalSummaryDto[];
  selections: ShareSelections;
  onToggle: (appraisalId: string, documentId: string, level: SharedDocumentSelectionDto['level'], checked: boolean) => void;
}

const ShareDocumentsStep = ({ appraisals, selections, onToggle }: ShareDocumentsStepProps) => {
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const appraisal = appraisals[activeTabIdx];

  if (appraisals.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No appraisals to share documents for.</p>;
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto shrink-0">
        {appraisals.map((ap, idx) => {
          const apSelection = selections[ap.appraisalId] ?? {};
          const covered = Object.keys(apSelection).length >= 1;
          return (
            <button
              key={ap.appraisalId}
              type="button"
              onClick={() => setActiveTabIdx(idx)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
                activeTabIdx === idx
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {covered ? (
                <Icon name="circle-check" style="solid" className="size-3 text-green-500" />
              ) : (
                <Icon name="triangle-exclamation" style="solid" className="size-3 text-amber-400" />
              )}
              {ap.appraisalNumber ?? ap.appraisalId.slice(0, 8)}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      {appraisal && (
        <AppraisalDocTab
          key={appraisal.appraisalId}
          appraisal={appraisal}
          apSelection={selections[appraisal.appraisalId] ?? {}}
          onToggle={onToggle}
        />
      )}
    </div>
  );
};

interface AppraisalDocTabProps {
  appraisal: AppraisalSummaryDto;
  apSelection: Record<string, { level: SharedDocumentSelectionDto['level'] }>;
  onToggle: (appraisalId: string, documentId: string, level: SharedDocumentSelectionDto['level'], checked: boolean) => void;
}

const AppraisalDocTab = ({ appraisal, apSelection, onToggle }: AppraisalDocTabProps) => {
  const { data, isLoading } = useGetRequestDocuments(appraisal.requestId ?? undefined);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 px-3 text-xs text-gray-400">
        <Icon name="spinner" style="solid" className="size-3.5 animate-spin" />
        Loading documents...
      </div>
    );
  }

  const sections = data?.sections ?? [];
  const hasAnyUploadedDocs = sections.some(s => s.documents.some(d => d.documentId));

  if (!appraisal.requestId) {
    return (
      <div className="px-3 py-4 text-xs text-amber-600 flex items-center gap-1.5">
        <Icon name="triangle-exclamation" style="solid" className="size-3.5 shrink-0" />
        No request linked to this appraisal. Documents cannot be loaded.
      </div>
    );
  }

  if (!hasAnyUploadedDocs) {
    return (
      <div className="px-3 py-4 text-xs text-gray-400">
        No uploaded documents found for this request.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
      {sections.map((section, sIdx) => {
        const level: SharedDocumentSelectionDto['level'] =
          section.titleId == null ? 'RequestLevel' : 'TitleLevel';
        const uploadedDocs = section.documents.filter(d => d.documentId);

        if (uploadedDocs.length === 0) return null;

        const allSelected = uploadedDocs.every(d => !!apSelection[d.documentId!]);

        const handleSelectAll = (checked: boolean) => {
          uploadedDocs.forEach(d => onToggle(appraisal.appraisalId, d.documentId!, level, checked));
        };

        return (
          <div key={sIdx} className="px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                {section.sectionLabel}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => handleSelectAll(e.target.checked)}
                  className="size-3 accent-primary rounded"
                />
                <span className="text-[10px] text-gray-500">Select all</span>
              </label>
            </div>
            <div className="flex flex-col gap-1">
              {uploadedDocs.map(doc => (
                <label key={doc.documentId} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!apSelection[doc.documentId!]}
                    onChange={e => onToggle(appraisal.appraisalId, doc.documentId!, level, e.target.checked)}
                    className="size-3.5 accent-primary rounded shrink-0"
                  />
                  <span className="text-xs text-gray-800 truncate group-hover:text-primary">
                    {doc.fileName ?? doc.documentId}
                    {doc.documentTypeName && (
                      <span className="text-gray-400"> ({doc.documentTypeName})</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── QuotationSection ─────────────────────────────────────────────────────────

interface QuotationSectionProps {
  appraisalId: string;
  onCreateNew: () => void;
  /** @deprecated The "add to existing" flow is not used in the IBG quotation model. */
  onAddToExisting?: () => void;
}

type SendStep = 'confirm' | 'share-docs';

const QuotationSection = ({ appraisalId, onCreateNew }: QuotationSectionProps) => {
  const [sendStep, setSendStep] = useState<SendStep | null>(null);
  /** appraisalId → { documentId → { level } }; outer key tracks per-appraisal coverage */
  const [shareSelections, setShareSelections] = useState<ShareSelections>({});

  const handleDocToggle = (
    docAppraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => {
    setShareSelections(prev => {
      const apPrev = prev[docAppraisalId] ?? {};
      if (checked) {
        return { ...prev, [docAppraisalId]: { ...apPrev, [documentId]: { level } } };
      }
      const apNext = { ...apPrev };
      delete apNext[documentId];
      return { ...prev, [docAppraisalId]: apNext };
    });
  };

  // Fetch quotations that this appraisal belongs to
  const { data: quotations = [], isLoading: isLoadingList } = useGetAppraisalQuotations(
    appraisalId,
  );

  // If there's an active quotation, fetch its detail (with company submissions)
  const activeQuotation = quotations[0] ?? null;
  const { data: quotationDetail, isLoading: isLoadingDetail } = useGetQuotationById(
    activeQuotation?.id ?? null,
  );
  const { mutate: sendQuotation, isPending: isSending } = useSendQuotation(
    activeQuotation?.id ?? '',
  );
  const { mutate: setSharedDocuments, isPending: isSettingDocs } = useSetSharedDocuments(
    activeQuotation?.id ?? '',
  );

  const isLoading = isLoadingList || (!!activeQuotation && isLoadingDetail);

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-8 text-center">
          <Icon name="spinner" style="solid" className="size-5 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading quotation...</p>
        </div>
      </div>
    );
  }

  // ── No quotation yet ──────────────────────────────────────────────────────
  if (!activeQuotation) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-purple-300 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="size-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <Icon name="file-invoice-dollar" style="solid" className="size-6 text-purple-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">No quotation request yet</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Start a quotation to invite external companies to bid
            </p>
          </div>
          <Button onClick={onCreateNew} size="sm">
            <Icon name="file-circle-plus" style="solid" className="size-3.5 mr-1.5" />
            Request Quotation
          </Button>
        </div>
      </div>
    );
  }

  const status = (quotationDetail?.status ?? activeQuotation.status) as QuotationStatus | string;

  // ── Sent — countdown + company status ────────────────────────────────────
  if (status === 'Sent') {
    const dueDate = new Date(activeQuotation.dueDate);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.floor((dueDate.getTime() - now.getTime()) / 36e5));

    return (
      <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-blue-200 flex items-center justify-center">
              <Icon name="clock" style="solid" className="size-4 text-blue-700" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">{activeQuotation.quotationNumber}</span>
              <QuotationStatusBadge status={status} className="ml-2" />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Closes</div>
            <div className={clsx('text-sm font-medium', hoursLeft < 24 ? 'text-red-600' : 'text-gray-800')}>
              {formatDateTime(activeQuotation.dueDate)}
            </div>
            {hoursLeft < 48 && (
              <div className="text-xs text-amber-600">{hoursLeft}h remaining</div>
            )}
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-gray-600">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Companies Invited</div>
              <div className="font-medium text-gray-900">{activeQuotation.totalCompaniesInvited}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Responses</div>
              <div className="font-medium text-gray-900">
                {activeQuotation.totalQuotationsReceived} / {activeQuotation.totalCompaniesInvited}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Appraisals</div>
              <div className="font-medium text-gray-900">{activeQuotation.totalAppraisals}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Draft — hint banner + Send Quotation button ──────────────────────────
  if (status === 'Draft') {
    const draftDetail = quotationDetail;
    const appraisalCount = draftDetail?.totalAppraisals ?? activeQuotation.totalAppraisals ?? 0;
    const companyCount = draftDetail?.totalCompaniesInvited ?? activeQuotation.totalCompaniesInvited ?? 0;
    const hasDueDate = !!activeQuotation.dueDate;
    const canSend = appraisalCount >= 1 && companyCount >= 1 && hasDueDate;
    const draftAppraisals = draftDetail?.appraisals ?? [];

    /** Step 1 → Step 2: open the share-docs step */
    const handleProceedToShareDocs = () => {
      setShareSelections({});
      setSendStep('share-docs');
    };

    /** Cancel the whole send flow — clear both step and stale tick selections */
    const handleCancelSendFlow = () => {
      setSendStep(null);
      setShareSelections({});
    };

    /**
     * Every appraisal must have at least 1 document selected.
     * The backend enforces this too, but we block early in the UI.
     */
    const allAppraisalsCovered = draftAppraisals.every(
      ap => Object.keys(shareSelections[ap.appraisalId] ?? {}).length >= 1,
    );

    /** Step 2 → final send: PUT shared-docs then POST send */
    const handleFinalSend = () => {
      if (!allAppraisalsCovered) return;
      const selections: SharedDocumentSelectionDto[] = draftAppraisals.flatMap(ap =>
        Object.entries(shareSelections[ap.appraisalId] ?? {}).map(([documentId, { level }]) => ({
          appraisalId: ap.appraisalId,
          documentId,
          level,
        })),
      );
      setSharedDocuments(selections, {
        onSuccess: () => {
          sendQuotation(undefined, {
            onSuccess: () => {
              toast.success('Quotation sent — bidding is now open');
              setSendStep(null);
            },
            onError: (err: unknown) => {
              const apiErr = err as { apiError?: { detail?: string } };
              toast.error(apiErr?.apiError?.detail ?? 'Failed to send quotation');
            },
          });
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? 'Failed to save document selection');
        },
      });
    };

    const isBusy = isSending || isSettingDocs;

    return (
      <div className="flex flex-col gap-3">
        {/* Draft header */}
        <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-purple-200 flex items-center justify-center">
                <Icon name="file-pen" style="solid" className="size-4 text-purple-700" />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">
                  {activeQuotation.quotationNumber}
                </span>
                <QuotationStatusBadge status={status} className="ml-2" />
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setSendStep('confirm')}
              disabled={!canSend || isBusy}
              title={
                !canSend
                  ? 'Add at least 1 appraisal, 1 company, and set a due date before sending'
                  : undefined
              }
            >
              <Icon name="paper-plane" style="solid" className="size-3.5 mr-1.5" />
              Send Quotation
            </Button>
          </div>

          {/* Hint banner */}
          <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
            <Icon name="circle-info" style="solid" className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              This quotation is still a draft. Add appraisals, invite companies, then click{' '}
              <strong>Send Quotation</strong> to open bidding.
            </p>
          </div>

          {/* Stats */}
          <div className="px-4 py-3 text-sm text-gray-600">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">Appraisals</div>
                <div className={clsx('font-medium', appraisalCount === 0 ? 'text-amber-600' : 'text-gray-900')}>
                  {appraisalCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Companies Invited</div>
                <div className={clsx('font-medium', companyCount === 0 ? 'text-amber-600' : 'text-gray-900')}>
                  {companyCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Due Date</div>
                <div className={clsx('font-medium', !hasDueDate ? 'text-amber-600' : 'text-gray-900')}>
                  {hasDueDate
                    ? formatDateTime(activeQuotation.dueDate)
                    : 'Not set'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appraisal context panel (draft — remove enabled) */}
        {draftDetail && (
          <AppraisalContextPanel
            quotationId={activeQuotation.id}
            appraisals={draftAppraisals}
            viewerRole="Admin"
            allowRemove={true}
          />
        )}

        {/* ── Step 1: Confirm send ── */}
        {sendStep === 'confirm' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Icon name="paper-plane" style="solid" className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Send Quotation</h3>
                  <p className="text-xs text-gray-500">Step 1 of 2 — Confirm details</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                This will open bidding for{' '}
                <strong>{companyCount} {companyCount === 1 ? 'company' : 'companies'}</strong>.
                You will not be able to add or remove appraisals after sending.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleCancelSendFlow}
                >
                  Cancel
                </Button>
                <Button size="sm" type="button" onClick={handleProceedToShareDocs}>
                  Next: Share Documents
                  <Icon name="arrow-right" style="solid" className="size-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Share documents ── */}
        {sendStep === 'share-docs' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Icon name="file-check" style="solid" className="size-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Share Documents</h3>
                  <p className="text-xs text-gray-500">Step 2 of 2 — Tick documents to share with invited companies</p>
                </div>
              </div>

              <ShareDocumentsStep
                appraisals={draftAppraisals}
                selections={shareSelections}
                onToggle={handleDocToggle}
              />

              {!allAppraisalsCovered && draftAppraisals.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <Icon name="triangle-exclamation" style="solid" className="size-3.5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Select at least one document for every appraisal before sending.
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-between mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSendStep('confirm')}
                  disabled={isBusy}
                >
                  <Icon name="arrow-left" style="solid" className="size-3.5 mr-1.5" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleCancelSendFlow}
                    disabled={isBusy}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleFinalSend}
                    disabled={isBusy || !allAppraisalsCovered}
                    title={!allAppraisalsCovered ? 'Select at least one document for every appraisal' : undefined}
                  >
                    {isBusy ? (
                      <>
                        <Icon name="spinner" style="solid" className="size-3.5 mr-1.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Icon name="paper-plane" style="solid" className="size-3.5 mr-1.5" />
                        Confirm & Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Shared: appraisal context panel (shown for all non-terminal statuses with detail) ──
  const appraisals = quotationDetail?.appraisals ?? [];
  const isDraft = false; // Draft is handled above
  const AppraisalCtx = quotationDetail ? (
    <AppraisalContextPanel
      quotationId={activeQuotation.id}
      appraisals={appraisals}
      viewerRole="Admin"
      allowRemove={isDraft}
    />
  ) : null;

  // ── UnderAdminReview — shortlist panel ───────────────────────────────────
  if (status === 'UnderAdminReview') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              {activeQuotation.quotationNumber}
            </span>
            <QuotationStatusBadge status={status} />
          </div>
        </div>
        {AppraisalCtx}
        <AdminShortlistPanel
          quotationId={activeQuotation.id}
          companyQuotations={quotationDetail?.companyQuotations ?? []}
        />
      </div>
    );
  }

  // ── PendingRmSelection — shortlist sent panel ─────────────────────────────
  if (status === 'PendingRmSelection') {
    if (!quotationDetail) return null;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{activeQuotation.quotationNumber}</span>
          <QuotationStatusBadge status={status} />
        </div>
        {AppraisalCtx}
        <ShortlistSentPanel quotation={quotationDetail} />
      </div>
    );
  }

  // ── WinnerTentative / Negotiating ─────────────────────────────────────────
  if (status === 'WinnerTentative' || status === 'Negotiating') {
    if (!quotationDetail) return null;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{activeQuotation.quotationNumber}</span>
          <QuotationStatusBadge status={status} />
        </div>
        {AppraisalCtx}
        <NegotiationPanel quotation={quotationDetail} />
      </div>
    );
  }

  // ── Finalized ─────────────────────────────────────────────────────────────
  if (status === 'Finalized') {
    const winner = quotationDetail?.companyQuotations?.find(
      cq => cq.id === quotationDetail.tentativeWinnerQuotationId,
    );
    return (
      <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-200">
          <div className="size-8 rounded-lg bg-green-200 flex items-center justify-center">
            <Icon name="circle-check" style="solid" className="size-4 text-green-700" />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">{activeQuotation.quotationNumber}</span>
            <QuotationStatusBadge status={status} className="ml-2" />
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-gray-600">
          <p>
            Quotation finalized with{' '}
            <strong className="text-gray-900">{winner?.companyName ?? '—'}</strong>.
          </p>
          {winner?.currentNegotiatedPrice != null && (
            <p className="mt-1">
              Final price:{' '}
              <strong className="text-green-700">
                {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(
                  winner.currentNegotiatedPrice,
                )}
              </strong>
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Click "Assign" to route externally to this company.
          </p>
        </div>
      </div>
    );
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (status === 'Cancelled') {
    return (
      <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="size-8 rounded-lg bg-red-200 flex items-center justify-center">
            <Icon name="ban" style="solid" className="size-4 text-red-700" />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">{activeQuotation.quotationNumber}</span>
            <QuotationStatusBadge status={status} className="ml-2" />
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-gray-500">
          This quotation was cancelled. You can start a new one if needed.
        </div>
      </div>
    );
  }

  // ── Fallback: existing list view (Draft or unknown) ───────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-purple-200 flex items-center justify-center">
            <Icon name="file-invoice-dollar" style="solid" className="size-4 text-purple-700" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Quotation</span>
        </div>
        <Button size="sm" onClick={onCreateNew}>
          <Icon name="file-circle-plus" style="solid" className="size-3.5 mr-1.5" />
          New Quotation
        </Button>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-purple-600">{activeQuotation.quotationNumber}</span>
          <QuotationStatusBadge status={status} />
        </div>
      </div>
    </div>
  );
};

export default QuotationSection;
