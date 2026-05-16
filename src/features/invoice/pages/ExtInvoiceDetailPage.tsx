import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import { formatLocaleDate, formatLocaleDateTime } from '@/shared/utils/dateUtils';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceItemsTable from '../components/InvoiceItemsTable';
import { useGetInvoiceById } from '../api/invoice';

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

const ExtInvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('invoice');

  const { data: invoice, isLoading, isError, error } = useGetInvoiceById(id);

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
            onClick={() => navigate('/ext/invoices')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon style="solid" name="chevron-left" className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-gray-900">
                {invoice.invoiceNumber ?? t('detail.draftInvoice')}
              </h3>
              <InvoiceStatusBadge status={invoice.status} viewContext="external" />
            </div>
            {invoice.companyName && (
              <p className="text-xs text-gray-500 mt-0.5">{invoice.companyName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Total Amount card */}
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

      {/* Status-specific info */}
      {invoice.status === 'Sent' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg">
          <Icon style="solid" name="clock" className="size-4 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-700">{t('detail.sentInfo')}</p>
        </div>
      )}

      {invoice.status === 'Paid' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Icon style="solid" name="circle-check" className="size-4 text-emerald-500" />
            {t('detail.paymentDetails')}
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
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
          </div>
        </div>
      )}

      {/* Items */}
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
    </div>
  );
};

export default ExtInvoiceDetailPage;
