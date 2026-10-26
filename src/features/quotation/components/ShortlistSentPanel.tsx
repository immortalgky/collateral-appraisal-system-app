import { useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import { useRecallShortlist } from '../api/quotation';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import type { QuotationRequestDetailDto } from '../schemas/quotation';
import { sortCompanyResponses } from '../utils/sortCompanyResponses';
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
  const { t } = useTranslation('quotation');
  const localizeCompanyName = useLocalizedCompanyName();
  const { mutate: recall, isPending } = useRecallShortlist(quotation.id);
  const hasTentativeWinner = !!quotation.tentativeWinnerQuotationId;
  const [drawerCompanyQuotationId, setDrawerCompanyQuotationId] = useState<string | null>(null);
  const drawerCompany = drawerCompanyQuotationId
    ? quotation.companyQuotations?.find(cq => cq.id === drawerCompanyQuotationId)
    : null;

  const handleRecall = () => {
    recall(undefined, {
      onSuccess: () => toast.success(t('toasts.shortlistRecalled')),
      onError: (err: any) => toast.error(err?.apiError?.detail ?? t('toasts.recallFailed')),
    });
  };

  const formatCurrency = (v?: number | null) =>
    v != null
      ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v)
      : '—';

  const shortlisted = sortCompanyResponses(
    (quotation.companyQuotations ?? []).filter(q => q.isShortlisted),
    cq => ({
      status: cq.status,
      totalNetAmount: cq.totalQuotedPrice,
      companyName: cq.companyName,
    }),
  );

  return (
    <>
      <div className="rounded-xl border border-purple-200 dark:border-purple-500/30 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-500/10 border-b border-purple-200 dark:border-purple-500/30">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-purple-200 dark:bg-purple-500/30 flex items-center justify-center">
              <Icon
                name="share-from-square"
                style="solid"
                className="size-4 text-purple-700 dark:text-purple-300"
              />
            </div>
            <div>
              <span className="text-sm font-semibold text-(--palette-ink)">
                {t('shortlist.shortlistSentToRm')}
              </span>
              {quotation.shortlistSentToRmAt && (
                <span className="ml-2 text-xs text-purple-700 dark:text-purple-300">
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
            title={hasTentativeWinner ? t('shortlist.recallDisabledHint') : undefined}
          >
            {isPending ? (
              <Icon name="spinner" style="solid" className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <Icon name="rotate-left" style="solid" className="size-3.5 mr-1.5" />
            )}
            {t('buttons.recallShortlist')}
          </Button>
        </div>

        {hasTentativeWinner && (
          <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center gap-2">
            <Icon name="circle-info" style="solid" className="size-4 text-indigo-500 shrink-0" />
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              {t('shortlist.recallDisabledHint')}
            </p>
          </div>
        )}

        {/* RM negotiation recommendation */}
        {hasTentativeWinner && (quotation.rmRequestsNegotiation || quotation.rmNegotiationNote) && (
          <div className="px-4 py-3 bg-orange-50 dark:bg-orange-500/10 border-b border-orange-100 dark:border-orange-500/20">
            <div className="flex items-start gap-2">
              <Icon
                name="comment-dots"
                style="solid"
                className="size-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5"
              />
              <div className="text-sm flex-1">
                <div className="font-medium text-orange-900 dark:text-orange-200">
                  {t('negotiation.rmNegotiationRecommendation')}
                  {quotation.rmRequestsNegotiation && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-200 dark:bg-orange-500/30 text-orange-800 dark:text-orange-300 uppercase tracking-wide">
                      {t('negotiation.negotiationRequested')}
                    </span>
                  )}
                </div>
                {quotation.rmNegotiationNote ? (
                  <p className="mt-1 text-orange-800 dark:text-orange-300 whitespace-pre-wrap">
                    {quotation.rmNegotiationNote}
                  </p>
                ) : (
                  <p className="mt-1 text-orange-700 dark:text-orange-300 italic">
                    {t('negotiation.noNoteProvided')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

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
                <th
                  className="text-xs px-4 py-3 w-10 font-semibold"
                  aria-label={t('columns.detail')}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-(--palette-line-soft)">
              {shortlisted.map(cq => {
                const items = cq.items ?? [];
                const hasItems = items.length > 0;
                const totalFeeAmount = items.reduce((sum, item) => sum + (item.feeAmount ?? 0), 0);
                const totalDiscount = items.reduce(
                  (sum, item) => sum + (item.discount ?? 0) + (item.negotiatedDiscount ?? 0),
                  0,
                );
                const validEstimatedDays = items
                  .map(item => item.estimatedDays)
                  .filter((d): d is number => typeof d === 'number' && d > 0);
                const minEstimateManday = validEstimatedDays.length
                  ? Math.min(...validEstimatedDays)
                  : undefined;
                const maxEstimateManday = validEstimatedDays.length
                  ? Math.max(...validEstimatedDays)
                  : undefined;
                return (
                  <tr
                    key={cq.id}
                    className={clsx(
                      'transition-colors hover:bg-(--palette-surface-2)',
                      quotation.tentativeWinnerQuotationId === cq.id &&
                        'bg-indigo-50 dark:bg-indigo-500/10',
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-(--palette-ink)">
                          {localizeCompanyName(cq.companyName, cq.companyNameLocal)}
                        </span>
                        {quotation.tentativeWinnerQuotationId === cq.id && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-medium">
                            <Icon name="crown" style="solid" className="size-3" />
                            {t('shortlist.tentativeWinner')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-(--palette-ink) tabular-nums">
                        {hasItems ? formatCurrency(totalFeeAmount) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-(--palette-ink) tabular-nums">
                        {hasItems ? formatCurrency(totalDiscount) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-(--palette-ink) tabular-nums">
                        {formatCurrency(cq.totalQuotedPrice)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-(--palette-gray-600)">
                        {minEstimateManday !== undefined && maxEstimateManday !== undefined
                          ? minEstimateManday === maxEstimateManday
                            ? minEstimateManday
                            : `${minEstimateManday} - ${maxEstimateManday}`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-(--palette-gray-600)">
                        {fmtDateTime(cq.submittedAt)}
                      </span>
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
                            aria-label={t('aria.viewDetail', {
                              company: localizeCompanyName(cq.companyName, cq.companyNameLocal),
                            })}
                            onClick={() => setDrawerCompanyQuotationId(cq.id)}
                            className="p-1 rounded hover:bg-(--palette-surface-3) transition-colors"
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
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-sm text-(--palette-gray-500)"
                  >
                    {t('empty.noShortlisted')}
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
        title={t('page.extQuotationTitle')}
        subtitle={
          drawerCompany
            ? localizeCompanyName(drawerCompany.companyName, drawerCompany.companyNameLocal)
            : undefined
        }
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
