import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const STATUS_CLASS: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  Draft: 'bg-amber-100 text-amber-700 border border-amber-200',
  PendingCheckerReview: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  Submitted: 'bg-blue-100 text-blue-700 border border-blue-200',
  UnderReview: 'bg-blue-100 text-blue-700 border border-blue-200',
  Tentative: 'bg-gray-100 text-gray-600 border border-gray-200',
  Negotiating: 'bg-purple-100 text-purple-700 border border-purple-200',
  Accepted: 'bg-green-100 text-green-700 border border-green-200',
  Won: 'bg-green-100 text-green-700 border border-green-200',
  Rejected: 'bg-gray-100 text-gray-600 border border-gray-200',
  Lost: 'bg-gray-100 text-gray-600 border border-gray-200',
  Withdrawn: 'bg-gray-100 text-gray-600 border border-gray-200',
  Declined: 'bg-rose-100 text-rose-700 border border-rose-200',
  Expired: 'bg-gray-100 text-gray-600 border border-gray-200',
  Cancelled: 'bg-rose-100 text-rose-700 border border-rose-200',
};

interface MyInvitationStatusBadgeProps {
  status: string;
  className?: string;
}

const MyInvitationStatusBadge = ({ status, className }: MyInvitationStatusBadgeProps) => {
  const { t } = useTranslation('quotation');
  const label = t(`vendorStatus.${status}` as `vendorStatus.${string}`, { defaultValue: status });
  const cls = STATUS_CLASS[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200';

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

export default MyInvitationStatusBadge;
