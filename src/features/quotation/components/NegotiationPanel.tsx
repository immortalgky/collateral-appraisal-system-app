import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import type { QuotationRequestDetailDto, CompanyQuotationDto } from '../schemas/quotation';
import QuotationStatusBadge from './QuotationStatusBadge';
import NegotiationModal from './NegotiationModal';
import RejectTentativeModal from './RejectTentativeModal';
import FinalizeModal from './FinalizeModal';

const MAX_ROUNDS = 3;

interface NegotiationPanelProps {
  quotation: QuotationRequestDetailDto;
}

const NegotiationPanel = ({ quotation }: NegotiationPanelProps) => {
  const {
    isOpen: isNegotiateOpen,
    onOpen: openNegotiate,
    onClose: closeNegotiate,
  } = useDisclosure();
  const {
    isOpen: isRejectOpen,
    onOpen: openReject,
    onClose: closeReject,
  } = useDisclosure();
  const {
    isOpen: isFinalizeOpen,
    onOpen: openFinalize,
    onClose: closeFinalize,
  } = useDisclosure();

  const winner: CompanyQuotationDto | undefined = quotation.companyQuotations?.find(
    cq => cq.id === quotation.tentativeWinnerQuotationId,
  );

  if (!winner) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        <Icon name="crown" style="regular" className="size-8 text-gray-300 mx-auto mb-2" />
        <p>Awaiting tentative winner selection from RM...</p>
      </div>
    );
  }

  const rmRequestsNegotiation = quotation.rmRequestsNegotiation === true;
  const rmNegotiationNote = quotation.rmNegotiationNote;

  const roundsUsed = winner.negotiationRounds ?? 0;
  const canOpenRound =
    quotation.status === 'WinnerTentative' || quotation.status === 'Negotiating';
  const roundsExhausted = roundsUsed >= MAX_ROUNDS;
  const awaitingResponse =
    quotation.status === 'Negotiating' &&
    winner.negotiations?.some(n => !n.verb && !n.respondedAt);

  const effectivePrice = winner.currentNegotiatedPrice ?? winner.totalQuotedPrice;

  const formatCurrency = (v?: number | null) =>
    v != null ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v) : '—';

  return (
    <>
      {/* ── v4: RM negotiation recommendation callout ── */}
      {rmRequestsNegotiation && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <div className="size-7 rounded-lg bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="comment-dots" style="solid" className="size-3.5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              RM requests negotiation with <strong>{winner.companyName}</strong>
            </p>
            {rmNegotiationNote && (
              <blockquote className="mt-1.5 pl-3 border-l-2 border-amber-400 text-xs text-amber-800 italic">
                {rmNegotiationNote}
              </blockquote>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-indigo-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-200">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-indigo-200 flex items-center justify-center">
              <Icon name="handshake" style="solid" className="size-4 text-indigo-700" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">Negotiation</span>
              <span className="ml-2 text-xs text-indigo-700">
                {quotation.status === 'WinnerTentative'
                  ? 'Winner selected — no active round'
                  : 'Round in progress'}
              </span>
            </div>
          </div>
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
              size="sm"
              onClick={openFinalize}
              className="bg-green-600 hover:bg-green-700"
              disabled={quotation.status !== 'WinnerTentative'}
              title={
                quotation.status === 'Negotiating'
                  ? 'Wait for the company to respond before finalizing'
                  : undefined
              }
            >
              <Icon name="flag-checkered" style="solid" className="size-3.5 mr-1.5" />
              Finalize
            </Button>
          </div>
        </div>

        {/* Winner card */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <Icon name="crown" style="solid" className="size-6 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold text-gray-900">{winner.companyName}</span>
                <QuotationStatusBadge status={winner.status} />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span>
                  <span className="text-gray-400">Quoted: </span>
                  {formatCurrency(winner.totalQuotedPrice)}
                </span>
                {winner.currentNegotiatedPrice != null && (
                  <span>
                    <span className="text-gray-400">Negotiated: </span>
                    <span className="font-medium text-indigo-700">
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
                    i < roundsUsed ? 'bg-indigo-500' : 'bg-gray-200',
                  )}
                  title={`Round ${i + 1}`}
                />
              ))}
              <span className="ml-1.5 text-xs text-gray-500">
                {roundsUsed}/{MAX_ROUNDS} rounds
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
                  ? 'Maximum negotiation rounds reached'
                  : awaitingResponse
                  ? 'Awaiting company response'
                  : undefined
              }
            >
              <Icon name="circle-play" style="solid" className="size-3.5 mr-1.5" />
              Open Round {roundsUsed + 1}
            </Button>
            {roundsExhausted && (
              <span className="ml-3 text-xs text-amber-600">
                Maximum rounds ({MAX_ROUNDS}) reached — finalize or reject
              </span>
            )}
            {awaitingResponse && !roundsExhausted && (
              <span className="ml-3 text-xs text-amber-600">
                Awaiting company response...
              </span>
            )}
          </div>
        </div>

        {/* Negotiation timeline */}
        {(winner.negotiations ?? []).length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Negotiation History
            </p>
            <div className="space-y-3">
              {(winner.negotiations ?? []).map(neg => (
                <div key={neg.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="size-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-indigo-600">{neg.roundNumber}</span>
                    </div>
                    <div className="flex-1 w-px bg-gray-200 my-1" />
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="rounded-lg border border-gray-200 p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          Admin proposed {formatCurrency(neg.proposedPrice)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(neg.createdAt).toLocaleString('th-TH')}
                        </span>
                      </div>
                      {neg.message && (
                        <p className="text-gray-600 text-xs mt-1">{neg.message}</p>
                      )}
                      {neg.verb && (
                        <div
                          className={clsx(
                            'mt-2 pt-2 border-t border-gray-100 text-xs',
                            neg.verb === 'Accept' ? 'text-green-700' : neg.verb === 'Reject' ? 'text-red-700' : 'text-amber-700',
                          )}
                        >
                          <span className="font-medium">
                            Company {neg.verb}ed
                          </span>
                          {neg.counterPrice != null && (
                            <span> — counter: {formatCurrency(neg.counterPrice)}</span>
                          )}
                          {neg.responseMessage && (
                            <p className="mt-0.5 text-gray-500">{neg.responseMessage}</p>
                          )}
                        </div>
                      )}
                      {!neg.verb && (
                        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-amber-600">
                          Awaiting company response...
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
        companyName={winner.companyName}
        currentRounds={roundsUsed}
        maxRounds={MAX_ROUNDS}
      />
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
        suggestedPrice={effectivePrice}
      />
    </>
  );
};

export default NegotiationPanel;
