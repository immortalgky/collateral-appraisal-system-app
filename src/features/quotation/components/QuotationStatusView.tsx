import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { useCancelQuotation } from '../api/quotation';
import { MAX_NEGOTIATION_ROUNDS } from '../constants';
import { sumQuotationItems } from '../utils/sumQuotationItems';
import type { QuotationRequestDetailDto } from '../schemas/quotation';
import QuotationStatusBadge from './QuotationStatusBadge';
import InvitedCompaniesPopover from './InvitedCompaniesPopover';
import ShortlistSentPanel from './ShortlistSentPanel';
import NegotiationPanel from './NegotiationPanel';
import BoldTrans from './BoldTrans';
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
  const { t } = useTranslation('quotation');
  const localizeCompanyName = useLocalizedCompanyName();
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
      toast.error(t('toasts.noLongerCancellable', { status }));
      closeCancelModal();
      return;
    }
    cancelQuotation(
      { reason: cancelReason.trim() || null },
      {
        onSuccess: () => {
          toast.success(t('toasts.quotationCancelled'));
          closeCancelModal();
        },
        onError: (err: unknown) => {
          const e = err as { apiError?: { detail?: string } };
          toast.error(e?.apiError?.detail ?? t('toasts.cancelFailed'));
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
          className="inline-flex items-center gap-1 text-xs text-(--palette-danger) hover:text-(--palette-req) underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="ban" style="solid" className="size-3" />
          {t('shared.cancelQuotation')}
        </button>
      </div>
      <Modal
        isOpen={showCancelConfirm}
        onClose={closeCancelModal}
        title={t('cancel.title')}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-(--palette-req-wash) rounded-lg border border-red-100 dark:border-red-500/20 flex items-start gap-2">
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="size-4 text-red-500 shrink-0 mt-0.5"
            />
            <p className="text-sm text-(--palette-req)">
              <BoldTrans i18nKey="cancel.bodyRich" values={{ number: quotation.quotationNumber }} />
            </p>
          </div>
          <div>
            <label className="block text-sm text-(--palette-gray-600) mb-1">
              {t('fields.reasonOptional')}{' '}
              <span className="text-(--palette-gray-400)">{t('fields.notesOptional')}</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder={t('placeholders.cancelReason')}
              className="w-full px-3 py-2 border border-(--palette-line) rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
            <p className="mt-1 text-[11px] text-(--palette-gray-400) text-right">
              {cancelReason.length}/500
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={closeCancelModal} disabled={isCancelling}>
              {t('buttons.goBack')}
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel} disabled={isCancelling}>
              {isCancelling ? (
                <>
                  <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                  {t('cancel.cancelling')}
                </>
              ) : (
                <>
                  <Icon name="ban" style="solid" className="size-4 mr-2" />
                  {t('cancel.cancelButton')}
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
    const cutOffTime = new Date(quotation.cutOffTime);
    const hoursLeft = Math.max(0, Math.floor((cutOffTime.getTime() - Date.now()) / 36e5));
    const companyQuotations = quotation.companyQuotations ?? [];
    const invitedCompanies = quotation.invitedCompanies ?? [];

    return (
      <div className="flex flex-col gap-2">
        <div className="bg-(--palette-surface) rounded-xl border border-purple-200 dark:border-purple-500/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-500/10 border-b border-purple-200 dark:border-purple-500/30">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-purple-200 dark:bg-purple-500/30 flex items-center justify-center">
                <Icon
                  name="clock"
                  style="solid"
                  className="size-4 text-purple-700 dark:text-purple-300"
                />
              </div>
              <div>
                <span className="text-sm font-semibold text-(--palette-ink)">
                  {quotation.quotationNumber}
                </span>
                <QuotationStatusBadge status={status} className="ml-2" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-(--palette-gray-500)">{t('shared.closes')}</div>
              <div
                className={clsx(
                  'text-sm font-medium',
                  hoursLeft < 24 ? 'text-(--palette-danger)' : 'text-(--palette-ink)',
                )}
              >
                {fmtDateTime(quotation.cutOffTime)}
              </div>
              {hoursLeft < 48 && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  {t('shared.hoursRemaining', { n: hoursLeft })}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 py-3 text-sm text-(--palette-gray-600) border-b border-(--palette-line-soft)">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-(--palette-gray-500) flex items-center gap-1">
                  {t('shared.companiesInvited')}
                  <InvitedCompaniesPopover
                    companies={quotation.invitedCompanies ?? []}
                    totalInvited={quotation.totalCompaniesInvited}
                  />
                </div>
                <div className="font-medium text-(--palette-ink)">
                  {quotation.totalCompaniesInvited}
                </div>
              </div>
              <div>
                <div className="text-xs text-(--palette-gray-500)">{t('shared.responses')}</div>
                <div className="font-medium text-(--palette-ink)">
                  {quotation.totalQuotationsReceived} / {quotation.totalCompaniesInvited}
                </div>
              </div>
              <div>
                <div className="text-xs text-(--palette-gray-500)">{t('shared.appraisals')}</div>
                <div className="font-medium text-(--palette-ink)">{quotation.totalAppraisals}</div>
              </div>
            </div>
          </div>

          {/* Company responses table */}
          {invitedCompanies.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
                    <th className="px-4 py-3 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                      {t('columns.company')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                      {t('columns.totalFeeAmount')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                      {t('columns.totalDiscount')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                      {t('columns.totalNetAmount')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                      {t('columns.totalEstimateManday')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                      {t('columns.submittedAt')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider">
                      {t('columns.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--palette-line-soft)">
                  {invitedCompanies.map(inv => {
                    const cq = companyQuotations.find(q => q.companyId === inv.companyId);
                    const items = cq?.items ?? [];
                    const hasItems = items.length > 0;
                    const { totalFeeAmount, totalDiscount, totalEstimateManday } =
                      sumQuotationItems(items);
                    return (
                      <tr
                        key={inv.companyId}
                        className="hover:bg-(--palette-surface-2) transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-(--palette-ink)">
                            {localizeCompanyName(inv.companyName, inv.companyNameLocal)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-(--palette-ink) tabular-nums">
                            {hasItems ? fmtCurrency(totalFeeAmount) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-(--palette-ink) tabular-nums">
                            {hasItems ? fmtCurrency(totalDiscount) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-(--palette-ink) tabular-nums">
                            {cq ? fmtCurrency(cq.totalQuotedPrice) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-(--palette-gray-600)">
                            {hasItems ? totalEstimateManday : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-(--palette-gray-600)">
                            {cq ? fmtDateTime(cq.submittedAt) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {cq ? (
                            <QuotationStatusBadge status={cq.status} />
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-(--palette-surface-3) text-(--palette-gray-600)">
                              {t('invitedCompanies.pending')}
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
          <span className="text-sm font-semibold text-(--palette-ink)">
            {quotation.quotationNumber}
          </span>
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
      <WinnerTentativeView quotation={quotation} winner={winner} cancelFooter={cancelFooter} />
    );
  }

  // ─── Negotiating ──────────────────────────────────────────────────────────
  if (status === 'Negotiating') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-(--palette-ink)">
            {quotation.quotationNumber}
          </span>
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
      <div className="bg-(--palette-surface) rounded-xl border border-green-200 dark:border-green-500/30 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-500/10 border-b border-green-200 dark:border-green-500/30">
          <div className="size-8 rounded-lg bg-green-200 dark:bg-green-500/30 flex items-center justify-center">
            <Icon
              name="circle-check"
              style="solid"
              className="size-4 text-green-700 dark:text-green-300"
            />
          </div>
          <div>
            <span className="text-sm font-semibold text-(--palette-ink)">
              {quotation.quotationNumber}
            </span>
            <QuotationStatusBadge status={status} className="ml-2" />
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-(--palette-gray-600)">
          <p>
            <BoldTrans
              i18nKey="shared.quotationAwarded"
              values={{
                company: winner
                  ? localizeCompanyName(winner.companyName, winner.companyNameLocal)
                  : '—',
              }}
              strongClassName="text-(--palette-ink)"
            />
          </p>
          {finalPrice != null && (
            <p className="mt-1">
              {t('shared.finalPrice')}{' '}
              <strong className="text-green-700 dark:text-green-300">
                {fmtCurrency(finalPrice)}
              </strong>
            </p>
          )}
          <p className="mt-2 text-xs text-(--palette-gray-400)">{t('shared.assignHint')}</p>
        </div>
      </div>
    );
  }

  // ─── Cancelled ────────────────────────────────────────────────────────────
  if (status === 'Cancelled') {
    return (
      <div className="bg-(--palette-surface) rounded-xl border border-(--palette-req-line) overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-(--palette-req-wash) border-b border-(--palette-req-line)">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-red-200 dark:bg-red-500/30 flex items-center justify-center">
              <Icon name="ban" style="solid" className="size-4 text-(--palette-req)" />
            </div>
            <div>
              <span className="text-sm font-semibold text-(--palette-ink)">
                {quotation.quotationNumber}
              </span>
              <QuotationStatusBadge status={status} className="ml-2" />
            </div>
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-(--palette-gray-500)">
          {quotation.cancellationReason ? (
            <>
              {t('shared.cancelledWith')}{' '}
              <span className="text-(--palette-ink)">{quotation.cancellationReason}</span>
            </>
          ) : (
            t('shared.quotationCancelled')
          )}
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
  const { t } = useTranslation('quotation');
  const localizeCompanyName = useLocalizedCompanyName();
  const { isOpen: isRejectOpen, onOpen: openReject, onClose: closeReject } = useDisclosure();
  const { isOpen: isFinalizeOpen, onOpen: openFinalize, onClose: closeFinalize } = useDisclosure();
  const {
    isOpen: isNegotiateOpen,
    onOpen: openNegotiate,
    onClose: closeNegotiate,
  } = useDisclosure();

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-(--palette-ink)">
              {quotation.quotationNumber}
            </span>
            <QuotationStatusBadge status={quotation.status} />
          </div>
          {winner && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openReject}
                className="text-(--palette-danger) border-red-300 dark:border-red-500/40 hover:bg-(--palette-req-wash)"
              >
                <Icon name="xmark" style="solid" className="size-3.5 mr-1.5" />
                {t('buttons.rejectWinner')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openNegotiate}
                disabled={(winner.negotiationRounds ?? 0) >= MAX_NEGOTIATION_ROUNDS}
                title={
                  (winner.negotiationRounds ?? 0) >= MAX_NEGOTIATION_ROUNDS
                    ? t('negotiation.maxRoundsReached')
                    : undefined
                }
              >
                <Icon name="handshake" style="solid" className="size-3.5 mr-1.5 text-orange-500" />
                {t('buttons.openNegotiation')}
              </Button>
              <Button size="sm" onClick={openFinalize} className="bg-green-600 hover:bg-green-700">
                <Icon name="flag-checkered" style="solid" className="size-3.5 mr-1.5" />
                {t('buttons.award')}
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
            companyName={localizeCompanyName(winner.companyName, winner.companyNameLocal)}
          />
          <FinalizeModal
            isOpen={isFinalizeOpen}
            onClose={closeFinalize}
            quotationId={quotation.id}
            companyQuotationId={winner.id}
            companyName={localizeCompanyName(winner.companyName, winner.companyNameLocal)}
            winnerItems={winner.items ?? []}
            appraisals={quotation.appraisals ?? []}
          />
          <NegotiationModal
            isOpen={isNegotiateOpen}
            onClose={closeNegotiate}
            quotationId={quotation.id}
            companyQuotationId={winner.id}
            companyName={localizeCompanyName(winner.companyName, winner.companyNameLocal)}
            currentRounds={winner.negotiationRounds ?? 0}
          />
        </>
      )}
    </>
  );
};

export default QuotationStatusView;
