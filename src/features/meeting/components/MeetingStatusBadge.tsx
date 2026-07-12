import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { MeetingStatus } from '../api/types';

interface MeetingStatusBadgeProps {
  status: MeetingStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const PILL_CLASS = 'bg-gray-100 text-gray-700';

const DOT_COLOR: Record<MeetingStatus, string> = {
  New: 'bg-blue-500',
  InvitationSent: 'bg-primary',
  InProgress: 'bg-amber-500',
  RoutedBack: 'bg-purple-500',
  Ended: 'bg-emerald-500',
  Cancelled: 'bg-red-500',
};

const SIZE_STYLES: Record<NonNullable<MeetingStatusBadgeProps['size']>, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
};

const DOT_STYLES: Record<NonNullable<MeetingStatusBadgeProps['size']>, string> = {
  xs: 'size-1',
  sm: 'size-1.5',
  md: 'size-2',
  lg: 'size-2.5',
};

const MeetingStatusBadge = ({ status, size = 'sm' }: MeetingStatusBadgeProps) => {
  const { t } = useTranslation('meeting');
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        PILL_CLASS,
        SIZE_STYLES[size],
      )}
    >
      <span className={clsx('rounded-full shrink-0', DOT_COLOR[status], DOT_STYLES[size])} />
      {t(`status.${status}` as `status.${MeetingStatus}`)}
    </span>
  );
};

export default MeetingStatusBadge;
