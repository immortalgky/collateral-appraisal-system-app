import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import type { QuotationNegotiationDto } from '../schemas/quotation';
import { useRespondNegotiation } from '../api/quotation';

interface RespondNegotiationPanelProps {
  quotationId: string;
  companyQuotationId: string;
  openNegotiation: QuotationNegotiationDto;
}

const RespondNegotiationPanel = ({
  quotationId,
  companyQuotationId,
  openNegotiation,
}: RespondNegotiationPanelProps) => {
  const { mutate: respond, isPending } = useRespondNegotiation(quotationId);
  const [verb, setVerb] = useState<'Accept' | 'Counter' | 'Reject' | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!verb) return;
    if (verb === 'Counter' && !counterPrice) {
      toast.error('Counter price is required');
      return;
    }

    respond(
      {
        negotiationId: openNegotiation.id,
        companyQuotationId,
        verb,
        counterPrice: verb === 'Counter' ? parseFloat(counterPrice) : null,
        message: message || null,
      },
      {
        onSuccess: () => {
          toast.success('Response submitted');
          setVerb(null);
          setCounterPrice('');
          setMessage('');
        },
        onError: (err: any) => {
          toast.error(err?.apiError?.detail ?? 'Failed to submit response');
        },
      },
    );
  };

  const formatCurrency = (v?: number | null) =>
    v != null ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v) : '—';

  return (
    <div className="rounded-xl border border-orange-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border-b border-orange-200">
        <div className="size-8 rounded-lg bg-orange-200 flex items-center justify-center">
          <Icon name="comment-dots" style="solid" className="size-4 text-orange-700" />
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-900">Negotiation Round {openNegotiation.roundNumber}</span>
          <span className="ml-2 text-xs text-orange-700">Response required</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Admin's proposal */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">Admin proposed</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(openNegotiation.proposedPrice)}
          </div>
          {openNegotiation.message && (
            <p className="mt-2 text-sm text-gray-600 border-t border-gray-200 pt-2">
              {openNegotiation.message}
            </p>
          )}
        </div>

        {/* Response verb picker */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Your response</p>
          <div className="grid grid-cols-3 gap-2">
            {(['Accept', 'Counter', 'Reject'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setVerb(v)}
                className={clsx(
                  'py-2 px-3 rounded-lg border text-sm font-medium transition-colors',
                  verb === v
                    ? v === 'Accept'
                      ? 'bg-green-500 border-green-500 text-white'
                      : v === 'Reject'
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'bg-amber-500 border-amber-500 text-white'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700',
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Counter price */}
        {verb === 'Counter' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Counter Price (THB) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={counterPrice}
              onChange={e => setCounterPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Your counter price"
            />
          </div>
        )}

        {/* Message */}
        {verb && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              placeholder="Add a message to your response..."
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!verb || isPending}>
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Response'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RespondNegotiationPanel;
