import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { QuotationStatus } from '@/features/appraisal/types/administration';

const STATUS_CLASS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Sent: 'bg-blue-100 text-blue-700',
  UnderAdminReview: 'bg-amber-100 text-amber-700',
  PendingRmSelection: 'bg-purple-100 text-purple-700',
  WinnerTentative: 'bg-indigo-100 text-indigo-700',
  Negotiating: 'bg-orange-100 text-orange-700',
  Finalized: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
  // Legacy / company-level statuses
  Submitted: 'bg-blue-100 text-blue-700',
  Shortlisted: 'bg-indigo-100 text-indigo-700',
  Tentative: 'bg-amber-100 text-amber-700',
  Accepted: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Withdrawn: 'bg-gray-100 text-gray-500',
  UnderReview: 'bg-amber-100 text-amber-700',
  Declined: 'bg-red-100 text-red-700',
  PendingCheckerReview: 'bg-indigo-100 text-indigo-700',
  Pending: 'bg-amber-100 text-amber-700',
};

interface QuotationStatusBadgeProps {
  status: string;
  className?: string;
}

const QuotationStatusBadge = ({ status, className }: QuotationStatusBadgeProps) => {
  const { t } = useTranslation('quotation');
  const label = t(`status.${status}` as `status.${string}`, { defaultValue: status });
  const cls = STATUS_CLASS[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        cls,
        className,
      )}
    >
      {label}
    </span>
  );
};

export default QuotationStatusBadge;

/** Utility used in non-JSX contexts — returns the raw status key; caller translates as needed. */
export function getStatusLabel(status: QuotationStatus | string): string {
  return status;
}
