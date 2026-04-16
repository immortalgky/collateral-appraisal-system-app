interface MeetingNoBadgeProps {
  meetingNo: string | null | undefined;
}

const MeetingNoBadge = ({ meetingNo }: MeetingNoBadgeProps) => {
  if (!meetingNo) {
    return (
      <span
        className="text-gray-400 text-sm italic"
        title="Meeting No. not yet assigned — send the invitation first"
      >
        —
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      {meetingNo}
    </span>
  );
};

export default MeetingNoBadge;
