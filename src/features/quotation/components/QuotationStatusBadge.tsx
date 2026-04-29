import clsx from 'clsx';
import type { QuotationStatus } from '@/features/appraisal/types/administration';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  Draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  Sent: { label: 'Sent — Awaiting Bids', className: 'bg-blue-100 text-blue-700' },
  UnderAdminReview: { label: 'Under Admin Review', className: 'bg-amber-100 text-amber-700' },
  PendingRmSelection: { label: 'Pending RM Selection', className: 'bg-purple-100 text-purple-700' },
  WinnerTentative: { label: 'Winner Tentative', className: 'bg-indigo-100 text-indigo-700' },
  Negotiating: { label: 'Negotiating', className: 'bg-orange-100 text-orange-700' },
  Finalized: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  Cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  // Legacy / company-level statuses
  Submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  Shortlisted: { label: 'Shortlisted', className: 'bg-indigo-100 text-indigo-700' },
  Tentative: { label: 'Tentative Winner', className: 'bg-amber-100 text-amber-700' },
  Accepted: { label: 'Awarded', className: 'bg-green-100 text-green-700' },
  Rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  Withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-500' },
  UnderReview: { label: 'Under Review', className: 'bg-amber-100 text-amber-700' },
  Declined: { label: 'Declined', className: 'bg-red-100 text-red-700' },
};

interface QuotationStatusBadgeProps {
  status: string;
  className?: string;
}

const QuotationStatusBadge = ({ status, className }: QuotationStatusBadgeProps) => {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
};

export default QuotationStatusBadge;

/** Utility used in non-JSX contexts */
export function getStatusLabel(status: QuotationStatus | string): string {
  return STATUS_CONFIG[status]?.label ?? status;
}
