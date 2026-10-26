import { useTranslation } from 'react-i18next';
import type { LineItemStatus } from '../types/followup';

interface LineItemStatusBadgeProps {
  status: LineItemStatus;
}

const STATUS_CLASS: Record<LineItemStatus, string> = {
  Pending:
    'bg-(--palette-warn-wash) text-(--palette-warn) border border-amber-200 dark:border-amber-500/30',
  Uploaded:
    'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30',
  Declined: 'bg-(--palette-req-wash) text-(--palette-req) border border-(--palette-req-line)',
  Cancelled: 'bg-(--palette-surface-2) text-(--palette-gray-500) border border-(--palette-line)',
};

export function LineItemStatusBadge({ status }: LineItemStatusBadgeProps) {
  const { t } = useTranslation('documentFollowup');
  const className = STATUS_CLASS[status] ?? STATUS_CLASS.Pending;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
