import Badge from '@/shared/components/Badge';
import type { MeetingStatus } from '../api/types';

interface MeetingStatusBadgeProps {
  status: MeetingStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<MeetingStatus, { variant: 'info' | 'primary' | 'success' | 'danger'; label: string }> = {
  DRAFT: { variant: 'info', label: 'Draft' },
  SCHEDULED: { variant: 'primary', label: 'Scheduled' },
  ENDED: { variant: 'success', label: 'Ended' },
  CANCELLED: { variant: 'danger', label: 'Cancelled' },
};

const MeetingStatusBadge = ({ status, size = 'sm' }: MeetingStatusBadgeProps) => {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};

export default MeetingStatusBadge;
