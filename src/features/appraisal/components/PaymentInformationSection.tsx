import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { VAT_PERCENTAGE } from '../types/appointmentAndFee';
import type { AppraisalFeeDtoType, AppraisalFeeItemDtoType } from '@shared/schemas/v1';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import AddPaymentModal from './AddPaymentModal';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { getFeePaymentStatusDisplay } from '../utils/feePaymentStatus';

interface PaymentInformationSectionProps {
  items: AppraisalFeeItemDtoType[];
  fee?: AppraisalFeeDtoType | null;
  onRecordPayment?: (data: {
    paymentAmount: number;
    paymentDate: string;
    paymentMethod?: string;
    paymentReference?: string;
    remarks?: string;
  }) => void;
  onUpdatePayment?: (
    paymentId: string,
    data: { paymentAmount: number; paymentDate: string },
  ) => void;
  onRemovePayment?: (paymentId: string) => void;
  isPaymentPending?: boolean;
  requestedAt?: string | null;
  isBankAbsorb?: boolean;
}

/**
 * Payment Information section with status, payment details, and history
 */
export default function PaymentInformationSection({
  items,
  fee,
  onRecordPayment,
  onUpdatePayment,
  onRemovePayment,
  isPaymentPending,
  requestedAt,
  isBankAbsorb = false,
}: PaymentInformationSectionProps) {
  const { t } = useTranslation('appraisal');
  const readOnly = usePageReadOnly();
  const [isPaymentHistoryExpanded, setIsPaymentHistoryExpanded] = useState(true);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const bankAbsorbAmount = fee?.bankAbsorbAmount ?? 0;
  const payments = fee?.paymentHistory ?? [];

  // Calculate totals from items
  const subtotal = items.reduce((sum, item) => sum + (item.feeAmount || 0), 0);
  const vatRate = fee?.vatRate ?? VAT_PERCENTAGE;
  const vat = subtotal * (vatRate / 100);
  const totalFee = subtotal + vat;
  const totalPaid = fee?.totalPaidAmount ?? 0;
  const remaining = fee?.outstandingAmount ?? totalFee - totalPaid - bankAbsorbAmount;

  const effectiveBankAbsorbAmount = isBankAbsorb ? totalFee : bankAbsorbAmount;
  const effectiveRemaining = isBankAbsorb ? 0 : remaining;
  const paymentPercentage = totalFee > 0 ? Math.min((totalPaid / totalFee) * 100, 100) : 0;

  // Determine payment status
  const getPaymentStatus = () => {
    if (fee) {
      return getFeePaymentStatusDisplay(fee.paymentStatus);
    }
    if (totalFee <= 0) return { label: 'No Fee', color: 'gray' as const };
    if (remaining <= 0) return { label: 'Paid', color: 'success' as const };
    if (totalPaid > 0) return { label: 'Partial', color: 'warning' as const };
    return { label: 'Not Paid', color: 'danger' as const };
  };

  const paymentStatus = isBankAbsorb
    ? { label: 'Paid', color: 'success' as const }
    : getPaymentStatus();

  // Only show 100% on the progress bar when the fee is fully paid (status === 'paid').
  // PendingInvoice means the customer portion is settled but the external invoice is outstanding —
  // show the real customer-paid percentage rather than forcing the bar to full.
  const effectivePaymentPercentage =
    paymentStatus.color === 'success' && paymentStatus.label === 'Paid' ? 100 : paymentPercentage;

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const editingPayment = editingPaymentId
    ? (payments.find(p => p.id === editingPaymentId) ?? null)
    : null;

  const handlePaymentSubmit = (data: { paymentDate: string; amount: number }) => {
    if (editingPaymentId && onUpdatePayment) {
      onUpdatePayment(editingPaymentId, {
        paymentAmount: data.amount,
        paymentDate: data.paymentDate,
      });
      setEditingPaymentId(null);
    } else if (onRecordPayment) {
      onRecordPayment({
        paymentAmount: data.amount,
        paymentDate: data.paymentDate,
      });
      setIsAddPaymentModalOpen(false);
    }
  };

  const handleDeletePayment = () => {
    if (deletingPaymentId && onRemovePayment) {
      onRemovePayment(deletingPaymentId);
    }
    setDeletingPaymentId(null);
  };

  const getDeletingPaymentDescription = () => {
    if (!deletingPaymentId) return '';
    const payment = payments.find(p => p.id === deletingPaymentId);
    if (!payment) return '';
    return `payment of ${formatCurrency(payment.paymentAmount)} on ${formatDate(payment.paymentDate)}`;
  };

  // Get progress bar color based on percentage
  const getProgressBarColor = () => {
    if (effectivePaymentPercentage >= 100) return 'bg-success';
    if (effectivePaymentPercentage >= 50) return 'bg-warning';
    return 'bg-gray-300';
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
          <Icon name="credit-card" style="solid" className="size-4 text-white" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">{t('payment.sectionTitle')}</h3>
      </div>

      {/* Total Amount Card with Progress */}
      <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50/50 to-white">
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-gray-800">{formatCurrency(totalFee)}</span>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded border ${
              paymentStatus.color === 'success'
                ? 'bg-success/10 border-success text-success'
                : paymentStatus.color === 'warning'
                  ? 'bg-warning/10 border-warning text-warning'
                  : paymentStatus.color === 'danger'
                    ? 'bg-danger/10 border-danger text-danger'
                    : paymentStatus.color === 'info'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-gray-100 border-gray-200 text-gray-600'
            }`}
          >
            <Icon
              name={
                paymentStatus.color === 'success'
                  ? 'circle-check'
                  : paymentStatus.color === 'warning'
                    ? 'clock'
                    : paymentStatus.color === 'info'
                      ? 'file-invoice'
                      : 'circle-xmark'
              }
              style="solid"
              className="w-5 h-5"
            />
            <span className="text-sm font-medium">{paymentStatus.label}</span>
          </div>
        </div>

        {/* Payment Progress Bar */}
        {totalFee > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('payment.paidPercent', { n: Math.round(effectivePaymentPercentage) })}</span>
              <span>
                {isBankAbsorb ? formatCurrency(totalFee) : formatCurrency(totalPaid)} /
                {formatCurrency(totalFee)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                style={{ width: `${effectivePaymentPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Payment Details Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Payment Date */}
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <span className="text-xs font-medium text-gray-500">{t('payment.paymentDate')}</span>
            <span className="text-sm text-gray-800">
              {payments.length > 0
                ? formatDate(
                    [...payments].sort((a, b) =>
                      (b.paymentDate ?? '').localeCompare(a.paymentDate ?? ''),
                    )[0].paymentDate ?? '',
                  )
                : '-'}
            </span>
          </div>

          {/* Paid Amount with Expandable Payment History */}
          <div className="border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{t('payment.paidAmount')}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800">{formatCurrency(totalPaid)}</span>
                {payments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsPaymentHistoryExpanded(!isPaymentHistoryExpanded)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-expanded={isPaymentHistoryExpanded}
                    aria-label={
                      isPaymentHistoryExpanded
                        ? t('payment.aria.collapseHistory')
                        : t('payment.aria.expandHistory')
                    }
                  >
                    <Icon
                      name={isPaymentHistoryExpanded ? 'angle-up' : 'angle-down'}
                      style="solid"
                      className="w-4 h-4"
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Payment History Table (Expandable) */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isPaymentHistoryExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
              }`}
            >
              {payments.length === 0 ? (
                <div className="bg-blue-50/50 rounded-lg px-4 py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                    <Icon name="credit-card" style="regular" className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-sm text-gray-600">{t('payment.noPayments')}</p>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_1fr_60px] gap-2 pb-2 border-b border-gray-200">
                    <span className="text-xs text-gray-500">
                      {t('payment.columns.paymentDate')}
                    </span>
                    <span className="text-xs text-gray-500 text-right">
                      {t('payment.columns.amount')}
                    </span>
                    <span />
                  </div>

                  {/* Payment Rows */}
                  {payments.map(payment => {
                    const isBankAbsorbRow = payment.source?.toLowerCase() === 'bankabsorb';
                    return (
                      <div
                        key={payment.id}
                        className="grid grid-cols-[1fr_1fr_60px] gap-2 py-2 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors animate-fadeIn"
                      >
                        <span className="text-sm text-gray-600">
                          {formatDate(payment.paymentDate)}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm text-gray-600">
                            {formatCurrency(payment.paymentAmount)}
                          </span>
                          {isBankAbsorbRow && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-600 leading-none">
                              {t('payment.bankAbsorbed')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!readOnly && !isBankAbsorbRow && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingPaymentId(payment.id)}
                                className="text-gray-400 hover:text-secondary transition-colors p-1 disabled:opacity-50 disabled:pointer-events-none"
                                aria-label={t('payment.aria.editPayment', {
                                  amount: formatCurrency(payment.paymentAmount),
                                })}
                                title={t('payment.aria.editPaymentTitle')}
                                disabled={isPaymentPending}
                              >
                                <Icon name="pen" style="regular" className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingPaymentId(payment.id)}
                                className="text-gray-400 hover:text-danger transition-colors p-1 disabled:opacity-50 disabled:pointer-events-none"
                                aria-label={t('payment.aria.deletePayment', {
                                  amount: formatCurrency(payment.paymentAmount),
                                })}
                                title={t('payment.aria.deletePaymentTitle')}
                                disabled={isPaymentPending}
                              >
                                <Icon name="trash" style="regular" className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Add Payment Button */}
              {!readOnly && !isBankAbsorb && (
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(true)}
                  disabled={isPaymentPending}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 mt-3 border-2 border-dashed rounded-lg transition-colors ${isPaymentPending ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400'}`}
                >
                  <Icon name="circle-plus" style="solid" className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('payment.addPayment')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bank Absorb Amount */}
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
              {t('payment.bankAbsorbAmount')}
              <span className="text-gray-400 cursor-help" title={t('payment.bankAbsorbTooltip')}>
                <Icon name="circle-info" style="regular" className="w-3.5 h-3.5" />
              </span>
            </span>
            <span className="text-sm text-gray-800">
              {formatCurrency(effectiveBankAbsorbAmount)}
            </span>
          </div>

          {/* Customer Payable (only shown when API data is available) */}
          {fee && (
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <span className="text-xs font-medium text-gray-500">
                {t('payment.customerPayable')}
              </span>
              <span className="text-sm text-gray-800">
                {formatCurrency(fee.customerPayableAmount)}
              </span>
            </div>
          )}

          {/* Remaining */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">{t('payment.remaining')}</span>
            <span
              className={`text-sm font-medium ${effectiveRemaining > 0 ? 'text-danger' : 'text-success'}`}
            >
              {formatCurrency(Math.max(0, effectiveRemaining))}
            </span>
          </div>
        </div>
      </div>

      {/* Add / Edit Payment Modal */}
      <AddPaymentModal
        readOnly={readOnly}
        isOpen={isAddPaymentModalOpen || editingPaymentId !== null}
        onClose={() => {
          setIsAddPaymentModalOpen(false);
          setEditingPaymentId(null);
        }}
        onSubmit={handlePaymentSubmit}
        defaultValues={
          editingPayment
            ? { paymentDate: editingPayment.paymentDate, amount: editingPayment.paymentAmount }
            : null
        }
        isEditing={editingPaymentId !== null}
        maxAmount={
          editingPayment ? effectiveRemaining + editingPayment.paymentAmount : effectiveRemaining
        }
        requestedAt={requestedAt}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingPaymentId !== null}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={handleDeletePayment}
        title={t('payment.deletePaymentDialog.title')}
        message={t('payment.deletePaymentDialog.message', {
          description: getDeletingPaymentDescription(),
        })}
        confirmText={t('payment.deletePaymentDialog.confirm')}
        variant="danger"
      />
    </div>
  );
}
