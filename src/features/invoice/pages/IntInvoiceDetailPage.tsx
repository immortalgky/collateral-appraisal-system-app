import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { formatLocaleDate, formatLocaleDateTime } from '@/shared/utils/dateUtils';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceItemsTable from '../components/InvoiceItemsTable';
import { useGetInvoiceById, useApproveInvoice } from '../api/invoice';
import type { ApproveInvoicePayload } from '../types/invoice';

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

const PAYMENT_METHODS = ['Cash', 'Transfer', 'Cheque'];

const IntInvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const { data: invoice, isLoading, isError, error } = useGetInvoiceById(id);
  const { mutate: approveInvoice, isPending: isApproving } = useApproveInvoice();

  const isApproveFormValid = paymentDate.length > 0;

  const handleApprove = () => {
    if (!id || !isApproveFormValid) return;
    const payload: ApproveInvoicePayload = {
      ...(paymentMethod && { paymentMethod }),
      ...(paymentReference && { paymentReference }),
      paymentDate,
    };
    approveInvoice(
      { id, payload },
      { onSuccess: () => navigate('/admin/invoices') },
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
        <p className="text-gray-600">Failed to load invoice</p>
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
                {invoice.invoiceNumber ?? 'Invoice'}
              </h3>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            {invoice.companyName && (
              <p className="text-xs text-gray-500 mt-0.5">{invoice.companyName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Total Amount */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
          Total Amount
        </p>
        <p className="text-3xl font-bold text-gray-900 tabular-nums">
          {formatCurrency(invoice.totalAmount)}
        </p>
        {invoice.submittedAt && (
          <p className="text-xs text-gray-400 mt-1">
            Submitted: {formatLocaleDateTime(invoice.submittedAt, i18n.language)}
          </p>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Line Items ({invoice.items.length})
        </h4>
        <InvoiceItemsTable items={invoice.items} />
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Approve form — Submitted only */}
      {invoice.status === 'Submitted' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Icon style="solid" name="circle-check" className="size-4 text-emerald-500" />
            Approve Invoice
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white hover:border-gray-300"
              >
                <option value="">Select method</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Payment Reference
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                placeholder="e.g. TXN-001234"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none hover:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none hover:border-gray-300"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {!isApproveFormValid && (
              <p className="text-xs text-amber-600">Payment date is required</p>
            )}
            <Button
              size="sm"
              onClick={handleApprove}
              isLoading={isApproving}
              disabled={isApproving || !isApproveFormValid}
            >
              <Icon style="solid" name="circle-check" className="size-3.5 mr-1.5" />
              APPROVE
            </Button>
          </div>
        </div>
      )}

      {/* Approved — read-only payment details */}
      {invoice.status === 'Approved' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Icon style="solid" name="circle-check" className="size-4 text-emerald-500" />
            Payment Details
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Payment Method</p>
              <p className="font-medium text-gray-900">{invoice.paymentMethod ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Reference</p>
              <p className="font-medium text-gray-900">{invoice.paymentReference ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Date</p>
              <p className="font-medium text-gray-900">
                {formatLocaleDate(invoice.paymentDate, i18n.language)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Approved By</p>
              <p className="font-medium text-gray-900">{invoice.approvedBy ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Approved At</p>
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
