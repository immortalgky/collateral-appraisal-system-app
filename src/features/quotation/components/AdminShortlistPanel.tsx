import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import {
  usePickTentativeWinner,
  useShortlistQuotation,
  useUnshortlistQuotation,
} from '../api/quotation';
import type { CompanyQuotationDto } from '../schemas/quotation';
import QuotationStatusBadge from './QuotationStatusBadge';
import SendToRmModal from './SendToRmModal';
import { AdminCompanyQuotationDetailContent } from '../pages/AdminCompanyQuotationDetailPage';

/** Format an ISO datetime string as DD/MM/YYYY HH:mm */
const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface AdminShortlistPanelProps {
  quotationId: string;
  companyQuotations: CompanyQuotationDto[];
}

const AdminShortlistPanel = ({ quotationId, companyQuotations }: AdminShortlistPanelProps) => {
  const { t } = useTranslation('quotation');
  const { mutate: shortlist, isPending: isShortlisting } = useShortlistQuotation(quotationId);
  const { mutate: unshortlist, isPending: isUnshortlisting } = useUnshortlistQuotation(quotationId);
  const { mutate: pickWinner, isPending: isPickingWinner } = usePickTentativeWinner(quotationId);
  const { isOpen: isSendToRmOpen, onOpen: openSendToRm, onClose: closeSendToRm } = useDisclosure();
  const {
    isOpen: isSelectWinnerConfirmOpen,
    onOpen: openSelectWinnerConfirm,
    onClose: closeSelectWinnerConfirm,
  } = useDisclosure();
  /** Selected companyQuotationId for the right-side detail drawer (null = closed). */
  const [drawerCompanyQuotationId, setDrawerCompanyQuotationId] = useState<string | null>(null);
  const drawerCompany = drawerCompanyQuotationId
    ? companyQuotations.find(cq => cq.id === drawerCompanyQuotationId)
    : null;

  const shortlistedQuotations = companyQuotations.filter(q => q.isShortlisted);
  const shortlistedCount = shortlistedQuotations.length;
  const isPending = isShortlisting || isUnshortlisting;
  /** Admin can pick winner directly only when exactly one company is shortlisted. */
  const canSelectAsWinner = shortlistedCount === 1 && !isPickingWinner;

  const handleToggle = (cq: CompanyQuotationDto) => {
    if (isPending) return;
    if (cq.isShortlisted) {
      unshortlist(cq.id, {
        onError: (err: any) =>
          toast.error(err?.apiError?.detail ?? t('toasts.shortlistRemoveFailed')),
      });
    } else {
      shortlist(cq.id, {
        onError: (err: any) => toast.error(err?.apiError?.detail ?? t('toasts.shortlistAddFailed')),
      });
    }
  };

  const formatCurrency = (v?: number | null) =>
    v != null
      ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v)
      : '—';

  /**
   * Re-derive the target inside the confirm callback so a concurrent shortlist change between
   * "open dialog" and "click confirm" doesn't fire pick-winner against a stale company id.
   */
  const handleConfirmSelectAsWinner = () => {
    const currentShortlisted = companyQuotations.filter(q => q.isShortlisted);
    if (currentShortlisted.length !== 1) {
      toast.error(t('toasts.shortlistChanged'));
      closeSelectWinnerConfirm();
      return;
    }
    const target = currentShortlisted[0];
    pickWinner(
      { companyQuotationId: target.id },
      {
        onError: (err: any) => toast.error(err?.apiError?.detail ?? t('toasts.selectWinnerFailed')),
        onSuccess: () => {
          toast.success(t('toasts.companySelected'));
          closeSelectWinnerConfirm();
        },
      },
    );
  };

  const selectWinnerTargetName = shortlistedQuotations[0]?.companyName?.trim() || 'this company';

  return (
    <>
      <div className="rounded-xl border border-purple-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-purple-200 flex items-center justify-center">
              <Icon name="clipboard-list" style="solid" className="size-4 text-purple-700" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">{t('shortlist.title')}</span>
              <span className="ml-2 text-xs text-purple-700">
                {t('shortlist.shortlistedCount', {
                  count: shortlistedCount,
                  total: companyQuotations.length,
                })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={openSelectWinnerConfirm}
              disabled={!canSelectAsWinner}
              title={
                shortlistedCount === 0
                  ? t('shortlist.selectWinnerHint0')
                  : shortlistedCount > 1
                    ? t('shortlist.selectWinnerHintMulti')
                    : undefined
              }
            >
              {isPickingWinner ? (
                <Icon name="spinner" style="solid" className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Icon name="trophy" style="solid" className="size-3.5 mr-1.5" />
              )}
              {t('buttons.selectAsWinner')}
            </Button>
            <Button size="sm" onClick={openSendToRm} disabled={shortlistedCount === 0}>
              <Icon name="paper-plane" style="solid" className="size-3.5 mr-1.5" />
              {t('buttons.sendToRm')}
            </Button>
          </div>
        </div>

        {companyQuotations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Icon name="inbox" style="regular" className="size-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{t('empty.noSubmissions')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    {t('columns.shortlist')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('columns.company')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('columns.totalFeeAmount')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('columns.totalDiscount')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('columns.totalNetAmount')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('columns.totalEstimateManday')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('columns.submittedAt')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('columns.status')}
                  </th>
                  <th className="px-4 py-3 w-10" aria-label={t('columns.detail')} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companyQuotations.map(cq => {
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
                  return (
                    <tr
                      key={cq.id}
                      className={clsx(
                        'transition-colors',
                        cq.isShortlisted ? 'bg-indigo-50' : 'hover:bg-gray-50',
                      )}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggle(cq)}
                          disabled={isPending}
                          className={clsx(
                            'size-6 rounded border-2 flex items-center justify-center transition-colors',
                            cq.isShortlisted
                              ? 'bg-indigo-500 border-indigo-500'
                              : 'border-gray-300 hover:border-indigo-400',
                            isPending && 'opacity-50 cursor-not-allowed',
                          )}
                          aria-label={
                            cq.isShortlisted
                              ? t('aria.removeFromShortlist')
                              : t('aria.addToShortlist')
                          }
                        >
                          {cq.isShortlisted && (
                            <Icon name="check" style="solid" className="size-3.5 text-white" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {cq.companyName?.trim() || '—'}
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
                              aria-label={t('aria.viewDetail', { company: cq.companyName })}
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
              </tbody>
            </table>
          </div>
        )}

        {companyQuotations.length > 0 && (
          <div className="px-4 py-2 bg-purple-50 border-t border-purple-100">
            <p className="text-xs text-purple-700 flex items-center gap-1">
              <Icon name="circle-info" style="solid" className="size-3.5 shrink-0" />
              {shortlistedCount === 0
                ? t('shortlist.hint0')
                : shortlistedCount === 1
                  ? t('shortlist.hint1')
                  : t('shortlist.hintMultiple')}
            </p>
          </div>
        )}
      </div>

      <SendToRmModal
        isOpen={isSendToRmOpen}
        onClose={closeSendToRm}
        quotationId={quotationId}
        shortlistedCount={shortlistedCount}
      />

      <ConfirmDialog
        isOpen={isSelectWinnerConfirmOpen}
        onClose={closeSelectWinnerConfirm}
        onConfirm={handleConfirmSelectAsWinner}
        title={t('buttons.selectAsWinner')}
        message={t('selectWinner.body', { company: selectWinnerTargetName })}
        confirmText={t('buttons.selectAsWinner')}
        variant="primary"
        isLoading={isPickingWinner}
      />

      {/* Right-side drawer for company quotation detail. */}
      <SlideOverPanel
        isOpen={!!drawerCompanyQuotationId}
        onClose={() => setDrawerCompanyQuotationId(null)}
        title={t('page.extQuotationTitle')}
        subtitle={drawerCompany?.companyName ?? undefined}
        width="2xl"
      >
        {drawerCompanyQuotationId && (
          <AdminCompanyQuotationDetailContent
            quotationRequestId={quotationId}
            companyQuotationId={drawerCompanyQuotationId}
            mode="drawer"
            onClose={() => setDrawerCompanyQuotationId(null)}
          />
        )}
      </SlideOverPanel>
    </>
  );
};

export default AdminShortlistPanel;
