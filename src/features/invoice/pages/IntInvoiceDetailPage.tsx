import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import { formatLocaleDate, formatLocaleDateTime } from '@/shared/utils/dateUtils';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceItemsTable from '../components/InvoiceItemsTable';
import MarkPaidLayout from '../components/MarkPaidLayout';
import { useGetInvoiceById, useMarkInvoicePaid } from '../api/invoice';
import toast from 'react-hot-toast';

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

const IntInvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('invoice');

  const { data: invoice, isLoading, isError, error } = useGetInvoiceById(id);
  const { mutate: markPaid, isPending: isMarking } = useMarkInvoicePaid();

  useBreadcrumb(invoice?.invoiceNumber ?? t('detail.invoice'));

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

  // Sent invoices use the shared Mark-Paid layout (top strip + collapsible body
  // + sticky action bar), the same layout the bulk-payment screen uses. Single-invoice
  // is just a 1-element array.
  if (invoice.status === 'Sent') {
    return (
      <MarkPaidLayout
        invoices={[invoice]}
        isSubmitting={isMarking}
        onCancel={() => navigate('/admin/invoices')}
        onSubmit={({ paymentOrderNo, paidDate }) =>
          markPaid(
            { id: invoice.id, payload: { paymentOrderNo, paidDate } },
            {
              onSuccess: () => {
                toast.success(t('internal.paidSuccess'));
                navigate('/admin/invoices');
              },
              onError: () => toast.error(t('errors.markPaidFailed')),
            },
          )
        }
      />
    );
  }

  // Pending / Paid: read-only view.
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
              {t('detail.totalAmount')}
            </p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(invoice.totalAmount)}
            </p>
            {invoice.submittedAt && (
              <p className="text-xs text-gray-400 mt-1">
                {t('detail.submittedAt')}:{' '}
                {formatLocaleDateTime(invoice.submittedAt, i18n.language)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <InvoiceStatusBadge status={invoice.status} viewContext="internal" />
            {invoice.companyName && (
              <p className="text-xs text-gray-500">{invoice.companyName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bank account info */}
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

      {/* Line Items */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          {t('detail.lineItems')} ({invoice.items.length})
        </h4>
        <InvoiceItemsTable items={invoice.items} showCostCenter hideLastPayment />
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
