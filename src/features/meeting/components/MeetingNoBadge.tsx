import Icon from '@/shared/components/Icon';

interface MeetingNoBadgeProps {
  meetingNo: string;
}

const MeetingNoBadge = ({ meetingNo }: MeetingNoBadgeProps) => (
  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 shadow-sm transition-shadow hover:shadow">
    <Icon name="calendar-days" style="solid" className="size-3" />
    {meetingNo}
  </span>
);

export default MeetingNoBadge;
