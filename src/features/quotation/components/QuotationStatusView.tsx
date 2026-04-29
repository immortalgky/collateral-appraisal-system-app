import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useCancelQuotation } from '../api/quotation';
import type { QuotationRequestDetailDto } from '../schemas/quotation';
import QuotationStatusBadge from './QuotationStatusBadge';
import InvitedCompaniesPopover from './InvitedCompaniesPopover';
import ShortlistSentPanel from './ShortlistSentPanel';
import NegotiationPanel from './NegotiationPanel';
import RejectTentativeModal from './RejectTentativeModal';
import FinalizeModal from './FinalizeModal';
import NegotiationModal from './NegotiationModal';

// ─── Local formatters ─────────────────────────────────────────────────────────

const THB = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });

function fmtCurrency(v?: number | null) {
  return v != null ? THB.format(v) : '—';
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ─── Statuses where Cancel Quotation is offered ───────────────────────────────

const CANCELLABLE_STATUSES = new Set([
  'Sent',
  'UnderAdminReview',
  'PendingRmSelection',
  'WinnerTentative',
  'Negotiating',
]);

// ─── QuotationStatusView ──────────────────────────────────────────────────────

interface QuotationStatusViewProps {
  quotation: QuotationRequestDetailDto;
}

/**
 * Renders the per-status UI for a QuotationRequest from the internal-admin perspective.
 * Covers: Sent, PendingRmSelection, WinnerTentative, Negotiating, Finalized, Cancelled.
 *
 * Draft and UnderAdminReview are NOT handled here — each page keeps its own
 * (Draft is appraisal-context heavy; UnderAdminReview has page-specific shortlist panels).
 *
 * Usage:
 *   <QuotationStatusView quotation={quotationDetail} />
 */
const QuotationStatusView = ({ quotation }: QuotationStatusViewProps) => {
  const status = quotation.status;

  // ─── Cancel quotation state ───────────────────────────────────────────────
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const { mutate: cancelQuotation, isPending: isCancelling } = useCancelQuotation(quotation.id);

  const closeCancelModal = () => {
    setShowCancelConfirm(false);
    setCancelReason('');
  };

  const handleConfirmCancel = () => {
    if (!CANCELLABLE_STATUSES.has(status)) {
      toast.error(`Quotation is no longer cancellable (status: ${status}).`);
      closeCancelModal();
      return;
    }
    cancelQuotation(
      { reason: cancelReason.trim() || null },
      {
        onSuccess: () => {
          toast.success('Quotation cancelled');
          closeCancelModal();
        },
        onError: (err: unknown) => {
          const e = err as { apiError?: { detail?: string } };
          toast.error(e?.apiError?.detail ?? 'Failed to cancel quotation');
        },
      },
    );
  };

  const cancelFooter = CANCELLABLE_STATUSES.has(status) ? (
    <>
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => setShowCancelConfirm(true)}
          disabled={isCancelling}
          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="ban" style="solid" className="size-3" />
          Cancel Quotation
        </button>
      </div>
      <Modal isOpen={showCancelConfirm} onClose={closeCancelModal} title="Cancel Quotation" size="sm">
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
            <Icon name="triangle-exclamation" style="solid" className="size-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              This will cancel quotation <strong>{quotation.quotationNumber}</strong>. All invited
              companies will be notified. This action cannot be undone.
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Reason <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Why is this quotation being cancelled?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
            <p className="mt-1 text-[11px] text-gray-400 text-right">{cancelReason.length}/500</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={closeCancelModal} disabled={isCancelling}>
              Go Back
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel} disabled={isCancelling}>
              {isCancelling ? (
                <>
                  <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Icon name="ban" style="solid" className="size-4 mr-2" />
                  Cancel Quotation
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  ) : null;

  // ─── Sent ─────────────────────────────────────────────────────────────────
  if (status === 'Sent') {
    const dueDate = new Date(quotation.dueDate);
    const hoursLeft = Math.max(0, Math.floor((dueDate.getTime() - Date.now()) / 36e5));
    const companyQuotations = quotation.companyQuotations ?? [];
    const invitedCompanies = quotation.invitedCompanies ?? [];

    return (
      <div className="flex flex-col gap-2">
        <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-purple-200 flex items-center justify-center">
                <Icon name="clock" style="solid" className="size-4 text-purple-700" />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">{quotation.quotationNumber}</span>
                <QuotationStatusBadge status={status} className="ml-2" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Closes</div>
              <div className={clsx('text-sm font-medium', hoursLeft < 24 ? 'text-red-600' : 'text-gray-800')}>
                {fmtDateTime(quotation.dueDate)}
              </div>
              {hoursLeft < 48 && (
                <div className="text-xs text-amber-600">{hoursLeft}h remaining</div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 py-3 text-sm text-gray-600 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  Companies Invited
                  <InvitedCompaniesPopover
                    companies={quotation.invitedCompanies ?? []}
                    totalInvited={quotation.totalCompaniesInvited}
                  />
                </div>
                <div className="font-medium text-gray-900">{quotation.totalCompaniesInvited}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Responses</div>
                <div className="font-medium text-gray-900">
                  {quotation.totalQuotationsReceived} / {quotation.totalCompaniesInvited}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Appraisals</div>
                <div className="font-medium text-gray-900">{quotation.totalAppraisals}</div>
              </div>
            </div>
          </div>

          {/* Company responses table */}
          {invitedCompanies.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fee Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Discount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Net Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Estimate Manday</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invitedCompanies.map(inv => {
                    const cq = companyQuotations.find(q => q.companyId === inv.companyId);
                    const items = cq?.items ?? [];
                    const hasItems = items.length > 0;
                    const totalFeeAmount = items.reduce((sum, item) => sum + (item.feeAmount ?? 0), 0);
                    const totalDiscount = items.reduce(
                      (sum, item) => sum + (item.discount ?? 0) + (item.negotiatedDiscount ?? 0),
                      0,
                    );
                    const totalEstimateManday = items.reduce((sum, item) => sum + (item.estimatedDays ?? 0), 0);
                    return (
                      <tr key={inv.companyId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{inv.companyName}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-700 tabular-nums">
                            {hasItems ? fmtCurrency(totalFeeAmount) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-700 tabular-nums">
                            {hasItems ? fmtCurrency(totalDiscount) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900 tabular-nums">
                            {cq ? fmtCurrency(cq.totalQuotedPrice) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-gray-600">
                            {hasItems ? totalEstimateManday : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {cq ? fmtDateTime(cq.submittedAt) : '—'}
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
        {cancelFooter}
      </div>
    );
  }

  // ─── PendingRmSelection ───────────────────────────────────────────────────
  if (status === 'PendingRmSelection') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{quotation.quotationNumber}</span>
          <QuotationStatusBadge status={status} />
        </div>
        <ShortlistSentPanel quotation={quotation} />
        {cancelFooter}
      </div>
    );
  }

  // ─── WinnerTentative ─────────────────────────────────────────────────────
  if (status === 'WinnerTentative') {
    const winner = quotation.companyQuotations?.find(
      cq => cq.id === quotation.tentativeWinnerQuotationId,
    );
    return (
      <WinnerTentativeView
        quotation={quotation}
        winner={winner}
        cancelFooter={cancelFooter}
      />
    );
  }

  // ─── Negotiating ──────────────────────────────────────────────────────────
  if (status === 'Negotiating') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{quotation.quotationNumber}</span>
          <QuotationStatusBadge status={status} />
        </div>
        <NegotiationPanel quotation={quotation} />
        {cancelFooter}
      </div>
    );
  }

  // ─── Finalized ────────────────────────────────────────────────────────────
  if (status === 'Finalized') {
    const winner = quotation.companyQuotations?.find(
      cq => cq.id === quotation.tentativeWinnerQuotationId,
    );
    const finalPrice = winner?.currentNegotiatedPrice ?? winner?.totalQuotedPrice;
    return (
      <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-200">
          <div className="size-8 rounded-lg bg-green-200 flex items-center justify-center">
            <Icon name="circle-check" style="solid" className="size-4 text-green-700" />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">{quotation.quotationNumber}</span>
            <QuotationStatusBadge status={status} className="ml-2" />
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-gray-600">
          <p>
            Quotation awarded to{' '}
            <strong className="text-gray-900">{winner?.companyName ?? '—'}</strong>.
          </p>
          {finalPrice != null && (
            <p className="mt-1">
              Final price:{' '}
              <strong className="text-green-700">{fmtCurrency(finalPrice)}</strong>
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Click "Assign" to route externally to this company.
          </p>
        </div>
      </div>
    );
  }

  // ─── Cancelled ────────────────────────────────────────────────────────────
  if (status === 'Cancelled') {
    return (
      <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-red-200 flex items-center justify-center">
              <Icon name="ban" style="solid" className="size-4 text-red-700" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">{quotation.quotationNumber}</span>
              <QuotationStatusBadge status={status} className="ml-2" />
            </div>
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-gray-500">
          {quotation.cancellationReason
            ? <>Cancelled: <span className="text-gray-700">{quotation.cancellationReason}</span></>
            : 'This quotation was cancelled.'}
        </div>
      </div>
    );
  }

  return null;
};

// ─── WinnerTentativeView ──────────────────────────────────────────────────────
// Extracted to a named sub-component so the useDisclosure hooks are always called
// the same number of times regardless of which status we're in.

import type { CompanyQuotationDto } from '../schemas/quotation';

interface WinnerTentativeViewProps {
  quotation: QuotationRequestDetailDto;
  winner: CompanyQuotationDto | undefined;
  cancelFooter: React.ReactNode;
}

const WinnerTentativeView = ({ quotation, winner, cancelFooter }: WinnerTentativeViewProps) => {
  const { isOpen: isRejectOpen, onOpen: openReject, onClose: closeReject } = useDisclosure();
  const { isOpen: isFinalizeOpen, onOpen: openFinalize, onClose: closeFinalize } = useDisclosure();
  const { isOpen: isNegotiateOpen, onOpen: openNegotiate, onClose: closeNegotiate } = useDisclosure();

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">{quotation.quotationNumber}</span>
            <QuotationStatusBadge status={quotation.status} />
          </div>
          {winner && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openReject}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Icon name="xmark" style="solid" className="size-3.5 mr-1.5" />
                Reject Winner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openNegotiate}
                disabled={(winner.negotiationRounds ?? 0) >= 3}
                title={
                  (winner.negotiationRounds ?? 0) >= 3
                    ? 'Maximum negotiation rounds reached'
                    : undefined
                }
              >
                <Icon name="handshake" style="solid" className="size-3.5 mr-1.5 text-orange-500" />
                Open Negotiation
              </Button>
              <Button size="sm" onClick={openFinalize} className="bg-green-600 hover:bg-green-700">
                <Icon name="flag-checkered" style="solid" className="size-3.5 mr-1.5" />
                Award
              </Button>
            </div>
          )}
        </div>
        <ShortlistSentPanel quotation={quotation} />
        {cancelFooter}
      </div>
      {winner && (
        <>
          <RejectTentativeModal
            isOpen={isRejectOpen}
            onClose={closeReject}
            quotationId={quotation.id}
            companyName={winner.companyName}
          />
          <FinalizeModal
            isOpen={isFinalizeOpen}
            onClose={closeFinalize}
            quotationId={quotation.id}
            companyQuotationId={winner.id}
            companyName={winner.companyName}
            winnerItems={winner.items ?? []}
            appraisals={quotation.appraisals ?? []}
          />
          <NegotiationModal
            isOpen={isNegotiateOpen}
            onClose={closeNegotiate}
            quotationId={quotation.id}
            companyQuotationId={winner.id}
            companyName={winner.companyName}
            currentRounds={winner.negotiationRounds ?? 0}
          />
        </>
      )}
    </>
  );
};

export default QuotationStatusView;
