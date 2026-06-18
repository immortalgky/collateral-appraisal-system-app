export type FeePaymentStatusColor = 'success' | 'warning' | 'danger' | 'info' | 'gray';

export interface FeePaymentStatusDisplay {
  label: string;
  color: FeePaymentStatusColor;
}

/**
 * Maps a raw fee paymentStatus string from the API to a display label and semantic color.
 * Covers: Paid, Partial/PartiallyPaid, NotPaid/Unpaid, PendingInvoice.
 */
export function getFeePaymentStatusDisplay(status?: string | null): FeePaymentStatusDisplay {
  switch (status?.toLowerCase()) {
    case 'paid':
      return { label: 'Paid', color: 'success' };
    case 'partial':
    case 'partiallypaid':
      return { label: 'Partial', color: 'warning' };
    case 'notpaid':
    case 'unpaid':
      return { label: 'Not Paid', color: 'danger' };
    case 'pendinginvoice':
      return { label: 'Pending Invoice', color: 'info' };
    default:
      return { label: status ?? '', color: 'gray' };
  }
}
