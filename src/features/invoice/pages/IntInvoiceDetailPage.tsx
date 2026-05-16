import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { DateInput } from '@/shared/components/inputs';
import { formatLocaleDate, formatLocaleDateTime } from '@/shared/utils/dateUtils';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceItemsTable from '../components/InvoiceItemsTable';
import { useGetInvoiceById, useMarkInvoicePaid } from '../api/invoice';
import type { MarkPaidPayload } from '../types/invoice';
import toast from 'react-hot-toast';

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

const IntInvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('invoice');

  const [paymentOrderNo, setPaymentOrderNo] = useState('');
  const [paidDate, setPaidDate] = useState<string | null>(null);

  const { data: invoice, isLoading, isError, error } = useGetInvoiceById(id);
  const { mutate: markPaid, isPending: isMarking } = useMarkInvoicePaid();

  const isFormValid =
    paymentOrderNo.trim().length > 0 &&
    paymentOrderNo.trim().length <= 10 &&
    paidDate != null;

  const handleMarkPaid = () => {
    if (!id || !isFormValid || !paidDate) return;
    const payload: MarkPaidPayload = {
      paymentOrderNo: paymentOrderNo.trim(),
      paidDate: paidDate.slice(0, 10),
    };
    markPaid(
      { id, payload },
      {
        onSuccess: () => {
          toast.success(t('internal.paidSuccess'));
          navigate('/admin/invoices');
        },
        onError: () => {
          toast.error(t('errors.markPaidFailed'));
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon style="solid" name="spinner" className="size-6 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">{t('errors.loadFailed')}</p>
        <p className="text-sm text-gray-400">{(error as Error)?.message}</p>
      </div>
    );
  }

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
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-gray-900">
                {invoice.invoiceNumber ?? t('detail.invoice')}
              </h3>
              <InvoiceStatusBadge status={invoice.status} viewContext="internal" />
            </div>
            {invoice.companyName && (
              <p className="text-xs text-gray-500 mt-0.5">{invoice.companyName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Mark Paid form — Sent only. Pinned at top + bank info inside the card. */}
      {invoice.status === 'Sent' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Icon style="solid" name="circle-check" className="size-4 text-emerald-500" />
            {t('internal.markPaidTitle')}
          </h4>

          {/* Bank account info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">{t('internal.accountNo')}</p>
              <p className="font-medium text-gray-900">{invoice.bankAccountNo ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('internal.accountName')}</p>
              <p className="font-medium text-gray-900">{invoice.bankAccountName ?? '—'}</p>
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
              size="sm"
              onClick={handleMarkPaid}
              isLoading={isMarking}
              disabled={isMarking || !isFormValid}
            >
              <Icon style="solid" name="circle-check" className="size-3.5 mr-1.5" />
              {t('internal.update')}
            </Button>
          </div>
        </div>
      )}

      {/* Total Amount */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
          {t('detail.totalAmount')}
        </p>
        <p className="text-3xl font-bold text-gray-900 tabular-nums">
          {formatCurrency(invoice.totalAmount)}
        </p>
        {invoice.submittedAt && (
          <p className="text-xs text-gray-400 mt-1">
            {t('detail.submittedAt')}: {formatLocaleDateTime(invoice.submittedAt, i18n.language)}
          </p>
        )}
      </div>

      {/* Bank account info — shown for non-Sent statuses (Sent already has it inline above) */}
      {invoice.status !== 'Sent' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('internal.bankInfo')}</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">{t('internal.accountNo')}</p>
              <p className="font-medium text-gray-900">{invoice.bankAccountNo ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('internal.accountName')}</p>
              <p className="font-medium text-gray-900">{invoice.bankAccountName ?? '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          {t('detail.lineItems')} ({invoice.items.length})
        </h4>
        <InvoiceItemsTable items={invoice.items} />
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('detail.notes')}</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Paid — read-only payment details */}
      {invoice.status === 'Paid' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Icon style="solid" name="circle-check" className="size-4 text-emerald-500" />
            {t('detail.paymentDetails')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">{t('internal.paymentOrderNo')}</p>
              <p className="font-medium text-gray-900">{invoice.paymentOrderNo ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('internal.paidDate')}</p>
              <p className="font-medium text-gray-900">
                {formatLocaleDate(invoice.paidDate, i18n.language)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('detail.approvedBy')}</p>
              <p className="font-medium text-gray-900">{invoice.approvedBy ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('detail.approvedAt')}</p>
              <p className="font-medium text-gray-900">
                {formatLocaleDateTime(invoice.approvedAt, i18n.language)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntInvoiceDetailPage;
