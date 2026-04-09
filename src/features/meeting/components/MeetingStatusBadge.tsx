import Badge from '@/shared/components/Badge';
import type { MeetingStatus } from '../api/types';

interface MeetingStatusBadgeProps {
  status: MeetingStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const STATUS_VARIANT: Record<MeetingStatus, 'info' | 'primary' | 'success' | 'danger'> = {
  Draft: 'info',
  Scheduled: 'primary',
  Ended: 'success',
  Cancelled: 'danger',
};

const MeetingStatusBadge = ({ status, size = 'sm' }: MeetingStatusBadgeProps) => {
  return (
    <Badge variant={STATUS_VARIANT[status]} size={size}>
      {status}
    </Badge>
  );
};

export default MeetingStatusBadge;
