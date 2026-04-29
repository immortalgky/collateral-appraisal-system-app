import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import {
  useGetQuotationById,
  usePickTentativeWinner,
  useCancelQuotation,
  useSendQuotation,
} from '../api/quotation';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';
import EditDraftQuotationModal from '../components/EditDraftQuotationModal';
import QuotationStatusBadge from '../components/QuotationStatusBadge';
import AdminShortlistPanel from '../components/AdminShortlistPanel';
import NegotiationPanel from '../components/NegotiationPanel';
import AppraisalReportListingTable from '../components/AppraisalReportListingTable';
import QuotationTrackingLog from '../components/QuotationTrackingLog';
import FinalizeModal from '../components/FinalizeModal';
import NegotiationModal from '../components/NegotiationModal';
import RejectTentativeModal from '../components/RejectTentativeModal';
import type { CompanyQuotationDto } from '../schemas/quotation';
import { useQuotationIdFromRoute } from '../hooks/useQuotationIdFromRoute';

/**
 * Combined RM + Admin quotation page.
 *
 * RM flow: picks tentative winner from the shortlisted bids.
 * Admin flow: review submissions, shortlist, send to RM, cancel, or finalize.
 *
 * Routes:
 *   Standalone:   /quotations/:id  (gated by RoleProtectedRoute for ['RequestMaker', 'Admin'])
 *   Task-wrapped: /tasks/:taskId/quotation/pick-winner
 */
