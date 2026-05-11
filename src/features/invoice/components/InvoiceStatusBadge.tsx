import type { InvoiceStatus } from '../types/invoice';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus | string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  Draft: { label: 'Draft', color: 'bg-amber-50 text-amber-700' },
  Submitted: { label: 'Submitted', color: 'bg-blue-50 text-blue-700' },
  Approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700' },
};

const statusDotColor: Record<string, string> = {
  Draft: 'bg-amber-500',
  Submitted: 'bg-blue-500',
  Approved: 'bg-emerald-500',
};

const InvoiceStatusBadge = ({ status }: InvoiceStatusBadgeProps) => {
  const config = statusConfig[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' };
  const dotColor = statusDotColor[status] ?? 'bg-gray-400';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}
    >
      <span className={`size-1.5 rounded-full shrink-0 ${dotColor}`} />
      {config.label}
    </span>
  );
};

export default InvoiceStatusBadge;
