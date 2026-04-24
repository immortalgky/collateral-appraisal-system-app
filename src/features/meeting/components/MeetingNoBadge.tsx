interface MeetingNoBadgeProps {
  meetingNo: string;
}

const MeetingNoBadge = ({ meetingNo }: MeetingNoBadgeProps) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
    {meetingNo}
  </span>
);

export default MeetingNoBadge;