const QuotationSelectionPage = () => {
  const id = useQuotationIdFromRoute();
  const navigate = useNavigate();
  const { data: quotation, isLoading, isError } = useGetQuotationById(id);
  const { mutate: pick, isPending: isPickPending } = usePickTentativeWinner(id ?? '');
  const { mutate: cancelQuotation, isPending: isCancelPending } = useCancelQuotation(id ?? '');
  const { mutate: sendQuotation, isPending: isSendPending } = useSendQuotation(id ?? '');

  // Breadcrumb: Home › Quotations › QTN-...
  useBreadcrumb(quotation?.quotationNumber, 'file-invoice-dollar');

  // RM pick-winner state
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [requestNegotiation, setRequestNegotiation] = useState(false);
  const [negotiationNote, setNegotiationNote] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Admin finalize state
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [finalizeTarget, setFinalizeTarget] = useState<CompanyQuotationDto | null>(null);

  // Admin open-negotiation state (WinnerTentative → Negotiating)
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);

  // Admin reject-winner state (WinnerTentative → UnderAdminReview)
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  // Admin cancel confirmation state
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const closeCancelConfirm = () => {
    setIsCancelConfirmOpen(false);
    setCancelReason('');
  };

  // Draft action states
  const [isEditDraftOpen, setIsEditDraftOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isDraftCancelOpen, setIsDraftCancelOpen] = useState(false);

  const shortlisted = (quotation?.companyQuotations ?? []).filter(q => q.isShortlisted);
  const tentativeWinner = quotation?.tentativeWinnerQuotationId
    ? shortlisted.find(q => q.id === quotation.tentativeWinnerQuotationId)
    : null;

  const handlePickClick = (cq: CompanyQuotationDto) => {
    setPickedId(cq.id);
    setReason('');
    setRequestNegotiation(false);
    setNegotiationNote('');
    setIsConfirmOpen(true);
  };

  const handleConfirmPick = () => {
    if (!pickedId) return;
    pick(
      {
        companyQuotationId: pickedId,
        reason: reason || undefined,
        requestNegotiation: requestNegotiation || undefined,
        negotiationNote: requestNegotiation && negotiationNote ? negotiationNote : null,
      },
      {
        onSuccess: () => {
          toast.success('Tentative winner selected — admin will be notified');
          setIsConfirmOpen(false);
          setPickedId(null);
          setReason('');
          setRequestNegotiation(false);
          setNegotiationNote('');
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? 'Failed to pick tentative winner');
        },
      },
    );
  };

  const handleCancelConfirm = () => {
    cancelQuotation(
      { reason: cancelReason.trim() || null },
      {
        onSuccess: () => {
          toast.success('Quotation cancelled');
          closeCancelConfirm();
          navigate(-1);
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? 'Failed to cancel quotation');
        },
      },
    );
  };

  const handleFinalizeClick = () => {
    const winner = shortlisted.find(q => q.id === quotation?.tentativeWinnerQuotationId);
    if (winner) {
      setFinalizeTarget(winner);
      setIsFinalizeOpen(true);
    }
  };

  const pickedCompany = shortlisted.find(q => q.id === pickedId);

  const formatCurrency = (v?: number | null) =>
    v != null
      ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v)
      : '—';

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
        <p className="text-sm text-gray-600">
          Unable to load quotation. You may not have access to this resource.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  const status = quotation.status;
  const isAlreadyPicked = !!quotation.tentativeWinnerQuotationId;
  const isRmPickPhase = ['PendingRmSelection', 'WinnerTentative'].includes(status);
  // Read-only for RM pick flow when not in RM selection phase OR when the caller
  // doesn't own the active rm-pick-winner workflow task. Backend computes canPickWinner
  // by mirroring the auth check in PickTentativeWinnerCommandHandler — admins always true.
  const isRmReadOnly = !isRmPickPhase || !quotation.canPickWinner;

  // ─── Status-gated button visibility ─────────────────────────────────────────
  // Draft          → Edit / Send / Cancel draft action bar (see below)
  // Sent           → no admin action (fan-out in progress)
  // UnderAdminReview → SUBMIT SHORTLISTED COMPANIES (handled inside AdminShortlistPanel)
  // PendingRmSelection → no admin action (RM is picking)
  // WinnerTentative → CANCEL QUOTATION + SUBMIT AWARD COMPANY
  // Finalized / Cancelled → CLOSE only
  const isDraft = status === 'Draft';
  const showSentPanel = status === 'Sent';
  const showAdminShortlistPanel = status === 'UnderAdminReview';
  const showNegotiationPanel = status === 'Negotiating';
  const showWinnerActions = status === 'WinnerTentative';
  const showFinalizedSummary = status === 'Finalized';
  const showCancelledSummary = status === 'Cancelled';
  const showCloseOnly = showFinalizedSummary || showCancelledSummary;
  // Standalone Cancel button — shown for every in-flight admin/RM state. Lives in the
  // page header (top-right) so the placement matches the appraisal/project pages.
  // Draft has its own dedicated action bar.
  const showCancelButton =
    showSentPanel ||
    showAdminShortlistPanel ||
    status === 'PendingRmSelection' ||
    showNegotiationPanel ||
    showWinnerActions;

  const finalizedWinner = showFinalizedSummary
    ? quotation.companyQuotations?.find(cq => cq.id === quotation.tentativeWinnerQuotationId)
    : undefined;

  // ─── Hours-remaining badge — only meaningful while bids are still open ────
  // After Sent the bidding window has closed (admin review / pick winner / etc.),
  // so a "hours remaining" countdown would be misleading.
  const hoursLeft = showSentPanel && quotation.dueDate
    ? Math.max(0, Math.floor((new Date(quotation.dueDate).getTime() - Date.now()) / 36e5))
    : null;

  const formatDateTimeShort = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const handleSendConfirm = () => {
    sendQuotation(undefined, {
      onSuccess: () => {
        toast.success('Quotation sent — companies have been notified');
        setIsSendConfirmOpen(false);
      },
      onError: (err: unknown) => {
        const apiErr = err as { apiError?: { detail?: string } };
        toast.error(
          apiErr?.apiError?.detail ??
            'Failed to send quotation. Set shared documents via the task page before sending.',
        );
        setIsSendConfirmOpen(false);
      },
    });
  };

  const handleDraftCancelConfirm = () => {
    cancelQuotation(
      {},
      {
        onSuccess: () => {
          toast.success('Draft quotation cancelled');
          setIsDraftCancelOpen(false);
          navigate('/quotations');
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? 'Failed to cancel draft');
        },
      },
    );
  };

  // Cut-off date — read-only for now.
  // TODO: wire PATCH endpoint when backend exposes /quotations/{id}/due-date or similar.
  const cutOffDateDisplay = quotation.dueDate
    ? (() => {
        const d = new Date(quotation.dueDate);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : '—';

  return (
    <div className="w-full px-6 py-6 space-y-5">
      {/* Lean header — compact title with status + cut-off below, metrics + cancel on the right */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate leading-tight">
            {quotation.quotationNumber}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <QuotationStatusBadge status={quotation.status} />
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              <Icon name="clock" style="solid" className="size-2.5 text-gray-400" />
              <span>Cut-off</span>
              <span className="font-medium text-gray-700">{cutOffDateDisplay}</span>
            </span>
            {hoursLeft !== null && (
              <span
                className={clsx(
                  'inline-flex items-center text-[11px] font-medium',
                  hoursLeft < 24 ? 'text-red-600' : 'text-amber-600',
                )}
              >
                · {hoursLeft}h remaining
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5 text-xs">
          {showCancelButton && (
            <button
              type="button"
              onClick={() => setIsCancelConfirmOpen(true)}
              disabled={isCancelPending}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="ban" style="solid" className="size-3" />
              Cancel Quotation
            </button>
          )}
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-400 uppercase tracking-wide text-[10px]">Appraisals</span>
            <span className="font-semibold text-gray-900 tabular-nums">
              {quotation.totalAppraisals}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-400 uppercase tracking-wide text-[10px]">Invited</span>
            <span className="font-semibold text-gray-900 tabular-nums">
              {quotation.totalCompaniesInvited}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-400 uppercase tracking-wide text-[10px]">Responses</span>
            <span className="font-semibold text-gray-900 tabular-nums">
              {quotation.totalQuotationsReceived}
              <span className="text-gray-400 font-normal">
                {' '}
                / {quotation.totalCompaniesInvited}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Draft action bar (status === 'Draft' only) ──────────────────────── */}
      {isDraft && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Icon name="pen-to-square" style="solid" className="size-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 flex-1">
            This quotation is a <strong>Draft</strong>. Edit details or send it to invite companies.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsEditDraftOpen(true)}>
              <Icon name="pen-to-square" style="solid" className="size-3.5 mr-1.5" />
              Edit
            </Button>
            <Button size="sm" onClick={() => setIsSendConfirmOpen(true)} disabled={isSendPending}>
              <Icon name="paper-plane" style="solid" className="size-3.5 mr-1.5" />
              Send to Companies
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDraftCancelOpen(true)}
              disabled={isCancelPending}
            >
              <Icon name="ban" style="solid" className="size-3.5 mr-1.5" />
              Cancel Draft
            </Button>
          </div>
        </div>
      )}

      {/* ─── Section 1: Appraisal Report Listing ──────────────────────────────── */}
      <AppraisalReportListingTable
        appraisals={quotation.appraisals ?? []}
        rmUserName={quotation.rmUserName}
        rmUserFullName={quotation.rmUserFullName}
      />

      {/* Instructions (RM pick phase only) */}
      {isRmPickPhase && !isAlreadyPicked && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-start gap-2">
          <Icon
            name="circle-info"
            style="solid"
            className="size-4 text-purple-500 shrink-0 mt-0.5"
          />
          <p className="text-sm text-purple-700">
            Select one of the shortlisted companies below as the tentative winner. Admin will then
            negotiate and award the agreement.
          </p>
        </div>
      )}

      {/* ─── Section 2a: Sent — invited companies + responses table ─────────── */}
      {showSentPanel && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">
              Company Responses ({quotation.invitedCompanies?.length ?? 0})
            </h2>
          </div>

          {(quotation.invitedCompanies?.length ?? 0) > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Fee Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Discount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Net Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Estimate Manday
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted At
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(quotation.invitedCompanies ?? []).map(inv => {
                    const cq = (quotation.companyQuotations ?? []).find(
                      q => q.companyId === inv.companyId,
                    );
                    const items = cq?.items ?? [];
                    const hasItems = items.length > 0;
                    const totalFeeAmount = items.reduce(
                      (sum, item) => sum + (item.feeAmount ?? 0),
                      0,
                    );
                    const totalDiscount = items.reduce(
                      (sum, item) => sum + (item.discount ?? 0) + (item.negotiatedDiscount ?? 0),
                      0,
                    );
                    const totalEstimateManday = items.reduce(
                      (sum, item) => sum + (item.estimatedDays ?? 0),
                      0,
                    );
                    return (
                      <tr key={inv.companyId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {inv.companyName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-700 tabular-nums">
                            {hasItems ? formatCurrency(totalFeeAmount) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-700 tabular-nums">
                            {hasItems ? formatCurrency(totalDiscount) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900 tabular-nums">
                            {cq ? formatCurrency(cq.totalQuotedPrice) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-gray-600">
                            {hasItems ? totalEstimateManday : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {cq ? formatDateTimeShort(cq.submittedAt) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {cq ? (
                            <QuotationStatusBadge status={cq.status} />
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Section 2b: Admin shortlist + shortlist send (UnderAdminReview) ──── */}
      {showAdminShortlistPanel && (
        <AdminShortlistPanel
          quotationId={quotation.id}
          companyQuotations={quotation.companyQuotations ?? []}
        />
      )}

      {/* ─── Section 2c: Negotiating ─────────────────────────────────────────── */}
      {showNegotiationPanel && <NegotiationPanel quotation={quotation} />}

      {/* ─── Section 2d: Finalized summary ────────────────────────────────────── */}
      {showFinalizedSummary && (
        <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-200">
            <div className="size-8 rounded-lg bg-green-200 flex items-center justify-center">
              <Icon name="circle-check" style="solid" className="size-4 text-green-700" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">
                {quotation.quotationNumber}
              </span>
              <QuotationStatusBadge status={status} className="ml-2" />
            </div>
          </div>
          <div className="px-4 py-3 text-sm text-gray-600">
            <p>
              Quotation awarded to{' '}
              <strong className="text-gray-900">{finalizedWinner?.companyName ?? '—'}</strong>.
            </p>
            {(() => {
              const finalPrice =
                finalizedWinner?.currentNegotiatedPrice ?? finalizedWinner?.totalQuotedPrice;
              if (finalPrice == null) return null;
              return (
                <p className="mt-1">
                  Final price:{' '}
                  <strong className="text-green-700">{formatCurrency(finalPrice)}</strong>
                </p>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── Section 2e: Cancelled summary ────────────────────────────────────── */}
      {showCancelledSummary && (
        <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200">
            <div className="size-8 rounded-lg bg-red-200 flex items-center justify-center">
              <Icon name="ban" style="solid" className="size-4 text-red-700" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">
                {quotation.quotationNumber}
              </span>
              <QuotationStatusBadge status={status} className="ml-2" />
            </div>
          </div>
          <div className="px-4 py-3 text-sm text-gray-500">
            This quotation was cancelled.
          </div>
        </div>
      )}

      {/* ─── Section 2b: RM shortlisted bids table (PendingRmSelection / WinnerTentative) */}
      {isRmPickPhase && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Shortlisted Bids ({shortlisted.length})
            </h2>
            {showWinnerActions && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRejectOpen(true)}
                  disabled={!tentativeWinner}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Icon name="xmark" style="solid" className="size-3.5 mr-1.5" />
                  Reject Winner
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNegotiationOpen(true)}
                  disabled={!tentativeWinner}
                  className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                >
                  <Icon name="handshake" style="solid" className="size-3.5 mr-1.5" />
                  Negotiate
                </Button>
                <Button
                  size="sm"
                  onClick={handleFinalizeClick}
                  disabled={!tentativeWinner}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Icon name="flag-checkered" style="solid" className="size-3.5 mr-1.5" />
                  Award
                </Button>
              </div>
            )}
          </div>

          {shortlisted.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">No shortlisted bids available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Fee Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Discount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Net Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Estimate Manday
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted At
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {!isRmReadOnly && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shortlisted.map(cq => {
                    const isWinner = quotation.tentativeWinnerQuotationId === cq.id;
                    const items = cq.items ?? [];
                    const hasItems = items.length > 0;
                    const totalFeeAmount = items.reduce(
                      (sum, item) => sum + (item.feeAmount ?? 0),
                      0,
                    );
                    const totalDiscount = items.reduce(
                      (sum, item) => sum + (item.discount ?? 0) + (item.negotiatedDiscount ?? 0),
                      0,
                    );
                    const totalEstimateManday = items.reduce(
                      (sum, item) => sum + (item.estimatedDays ?? 0),
                      0,
                    );
                    const submittedAt = (() => {
                      if (!cq.submittedAt) return '—';
                      const d = new Date(cq.submittedAt);
                      if (isNaN(d.getTime())) return '—';
                      const pad = (n: number) => String(n).padStart(2, '0');
                      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    })();
                    return (
                      <tr
                        key={cq.id}
                        className={clsx(
                          'transition-colors',
                          isWinner ? 'bg-indigo-50' : 'hover:bg-gray-50',
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {cq.companyName}
                            </span>
                            {isWinner && (
                              <Icon name="crown" style="solid" className="size-4 text-indigo-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-700 tabular-nums">
                            {hasItems ? formatCurrency(totalFeeAmount) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-700 tabular-nums">
                            {hasItems ? formatCurrency(totalDiscount) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900 tabular-nums">
                            {formatCurrency(cq.totalQuotedPrice)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-gray-600">
                            {hasItems ? totalEstimateManday : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{submittedAt}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <QuotationStatusBadge status={cq.status} />
                        </td>
                        {!isRmReadOnly && (
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              onClick={() => handlePickClick(cq)}
                              disabled={isAlreadyPicked}
                              className={clsx(isWinner && 'bg-indigo-600 hover:bg-indigo-700')}
                            >
                              {isWinner ? 'Selected' : 'Pick'}
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Close-only state */}
      {showCloseOnly && (
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Close
          </Button>
        </div>
      )}

      {/* ─── Section 4: Quotation Tracking Log ───────────────────────────────── */}
      {id && <QuotationTrackingLog quotationId={id} />}

      {/* ─── Modals ───────────────────────────────────────────────────────────── */}

      {/* RM pick confirmation */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Select Tentative Winner"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-2">
            <Icon name="crown" style="solid" className="size-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-700">
              You are selecting <strong>{pickedCompany?.companyName}</strong> as the tentative
              winner. Admin will be notified to start negotiation.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              placeholder="Why this company?"
            />
          </div>

          {/* Request negotiation toggle */}
          <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={requestNegotiation}
                onChange={e => {
                  setRequestNegotiation(e.target.checked);
                  if (!e.target.checked) setNegotiationNote('');
                }}
                className="size-4 accent-primary rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">
                  Request negotiation with this company
                </span>
                <p className="text-xs text-gray-400">
                  Admin will see your recommendation when finalizing.
                </p>
              </div>
            </label>

            {requestNegotiation && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note to admin <span className="text-xs text-gray-400">(max 500 chars)</span>
                </label>
                <textarea
                  value={negotiationNote}
                  onChange={e => setNegotiationNote(e.target.value.slice(0, 500))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  placeholder="e.g. Target price ฿2.5M, they may be flexible on timeline..."
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">
                  {negotiationNote.length}/500
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isPickPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmPick} disabled={isPickPending}>
              {isPickPending ? (
                <>
                  <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                  Selecting...
                </>
              ) : (
                <>
                  <Icon name="crown" style="solid" className="size-4 mr-2" />
                  Confirm Selection
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin cancel confirmation */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={closeCancelConfirm}
        title="Cancel Quotation"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="size-4 text-red-500 shrink-0 mt-0.5"
            />
            <p className="text-sm text-red-700">
              This will cancel quotation <strong>{quotation.quotationNumber}</strong>. All invited
              companies will be notified and the workflow task will be cancelled. This action
              cannot be undone.
            </p>
          </div>
          <div>
            <label
              htmlFor="standalone-cancel-reason"
              className="block text-sm text-gray-600 mb-1"
            >
              Reason <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="standalone-cancel-reason"
              rows={3}
              maxLength={500}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Why is this quotation being cancelled?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
            <p className="mt-1 text-[11px] text-gray-400 text-right">
              {cancelReason.length}/500
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={closeCancelConfirm} disabled={isCancelPending}>
              Go Back
            </Button>
            <Button variant="danger" onClick={handleCancelConfirm} disabled={isCancelPending}>
              {isCancelPending ? (
                <>
                  <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Icon name="ban" style="solid" className="size-4 mr-2" />
                  Confirm Cancel
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin finalize */}
      {finalizeTarget && (
        <FinalizeModal
          isOpen={isFinalizeOpen}
          onClose={() => {
            setIsFinalizeOpen(false);
            setFinalizeTarget(null);
          }}
          quotationId={quotation.id}
          companyQuotationId={finalizeTarget.id}
          companyName={finalizeTarget.companyName}
          winnerItems={finalizeTarget.items ?? []}
          appraisals={quotation.appraisals ?? []}
        />
      )}

      {/* Admin open-negotiation (WinnerTentative → Negotiating) */}
      {tentativeWinner && (
        <NegotiationModal
          isOpen={isNegotiationOpen}
          onClose={() => setIsNegotiationOpen(false)}
          quotationId={quotation.id}
          companyQuotationId={tentativeWinner.id}
          companyName={tentativeWinner.companyName}
          currentRounds={tentativeWinner.negotiationRounds ?? 0}
        />
      )}

      {/* Admin reject-tentative-winner (WinnerTentative → UnderAdminReview) */}
      {tentativeWinner && (
        <RejectTentativeModal
          isOpen={isRejectOpen}
          onClose={() => setIsRejectOpen(false)}
          quotationId={quotation.id}
          companyName={tentativeWinner.companyName}
        />
      )}

      {/* ─── Draft modals ─────────────────────────────────────────────────────── */}

      {/* Edit draft */}
      {isEditDraftOpen && (
        <EditDraftQuotationModal
          isOpen={isEditDraftOpen}
          onClose={() => setIsEditDraftOpen(false)}
          quotation={quotation}
        />
      )}

      {/* Send confirmation */}
      <Modal
        isOpen={isSendConfirmOpen}
        onClose={() => setIsSendConfirmOpen(false)}
        title="Send Quotation"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
            <Icon
              name="paper-plane"
              style="solid"
              className="size-4 text-blue-500 shrink-0 mt-0.5"
            />
            <p className="text-sm text-blue-700">
              Send this quotation to{' '}
              <strong>
                {quotation.invitedCompanies?.length ?? quotation.totalCompaniesInvited}
              </strong>{' '}
              invited{' '}
              {(quotation.invitedCompanies?.length ?? quotation.totalCompaniesInvited) === 1
                ? 'company'
                : 'companies'}
              ? They will be notified to submit their bids.
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Note: each appraisal with uploaded documents must have at least one shared document
            configured before sending. If the send fails, use the task page to set up shared
            documents first.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsSendConfirmOpen(false)}
              disabled={isSendPending}
            >
              Go Back
            </Button>
            <Button onClick={handleSendConfirm} disabled={isSendPending} isLoading={isSendPending}>
              {!isSendPending && (
                <Icon name="paper-plane" style="solid" className="size-4 mr-1.5" />
              )}
              Send
            </Button>
          </div>
        </div>
      </Modal>

      {/* Draft cancel confirmation */}
      <Modal
        isOpen={isDraftCancelOpen}
        onClose={() => setIsDraftCancelOpen(false)}
        title="Cancel Draft"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="size-4 text-red-500 shrink-0 mt-0.5"
            />
            <p className="text-sm text-red-700">
              Cancel draft <strong>{quotation.quotationNumber}</strong>? This action cannot be
              undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDraftCancelOpen(false)}
              disabled={isCancelPending}
            >
              Go Back
            </Button>
            <Button
              variant="danger"
              onClick={handleDraftCancelConfirm}
              disabled={isCancelPending}
              isLoading={isCancelPending}
            >
              {!isCancelPending && <Icon name="ban" style="solid" className="size-4 mr-1.5" />}
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuotationSelectionPage;
