import type { LineItemStatus } from '../types/followup';

interface LineItemStatusBadgeProps {
  status: LineItemStatus;
}

const STATUS_CONFIG: Record<
  LineItemStatus,
  { label: string; className: string }
> = {
  Pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  Uploaded: {
    label: 'Uploaded',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
  Declined: {
    label: 'Declined',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
  Cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-50 text-gray-500 border border-gray-200',
  },
};

export function LineItemStatusBadge({ status }: LineItemStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
