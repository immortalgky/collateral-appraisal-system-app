import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Input from '@/shared/components/Input';
import { DateInput } from '@/shared/components/inputs';
import InvoiceItemsTable from './InvoiceItemsTable';
import type { InvoiceDetail } from '../types/invoice';

interface MarkPaidLayoutProps {
  invoices: InvoiceDetail[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: { paymentOrderNo: string; paidDate: string }) => void;
}

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

/**
 * Shared payment layout used by both single-invoice and bulk Mark-as-Paid flows.
 * Top strip: Total + inline Account/PO/Paid-Date fields.
 * Body: collapsible per-invoice sections with line items.
 * Footer: sticky Cancel / Update bar.
 */
const MarkPaidLayout = ({ invoices, isSubmitting, onCancel, onSubmit }: MarkPaidLayoutProps) => {
  const { t } = useTranslation('invoice');

  const [paymentOrderNo, setPaymentOrderNo] = useState('');
  const [paidDate, setPaidDate] = useState<string | null>(null);

  // Track collapsed state per invoice id. Default expanded.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  const firstInvoice = invoices[0];
  const bankAccountNo = firstInvoice?.bankAccountNo ?? '';
  const bankAccountName = firstInvoice?.bankAccountName ?? '';

  const grandTotal = useMemo(
    () => invoices.reduce((s, inv) => s + inv.totalAmount, 0),
    [invoices],
  );

  const isValid =
    invoices.length > 0 &&
    paymentOrderNo.trim().length > 0 &&
    paymentOrderNo.trim().length <= 10 &&
    paidDate != null;

  const handleSubmit = () => {
    if (!isValid || !paidDate) return;
    onSubmit({ paymentOrderNo: paymentOrderNo.trim(), paidDate: paidDate.slice(0, 10) });
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Top strip: Total + inline account/PO/paid-date */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">
          {t('internal.markPaidTitle')}
        </p>
        <div className="flex flex-wrap items-end gap-6">
          <div className="shrink-0">
            <p className="text-xs text-gray-500 mb-1">{t('detail.totalAmount')}</p>
            <p className="text-3xl font-bold text-primary tabular-nums whitespace-nowrap">
              {formatCurrency(grandTotal)}
            </p>
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label={t('internal.accountNo')}
              value={bankAccountNo}
              disabled
              readOnly
            />
            <Input
              label={t('internal.accountName')}
              value={bankAccountName}
              disabled
              readOnly
            />
            <Input
              label={t('internal.paymentOrderNo')}
              required
              value={paymentOrderNo}
              onChange={e => setPaymentOrderNo(e.target.value)}
              maxLength={10}
              placeholder="e.g. PO-000001"
            />
            <DateInput
              label={t('internal.paidDate')}
              required
              value={paidDate}
              onChange={setPaidDate}
              placeholder="dd/mm/yyyy"
            />
          </div>
        </div>
      </div>

      {/* Per-invoice collapsible sections */}
      {invoices.map(inv => {
        const isCollapsed = collapsed[inv.id] ?? false;
        return (
          <div
            key={inv.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(inv.id)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between gap-3 border-b border-gray-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-semibold text-primary truncate">
                  {inv.invoiceNumber ?? '—'}
                </span>
                <span className="text-xs text-gray-500">
                  ({inv.items.length} {t('list.col.totalItems')})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                  {formatCurrency(inv.totalAmount)}
                </span>
                <Icon
                  style="solid"
                  name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                  className="size-3.5 text-gray-400"
                />
              </div>
            </button>
            {!isCollapsed && (
              <div className="p-4">
                <InvoiceItemsTable
                  items={inv.items}
                  hidePaymentColumns
                  hideLastPayment
                  showCostCenter
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between gap-3 z-10">
        <span className="text-xs text-gray-500">
          {invoices.length} {t('internal.selected')} · {formatCurrency(grandTotal)}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            {t('maintenance.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting || !isValid}
          >
            <Icon style="solid" name="circle-check" className="size-3.5 mr-1.5" />
            {t('internal.update')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MarkPaidLayout;
