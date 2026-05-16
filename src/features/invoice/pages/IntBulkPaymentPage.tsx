import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import axios from '@/shared/api/axiosInstance';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { DateInput } from '@/shared/components/inputs';
import InvoiceItemsTable from '../components/InvoiceItemsTable';
import { invoiceKeys, useBulkMarkInvoicesPaid } from '../api/invoice';
import type { InvoiceDetail, InvoiceListItem } from '../types/invoice';
import toast from 'react-hot-toast';

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

interface LocationState {
  invoices?: InvoiceListItem[];
}

const IntBulkPaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('invoice');
  const state = (location.state ?? {}) as LocationState;
  const invoices = state.invoices ?? [];

  // Page reached via direct URL (no state) — bounce back to the list.
  useEffect(() => {
    if (invoices.length === 0) navigate('/admin/invoices', { replace: true });
  }, [invoices.length, navigate]);

  // Fetch each invoice's detail (including line items) in parallel.
  const detailQueries = useQueries({
    queries: invoices.map(inv => ({
      queryKey: invoiceKeys.detail(inv.id),
      queryFn: async (): Promise<InvoiceDetail> => {
        const { data } = await axios.get<InvoiceDetail>(`/invoices/${inv.id}`);
        return data;
      },
      staleTime: 10_000,
    })),
  });

  // Bank info: all selected invoices share a company, so use the first available.
  const firstDetail = detailQueries.find(q => q.data)?.data ?? null;
  const bankAccountNo = firstDetail?.bankAccountNo ?? null;
  const bankAccountName = firstDetail?.bankAccountName ?? null;
  const isLoadingAny = detailQueries.some(q => q.isLoading);

  const [paymentOrderNo, setPaymentOrderNo] = useState('');
  const [paidDate, setPaidDate] = useState<string | null>(null);

  const { mutate: bulkMarkPaid, isPending } = useBulkMarkInvoicesPaid();

  const isValid =
    invoices.length > 0 &&
    paymentOrderNo.trim().length > 0 &&
    paymentOrderNo.trim().length <= 10 &&
    paidDate != null;

  const grandTotal = invoices.reduce((s, inv) => s + inv.totalAmount, 0);
  const grandItemCount = invoices.reduce((s, inv) => s + inv.itemCount, 0);
  const companyName = invoices[0]?.companyName ?? '—';

  const handleSubmit = () => {
    if (!isValid || !paidDate) return;
    bulkMarkPaid(
      {
        invoiceIds: invoices.map(i => i.id),
        paymentOrderNo: paymentOrderNo.trim(),
        paidDate: paidDate.slice(0, 10),
      },
      {
        onSuccess: () => {
          toast.success(t('internal.bulkSuccess'));
          navigate('/admin/invoices');
        },
        onError: () => {
          toast.error(t('errors.bulkFailed'));
        },
      },
    );
  };

  if (invoices.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/invoices')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon style="solid" name="chevron-left" className="size-4" />
          </button>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {t('internal.markPaidTitle')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {invoices.length} {t('internal.selected')} · {companyName}
            </p>
          </div>
        </div>
      </div>

      {/* Mark Paid form — pinned at the top so it's the first interaction */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon style="solid" name="circle-check" className="size-4 text-emerald-500" />
          {t('internal.markPaidTitle')}
        </h4>

        {/* Bank account info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">{t('internal.accountNo')}</p>
            <p className="font-medium text-gray-900">{bankAccountNo ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('internal.accountName')}</p>
            <p className="font-medium text-gray-900">{bankAccountName ?? '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('internal.paymentOrderNo')}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={paymentOrderNo}
              onChange={e => setPaymentOrderNo(e.target.value)}
              maxLength={10}
              placeholder="e.g. PO-000001"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none hover:border-gray-300"
            />
          </div>
          <div>
            <DateInput
              label={t('internal.paidDate')}
              required
              value={paidDate}
              onChange={setPaidDate}
              placeholder="dd/mm/yyyy"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/invoices')}
            disabled={isPending}
          >
            {t('maintenance.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            isLoading={isPending}
            disabled={isPending || !isValid}
          >
            <Icon style="solid" name="circle-check" className="size-3.5 mr-1.5" />
            {t('internal.update')}
          </Button>
        </div>
      </div>

      {/* Grand total summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {t('list.grandTotal')}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {invoices.length} {t('internal.selected')} · {grandItemCount}{' '}
              {t('list.col.totalItems')}
            </p>
          </div>
          <p className="text-2xl font-bold text-primary tabular-nums">
            {formatCurrency(grandTotal)}
          </p>
        </div>
      </div>

      {/* Per-invoice cards with full line items */}
      {isLoadingAny && (
        <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
          <Icon style="solid" name="spinner" className="size-4 animate-spin mr-2" />
          {t('draft.saving').replace('...', '')}
        </div>
      )}

      {detailQueries.map((q, idx) => {
        const inv = invoices[idx];
        const detail = q.data;
        return (
          <div
            key={inv.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* Per-invoice header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-semibold text-primary truncate">
                  {inv.invoiceNumber ?? '—'}
                </span>
                <span className="text-xs text-gray-400">
                  {inv.itemCount} {t('list.col.totalItems')}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                {formatCurrency(inv.totalAmount)}
              </span>
            </div>

            {/* Line items */}
            <div className="p-4">
              {q.isLoading ? (
                <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
                  <Icon style="solid" name="spinner" className="size-4 animate-spin mr-2" />
                </div>
              ) : detail ? (
                <InvoiceItemsTable items={detail.items} />
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  {t('errors.loadFailed')}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default IntBulkPaymentPage;
