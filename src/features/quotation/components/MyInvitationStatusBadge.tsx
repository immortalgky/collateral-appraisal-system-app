import clsx from 'clsx';

interface StatusConfig {
  label: string;
  className: string;
}

// Outcome after the bank closes the RFQ:
//   Accepted / Won → this vendor was selected as the winner.
//   Rejected / Lost → this vendor was not selected; their bid is now read-only.
const AWARDED: StatusConfig = {
  label: 'Awarded',
  className: 'bg-green-100 text-green-700 border border-green-200',
};
const QUOTED: StatusConfig = {
  label: 'Quoted',
  className: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  Pending: {
    label: 'Pending Submission',
    className: 'bg-amber-100 text-amber-700 border border-amber-200',
  },
  Draft: {
    label: 'Draft',
    className: 'bg-amber-100 text-amber-700 border border-amber-200',
  },
  PendingCheckerReview: {
    label: 'Pending Checker Review',
    className: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  },
  Submitted: {
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-700 border border-blue-200',
  },
  UnderReview: {
    label: 'Under Review',
    className: 'bg-blue-100 text-blue-700 border border-blue-200',
  },
  Tentative: {
    label: 'Tentative Winner',
    className: 'bg-purple-100 text-purple-700 border border-purple-200',
  },
  Negotiating: {
    label: 'Negotiating',
    className: 'bg-purple-100 text-purple-700 border border-purple-200',
  },
  Accepted: AWARDED,
  Won: AWARDED,
  Rejected: QUOTED,
  Lost: QUOTED,
  Withdrawn: {
    label: 'Withdrawn',
    className: 'bg-gray-100 text-gray-600 border border-gray-200',
  },
  Declined: {
    label: 'Declined',
    className: 'bg-rose-100 text-rose-700 border border-rose-200',
  },
  Expired: {
    label: 'Expired',
    className: 'bg-gray-100 text-gray-600 border border-gray-200',
  },
  Cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-100 text-rose-700 border border-rose-200',
  },
};

interface MyInvitationStatusBadgeProps {
  status: string;
  className?: string;
}

const MyInvitationStatusBadge = ({ status, className }: MyInvitationStatusBadgeProps) => {
  const config: StatusConfig = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600 border border-gray-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
};

export default MyInvitationStatusBadge;
