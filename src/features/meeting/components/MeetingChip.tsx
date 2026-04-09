import { Link } from 'react-router-dom';
import Icon from '@/shared/components/Icon';

interface MeetingChipProps {
  meetingId: string;
  title: string;
  endedAt?: string | null;
}

/**
 * Compact chip linking from an appraisal's approval section back to the
 * meeting that released it for voting. Used by `ApprovalListSection` for
 * tier-3 (CommitteeWithMeeting) appraisals.
 */
const MeetingChip = ({ meetingId, title, endedAt }: MeetingChipProps) => {
  const formattedDate = endedAt
    ? new Date(endedAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <Link
      to={`/meetings/${meetingId}`}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors text-xs"
    >
      <Icon name="people-arrows" style="solid" className="w-3.5 h-3.5 text-blue-600" />
      <span className="font-medium text-blue-700">{title}</span>
      {formattedDate && <span className="text-blue-600">· {formattedDate}</span>}
    </Link>
  );
};

export default MeetingChip;
