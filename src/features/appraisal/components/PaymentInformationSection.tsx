import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import Icon from '@shared/components/Icon';
import { VAT_PERCENTAGE } from '../types/appointmentAndFee';
import type { AppraisalFeeDtoType, AppraisalFeeItemDtoType } from '@shared/schemas/v1';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import AddPaymentModal from './AddPaymentModal';

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
}: PaymentInformationSectionProps) {
  const [isPaymentHistoryExpanded, setIsPaymentHistoryExpanded] = useState(true);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [inspectionFee, setInspectionFee] = useState<number>(fee?.inspectionFeeAmount ?? 0);

  const bankAbsorbAmount = fee?.bankAbsorbAmount ?? 0;
  const payments = fee?.paymentHistory ?? [];

  // Calculate totals from items
  const subtotal = items.reduce((sum, item) => sum + (item.feeAmount || 0), 0);
  const vatRate = fee?.vatRate ?? VAT_PERCENTAGE;
  const vat = subtotal * (vatRate / 100);
  const totalFee = subtotal + vat;
  const totalPaid = fee?.totalPaidAmount ?? 0;
  const remaining = fee?.outstandingAmount ?? totalFee - totalPaid - bankAbsorbAmount;

  // Calculate payment percentage for progress bar
  const paymentPercentage = totalFee > 0 ? Math.min((totalPaid / totalFee) * 100, 100) : 0;

  // Determine payment status
  const getPaymentStatus = () => {
    if (fee) {
      switch (fee.paymentStatus.toLowerCase()) {
        case 'paid':
          return { label: 'Paid', color: 'success' };
        case 'partial':
        case 'partiallypaid':
          return { label: 'Partial', color: 'warning' };
        case 'notpaid':
        case 'unpaid':
          return { label: 'Not Paid', color: 'danger' };
        default:
          return { label: fee.paymentStatus, color: 'gray' };
      }
    }
    if (totalFee <= 0) return { label: 'No Fee', color: 'gray' };
    if (remaining <= 0) return { label: 'Paid', color: 'success' };
    if (totalPaid > 0) return { label: 'Partial', color: 'warning' };
    return { label: 'Not Paid', color: 'danger' };
  };

  const paymentStatus = getPaymentStatus();

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
    if (paymentPercentage >= 100) return 'bg-success';
    if (paymentPercentage >= 50) return 'bg-warning';
    return 'bg-gray-300';
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
          <Icon name="credit-card" style="solid" className="size-4 text-white" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">Payment Information</h3>
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
                    : 'bg-gray-100 border-gray-200 text-gray-600'
            }`}
          >
            <Icon
              name={
                paymentStatus.color === 'success'
                  ? 'circle-check'
                  : paymentStatus.color === 'warning'
                    ? 'clock'
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
              <span>{Math.round(paymentPercentage)}% paid</span>
              <span>
                {formatCurrency(totalPaid)} / {formatCurrency(totalFee)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                style={{ width: `${paymentPercentage}%` }}
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
            <span className="text-xs font-medium text-gray-500">Payment date</span>
            <span className="text-sm text-gray-800">
              {payments.length > 0 ? formatDate(payments[0].paymentDate) : '-'}
            </span>
          </div>

          {/* Paid Amount with Expandable Payment History */}
          <div className="border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Paid amount</span>
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
                        ? 'Collapse payment history'
                        : 'Expand payment history'
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
                  <p className="text-sm text-gray-600">No payments recorded</p>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_1fr_60px] gap-2 pb-2 border-b border-gray-200">
                    <span className="text-xs text-gray-500">Payment Date</span>
                    <span className="text-xs text-gray-500 text-right">Amount</span>
                    <span />
                  </div>

                  {/* Payment Rows */}
                  {payments.map(payment => (
                    <div
                      key={payment.id}
                      className="grid grid-cols-[1fr_1fr_60px] gap-2 py-2 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors animate-fadeIn"
                    >
                      <span className="text-sm text-gray-600">
                        {formatDate(payment.paymentDate)}
                      </span>
                      <span className="text-sm text-gray-600 text-right">
                        {formatCurrency(payment.paymentAmount)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingPaymentId(payment.id)}
                          className="text-gray-400 hover:text-secondary transition-colors p-1 disabled:opacity-50 disabled:pointer-events-none"
                          aria-label={`Edit payment of ${formatCurrency(payment.paymentAmount)}`}
                          title="Edit payment"
                          disabled={isPaymentPending}
                        >
                          <Icon name="pen" style="regular" className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingPaymentId(payment.id)}
                          className="text-gray-400 hover:text-danger transition-colors p-1 disabled:opacity-50 disabled:pointer-events-none"
                          aria-label={`Delete payment of ${formatCurrency(payment.paymentAmount)}`}
                          title="Delete payment"
                          disabled={isPaymentPending}
                        >
                          <Icon name="trash" style="regular" className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Add Payment Button */}
              <button
                type="button"
                onClick={() => setIsAddPaymentModalOpen(true)}
                disabled={isPaymentPending}
                className={`w-full flex items-center justify-center gap-2 py-2.5 mt-3 border-2 border-dashed rounded-lg transition-colors ${isPaymentPending ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400'}`}
              >
                <Icon name="circle-plus" style="solid" className="w-4 h-4" />
                <span className="text-sm font-medium">Add Payment</span>
              </button>
            </div>
          </div>

          {/* Bank Absorb Amount */}
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
              Bank absorb amount
              <span
                className="text-gray-400 cursor-help"
                title="Amount absorbed by the bank, reducing the customer's payment obligation"
              >
                <Icon name="circle-info" style="regular" className="w-3.5 h-3.5" />
              </span>
            </span>
            <span className="text-sm text-gray-800">{formatCurrency(bankAbsorbAmount)}</span>
          </div>

          {/* Customer Payable (only shown when API data is available) */}
          {fee && (
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <span className="text-xs font-medium text-gray-500">Customer payable</span>
              <span className="text-sm text-gray-800">
                {formatCurrency(fee.customerPayableAmount)}
              </span>
            </div>
          )}

          {/* Remaining */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">Remaining</span>
            <span
              className={`text-sm font-medium ${remaining > 0 ? 'text-danger' : 'text-success'}`}
            >
              {formatCurrency(Math.max(0, remaining))}
            </span>
          </div>
        </div>
      </div>

      {/* Inspection Fee Input */}
      {/*<NumberInput*/}
      {/*  label="Inspection Fee"*/}
      {/*  required*/}
      {/*  decimalPlaces={2}*/}
      {/*  value={fee?.inspectionFeeAmount ?? inspectionFee}*/}
      {/*  onChange={e => {*/}
      {/*    const value = e.target.value ?? 0;*/}
      {/*    setInspectionFee(value);*/}
      {/*  }}*/}
      {/*/>*/}

      {/* Add / Edit Payment Modal */}
      <AddPaymentModal
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
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingPaymentId !== null}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={handleDeletePayment}
        title="Delete Payment"
        message={`Are you sure you want to delete this ${getDeletingPaymentDescription()}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
