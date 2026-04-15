import Badge from '@/shared/components/Badge';
import type { MeetingStatus } from '../api/types';

/** Full meeting shape for derived status labels. */
interface MeetingWithFlags {
  status: MeetingStatus;
  cutOffAt?: string | null;
  invitationSentAt?: string | null;
}

/** Backward-compatible: accept either a full meeting object or just a status string. */
type MeetingStatusBadgeProps =
  | { meeting: MeetingWithFlags; status?: never; size?: 'xs' | 'sm' | 'md' | 'lg' }
  | { status: MeetingStatus; meeting?: never; size?: 'xs' | 'sm' | 'md' | 'lg' };

const BASE_CONFIG: Record<
  MeetingStatus,
  { variant: 'info' | 'primary' | 'success' | 'danger'; label: string }
> = {
  Draft: { variant: 'info', label: 'Draft' },
  Scheduled: { variant: 'primary', label: 'Scheduled' },
  Ended: { variant: 'success', label: 'Ended' },
  Cancelled: { variant: 'danger', label: 'Cancelled' },
};

const MeetingStatusBadge = ({ meeting, status, size = 'sm' }: MeetingStatusBadgeProps) => {
  const resolvedStatus: MeetingStatus = meeting ? meeting.status : status!;
  const config = BASE_CONFIG[resolvedStatus];

  let label = config.label;

  if (meeting) {
    if (resolvedStatus === 'Draft' && meeting.cutOffAt) {
      label = 'Draft — Cut-Off Done';
    } else if (resolvedStatus === 'Scheduled' && meeting.invitationSentAt) {
      label = 'Scheduled — Invitation Sent';
    }
  }

  return (
    <Badge variant={config.variant} size={size}>
      {label}
    </Badge>
  );
};

export default MeetingStatusBadge;
