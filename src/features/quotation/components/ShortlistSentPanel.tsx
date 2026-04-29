import { useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import { useRecallShortlist } from '../api/quotation';
import type { QuotationRequestDetailDto } from '../schemas/quotation';
import QuotationStatusBadge from './QuotationStatusBadge';
import { AdminCompanyQuotationDetailContent } from '../pages/AdminCompanyQuotationDetailPage';

interface ShortlistSentPanelProps {
  quotation: QuotationRequestDetailDto;
}

/** Format an ISO datetime string as DD/MM/YYYY HH:mm */
const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ShortlistSentPanel = ({ quotation }: ShortlistSentPanelProps) => {
  const { mutate: recall, isPending } = useRecallShortlist(quotation.id);
  const hasTentativeWinner = !!quotation.tentativeWinnerQuotationId;
  const [drawerCompanyQuotationId, setDrawerCompanyQuotationId] = useState<string | null>(null);
  const drawerCompany = drawerCompanyQuotationId
    ? quotation.companyQuotations?.find(cq => cq.id === drawerCompanyQuotationId)
    : null;

  const handleRecall = () => {
    recall(undefined, {
      onSuccess: () => toast.success('Shortlist recalled — you can now revise and re-send'),
      onError: (err: any) => toast.error(err?.apiError?.detail ?? 'Failed to recall shortlist'),
    });
  };

  const formatCurrency = (v?: number | null) =>
    v != null
      ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v)
      : '—';

  const shortlisted = (quotation.companyQuotations ?? []).filter(q => q.isShortlisted);

  return (
    <>
      <div className="rounded-xl border border-purple-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-purple-200 flex items-center justify-center">
              <Icon name="share-from-square" style="solid" className="size-4 text-purple-700" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">Shortlist Sent to RM</span>
              {quotation.shortlistSentToRmAt && (
                <span className="ml-2 text-xs text-purple-700">
                  {new Date(quotation.shortlistSentToRmAt).toLocaleString('th-TH')}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecall}
            disabled={isPending || hasTentativeWinner}
            title={
              hasTentativeWinner ? 'Cannot recall once a tentative winner is picked' : undefined
            }
          >
            {isPending ? (
              <Icon name="spinner" style="solid" className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <Icon name="rotate-left" style="solid" className="size-3.5 mr-1.5" />
            )}
            Recall Shortlist
          </Button>
        </div>

        {hasTentativeWinner && (
          <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
            <Icon name="circle-info" style="solid" className="size-4 text-indigo-500 shrink-0" />
            <p className="text-xs text-indigo-700">
              RM has already picked a tentative winner — recall is disabled. Use "Reject Tentative
              Winner" to restart the selection.
            </p>
          </div>
        )}

        {/* RM negotiation recommendation — surfaced once RM picks a tentative winner so the
            admin sees what the RM wants before deciding whether to Open Negotiation. */}
        {hasTentativeWinner && (quotation.rmRequestsNegotiation || quotation.rmNegotiationNote) && (
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
            <div className="flex items-start gap-2">
              <Icon
                name="comment-dots"
                style="solid"
                className="size-4 text-orange-600 shrink-0 mt-0.5"
              />
              <div className="text-sm flex-1">
                <div className="font-medium text-orange-900">
                  RM Negotiation Recommendation
                  {quotation.rmRequestsNegotiation && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-200 text-orange-800 uppercase tracking-wide">
                      Negotiation Requested
                    </span>
                  )}
                </div>
                {quotation.rmNegotiationNote ? (
                  <p className="mt-1 text-orange-800 whitespace-pre-wrap">
                    {quotation.rmNegotiationNote}
                  </p>
                ) : (
                  <p className="mt-1 text-orange-700 italic">No note provided.</p>
                )}
              </div>
            </div>
          </div>
        )}

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
                <th className="px-4 py-3 w-10" aria-label="Detail" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shortlisted.map(cq => {
                const items = cq.items ?? [];
                const hasItems = items.length > 0;
                const totalFeeAmount = items.reduce((sum, item) => sum + (item.feeAmount ?? 0), 0);
                const totalDiscount = items.reduce(
                  (sum, item) => sum + (item.discount ?? 0) + (item.negotiatedDiscount ?? 0),
                  0,
                );
                const totalEstimateManday = items.reduce(
                  (sum, item) => sum + (item.estimatedDays ?? 0),
                  0,
                );
                return (
                  <tr
                    key={cq.id}
                    className={clsx(
                      'transition-colors hover:bg-gray-50',
                      quotation.tentativeWinnerQuotationId === cq.id && 'bg-indigo-50',
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{cq.companyName}</span>
                        {quotation.tentativeWinnerQuotationId === cq.id && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 font-medium">
                            <Icon name="crown" style="solid" className="size-3" />
                            Tentative Winner
                          </span>
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
                      <span className="text-sm text-gray-600">{fmtDateTime(cq.submittedAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <QuotationStatusBadge status={cq.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cq.id &&
                        [
                          'Submitted',
                          'UnderReview',
                          'Accepted',
                          'Rejected',
                          'Tentative',
                          'Negotiating',
                          'Withdrawn',
                        ].includes(cq.status) && (
                          <button
                            type="button"
                            aria-label={`View ${cq.companyName} quotation detail`}
                            onClick={() => setDrawerCompanyQuotationId(cq.id)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                          >
                            <Icon
                              name="file-lines"
                              style="regular"
                              className="size-4 text-blue-500"
                            />
                          </button>
                        )}
                    </td>
                  </tr>
                );
              })}
              {shortlisted.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                    No shortlisted companies
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SlideOverPanel
        isOpen={!!drawerCompanyQuotationId}
        onClose={() => setDrawerCompanyQuotationId(null)}
        title="External Appraisal Company Quotation Information"
        subtitle={drawerCompany?.companyName ?? undefined}
        width="2xl"
      >
        {drawerCompanyQuotationId && (
          <AdminCompanyQuotationDetailContent
            quotationRequestId={quotation.id}
            companyQuotationId={drawerCompanyQuotationId}
            mode="drawer"
            onClose={() => setDrawerCompanyQuotationId(null)}
          />
        )}
      </SlideOverPanel>
    </>
  );
};

export default ShortlistSentPanel;
