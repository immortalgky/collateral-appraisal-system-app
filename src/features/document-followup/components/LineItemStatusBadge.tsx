import { useTranslation } from 'react-i18next';
import type { LineItemStatus } from '../types/followup';

interface LineItemStatusBadgeProps {
  status: LineItemStatus;
}

const STATUS_CLASS: Record<LineItemStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Uploaded: 'bg-green-50 text-green-700 border border-green-200',
  Declined: 'bg-red-50 text-red-700 border border-red-200',
  Cancelled: 'bg-gray-50 text-gray-500 border border-gray-200',
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
