import { useTranslation } from 'react-i18next';
import Badge from '@/shared/components/Badge';
import { MEETING_STATUS_BADGE_VARIANT } from '../constants';
import type { MeetingStatus } from '../api/types';

interface MeetingStatusBadgeProps {
  status: MeetingStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const MeetingStatusBadge = ({ status, size = 'sm' }: MeetingStatusBadgeProps) => {
  const { t } = useTranslation('meeting');
  return (
    <Badge variant={MEETING_STATUS_BADGE_VARIANT[status]} size={size}>
      {t(`status.${status}` as `status.${MeetingStatus}`)}
    </Badge>
  );
};

export default MeetingStatusBadge;
