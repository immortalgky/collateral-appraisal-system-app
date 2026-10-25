import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { useAuthStore } from '@/features/auth/store';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import type { QuotationRequestDetailDto, CompanyQuotationDto } from '../schemas/quotation';
import QuotationStatusBadge from './QuotationStatusBadge';
import NegotiationModal from './NegotiationModal';
import RejectTentativeModal from './RejectTentativeModal';
import FinalizeModal from './FinalizeModal';
import { isStandaloneQuotation } from '../utils/isStandaloneQuotation';

const MAX_ROUNDS = 3;

interface NegotiationPanelProps {
  quotation: QuotationRequestDetailDto;
  /** A host page can switch auto-assign off (the Administration page); it is still standalone-only. */
  allowAutoAssign?: boolean;
}

const NegotiationPanel = ({ quotation, allowAutoAssign = true }: NegotiationPanelProps) => {
  const { t } = useTranslation('quotation');
  const localizeCompanyName = useLocalizedCompanyName();
  const isIntAdmin = useAuthStore(s => s.user?.roles?.includes('IntAdmin') ?? false);
  const {
    isOpen: isNegotiateOpen,
    onOpen: openNegotiate,
    onClose: closeNegotiate,
  } = useDisclosure();
  const { isOpen: isRejectOpen, onOpen: openReject, onClose: closeReject } = useDisclosure();
  const { isOpen: isFinalizeOpen, onOpen: openFinalize, onClose: closeFinalize } = useDisclosure();

  const winner: CompanyQuotationDto | undefined = quotation.companyQuotations?.find(
    cq => cq.id === quotation.tentativeWinnerQuotationId,
  );

  if (!winner) {
    return (
      <div className="p-4 text-center text-sm text-(--palette-gray-500)">
        <Icon
          name="crown"
          style="regular"
          className="size-8 text-(--palette-gray-300) mx-auto mb-2"
        />
        <p>{t('selectWinner.rmPickInstruction')}</p>
      </div>
    );
  }

  const rmRequestsNegotiation = quotation.rmRequestsNegotiation === true;
  const rmNegotiationNote = quotation.rmNegotiationNote;

  const roundsUsed = winner.negotiationRounds ?? 0;
  const canOpenRound = quotation.status === 'WinnerTentative' || quotation.status === 'Negotiating';
  const roundsExhausted = roundsUsed >= MAX_ROUNDS;
  const awaitingResponse =
    quotation.status === 'Negotiating' && winner.negotiations?.some(n => !n.verb && !n.respondedAt);

  const formatCurrency = (v?: number | null) =>
    v != null
      ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v)
      : '—';

  return (
    <>
      {/* ── v4: RM negotiation recommendation callout ── */}
      {rmRequestsNegotiation && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-(--palette-warn-wash) px-4 py-3 flex items-start gap-3">
          <div className="size-7 rounded-lg bg-amber-200 dark:bg-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="comment-dots" style="solid" className="size-3.5 text-(--palette-warn)" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t('negotiation.rmRequestsNegotiation')}{' '}
              <strong>{localizeCompanyName(winner.companyName, winner.companyNameLocal)}</strong>
            </p>
            {rmNegotiationNote && (
              <blockquote className="mt-1.5 pl-3 border-l-2 border-amber-400 text-xs text-amber-800 dark:text-amber-300 italic">
                {rmNegotiationNote}
              </blockquote>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-200 dark:border-indigo-500/30">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-indigo-200 dark:bg-indigo-500/30 flex items-center justify-center">
              <Icon
                name="handshake"
                style="solid"
                className="size-4 text-indigo-700 dark:text-indigo-300"
              />
            </div>
            <div>
              <span className="text-sm font-semibold text-(--palette-ink)">
                {t('negotiation.title')}
              </span>
              <span className="ml-2 text-xs text-indigo-700 dark:text-indigo-300">
                {quotation.status === 'WinnerTentative'
                  ? t('negotiation.winnerSelectedNoRound')
                  : t('negotiation.roundInProgress')}
              </span>
            </div>
          </div>
          {isIntAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={quotation.status !== 'WinnerTentative'}
                onClick={openReject}
                className="text-(--palette-danger) border-red-300 dark:border-red-500/40 hover:bg-(--palette-req-wash)"
                title={
                  quotation.status === 'Negotiating' ? t('negotiation.awaitingResponse') : undefined
                }
              >
                <Icon name="xmark" style="solid" className="size-3.5 mr-1.5" />
                {t('buttons.rejectWinner')}
              </Button>
              <Button
                size="sm"
                onClick={openFinalize}
                className="bg-green-600 hover:bg-green-700"
                disabled={quotation.status !== 'WinnerTentative'}
                title={
                  quotation.status === 'Negotiating' ? t('negotiation.awaitingResponse') : undefined
                }
              >
                <Icon name="flag-checkered" style="solid" className="size-3.5 mr-1.5" />
                {t('buttons.award')}
              </Button>
            </div>
          )}
        </div>

        {/* Winner card */}
        <div className="p-4 border-b border-(--palette-line-soft)">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Icon
                name="crown"
                style="solid"
                className="size-6 text-indigo-600 dark:text-indigo-400"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold text-(--palette-ink)">
                  {localizeCompanyName(winner.companyName, winner.companyNameLocal)}
                </span>
                <QuotationStatusBadge status={winner.status} />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-(--palette-gray-600)">
                {winner.currentNegotiatedPrice != null && (
                  <span>
                    <span className="text-(--palette-gray-400)">
                      {t('negotiation.counter', { price: '' }).replace(': ', ': ')}
                    </span>
                    <span className="font-medium text-indigo-700 dark:text-indigo-300">
                      {formatCurrency(winner.currentNegotiatedPrice)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Rounds counter */}
            <div className="flex items-center gap-1 shrink-0">
              {Array.from({ length: MAX_ROUNDS }).map((_, i) => (
                <div
                  key={i}
                  className={clsx(
                    'size-3 rounded-full',
                    i < roundsUsed ? 'bg-indigo-500' : 'bg-(--palette-surface-3)',
                  )}
                  title={`Round ${i + 1}`}
                />
              ))}
              <span className="ml-1.5 text-xs text-(--palette-gray-500)">
                {t('negotiation.roundsCount', { used: roundsUsed, max: MAX_ROUNDS })}
              </span>
            </div>
          </div>

          {/* Open round button */}
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={openNegotiate}
              disabled={!canOpenRound || roundsExhausted || awaitingResponse}
              title={
                roundsExhausted
                  ? t('negotiation.maxRoundsReached')
                  : awaitingResponse
                    ? t('negotiation.awaitingResponse')
                    : undefined
              }
            >
              <Icon name="circle-play" style="solid" className="size-3.5 mr-1.5" />
              {t('buttons.openRound', { n: roundsUsed + 1 })}
            </Button>
            {roundsExhausted && (
              <span className="ml-3 text-xs text-amber-600 dark:text-amber-400">
                {t('negotiation.maxRoundsNote', { max: MAX_ROUNDS })}
              </span>
            )}
            {awaitingResponse && !roundsExhausted && (
              <span className="ml-3 text-xs text-amber-600 dark:text-amber-400">
                {t('negotiation.awaitingResponse')}
              </span>
            )}
          </div>
        </div>

        {/* Negotiation timeline */}
        {(winner.negotiations ?? []).length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-(--palette-gray-500) uppercase tracking-wider mb-3">
              {t('negotiation.history')}
            </p>
            <div className="space-y-3">
              {(winner.negotiations ?? []).map((neg, idx, arr) => (
                <div key={neg.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="size-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {neg.roundNumber}
                      </span>
                    </div>
                    <div className="flex-1 w-px bg-(--palette-line) my-1" />
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="rounded-lg border border-(--palette-line) p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-(--palette-ink)">
                          {neg.initiatedByUserName ?? neg.initiatedBy ?? 'Admin'}
                        </span>
                        <span className="text-xs text-(--palette-gray-400)">
                          {neg.initiatedAt ? new Date(neg.initiatedAt).toLocaleString('th-TH') : ''}
                        </span>
                      </div>
                      {neg.message && (
                        <p className="text-(--palette-gray-600) text-xs mt-1">{neg.message}</p>
                      )}
                      {neg.verb && (
                        <div
                          className={clsx(
                            'mt-2 pt-2 border-t border-(--palette-line-soft) text-xs',
                            neg.verb === 'Accept'
                              ? 'text-green-700 dark:text-green-300'
                              : neg.verb === 'Reject'
                                ? 'text-(--palette-req)'
                                : 'text-(--palette-warn)',
                          )}
                        >
                          <span className="font-medium">
                            {neg.verb === 'Accept'
                              ? t('negotiation.companyAccepted')
                              : neg.verb === 'Reject'
                                ? t('negotiation.companyRejected')
                                : t('negotiation.companyCountered')}
                          </span>
                          {neg.counterPrice != null && (
                            <span>
                              {' '}
                              —{' '}
                              {t('negotiation.counter', {
                                price: formatCurrency(neg.counterPrice),
                              })}
                            </span>
                          )}
                          {neg.responseMessage && (
                            <p className="mt-0.5 text-(--palette-gray-500)">
                              {neg.responseMessage}
                            </p>
                          )}
                        </div>
                      )}
                      {!neg.verb && idx === arr.length - 1 && (
                        <div className="mt-2 pt-2 border-t border-(--palette-line-soft) text-xs text-amber-600 dark:text-amber-400">
                          {t('negotiation.awaitingResponse')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <NegotiationModal
        isOpen={isNegotiateOpen}
        onClose={closeNegotiate}
        quotationId={quotation.id}
        companyQuotationId={winner.id}
        companyName={localizeCompanyName(winner.companyName, winner.companyNameLocal)}
        currentRounds={roundsUsed}
        maxRounds={MAX_ROUNDS}
      />
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
        allowAutoAssign={allowAutoAssign && isStandaloneQuotation(quotation)}
      />
    </>
  );
};

export default NegotiationPanel;
