import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const STATUS_CLASS: Record<string, string> = {
  Pending:
    'bg-amber-100 dark:bg-amber-500/20 text-(--palette-warn) border border-amber-200 dark:border-amber-500/30',
  Draft:
    'bg-amber-100 dark:bg-amber-500/20 text-(--palette-warn) border border-amber-200 dark:border-amber-500/30',
  PendingCheckerReview:
    'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30',
  Submitted:
    'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30',
  UnderReview:
    'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30',
  Tentative: 'bg-(--palette-surface-3) text-(--palette-gray-600) border border-(--palette-line)',
  Negotiating:
    'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
  Accepted:
    'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30',
  Won: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30',
  Rejected: 'bg-(--palette-surface-3) text-(--palette-gray-600) border border-(--palette-line)',
  Lost: 'bg-(--palette-surface-3) text-(--palette-gray-600) border border-(--palette-line)',
  Withdrawn: 'bg-(--palette-surface-3) text-(--palette-gray-600) border border-(--palette-line)',
  Declined:
    'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30',
  Expired: 'bg-(--palette-surface-3) text-(--palette-gray-600) border border-(--palette-line)',
  Cancelled:
    'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30',
};

interface MyInvitationStatusBadgeProps {
  status: string;
  className?: string;
}

const MyInvitationStatusBadge = ({ status, className }: MyInvitationStatusBadgeProps) => {
  const { t } = useTranslation('quotation');
  const label = t(`vendorStatus.${status}` as `vendorStatus.${string}`, { defaultValue: status });
  const cls =
    STATUS_CLASS[status] ??
    'bg-(--palette-surface-3) text-(--palette-gray-600) border border-(--palette-line)';

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
