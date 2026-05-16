import { useTranslation } from 'react-i18next';
import type { InvoiceStatus } from '../types/invoice';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus | string;
  /**
   * When 'internal' and status === 'Sent', the badge renders with the
   * "Pending" label per the FSD internal-view labeling convention.
   * The on-wire status value is unchanged.
   */
  viewContext?: 'external' | 'internal';
}

const badgeColor: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Sent: 'bg-blue-50 text-blue-700',
  Paid: 'bg-emerald-50 text-emerald-700',
};

const dotColor: Record<string, string> = {
  Pending: 'bg-amber-500',
  Sent: 'bg-blue-500',
  Paid: 'bg-emerald-500',
};

const InvoiceStatusBadge = ({ status, viewContext = 'external' }: InvoiceStatusBadgeProps) => {
  const { t } = useTranslation('invoice');

  // Internal view labels 'Sent' as 'Pending' (FSD §2.6.2)
  const displayKey =
    viewContext === 'internal' && status === 'Sent' ? 'Pending' : status;

  const color = badgeColor[status] ?? 'bg-gray-100 text-gray-600';
  const dot = dotColor[status] ?? 'bg-gray-400';

  const label = t(`status.${displayKey}`, { defaultValue: displayKey });

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${color}`}
    >
      <span className={`size-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
};

export default InvoiceStatusBadge;
