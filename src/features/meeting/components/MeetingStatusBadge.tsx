import Badge from '@/shared/components/Badge';
import { MEETING_STATUS_BADGE_VARIANT, MEETING_STATUS_LABELS } from '../constants';
import type { MeetingStatus } from '../api/types';

interface MeetingStatusBadgeProps {
  status: MeetingStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const MeetingStatusBadge = ({ status, size = 'sm' }: MeetingStatusBadgeProps) => (
  <Badge variant={MEETING_STATUS_BADGE_VARIANT[status]} size={size}>
    {MEETING_STATUS_LABELS[status]}
  </Badge>
);

export default MeetingStatusBadge;
