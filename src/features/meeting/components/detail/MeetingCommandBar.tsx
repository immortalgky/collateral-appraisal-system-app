/**
 * Sticky header: identity, live clock, and the status-gated action set.
 *
 * The action gating is unchanged from the original page header — every `*_ELIGIBLE` set in
 * `constants.ts` mirrors a backend guard, so this component reads them rather than inventing
 * its own rules.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import {
  CANCEL_ELIGIBLE,
  CUT_OFF_ELIGIBLE,
  EDIT_ELIGIBLE,
  END_ELIGIBLE,
  getPrimaryToolbarAction,
  RESEND_INVITATION_ELIGIBLE,
  SOFT_TONES,
  type SoftTone,
} from '../../constants';
import type { MeetingDetailDto } from '../../api/types';
import MeetingNoBadge from '../MeetingNoBadge';
import MeetingStatusBadge from '../MeetingStatusBadge';

interface MeetingCommandBarProps {
  meeting: MeetingDetailDto;
  canAdminister: boolean;
  totalItems: number;
  /** True while the page is polling — drives the live dot and "updated" stamp. */
  isLive: boolean;
  /** `dataUpdatedAt` from React Query, so the freshness stamp reflects the real fetch. */
  dataUpdatedAt: number;
  onEdit: () => void;
  onCutOff: () => void;
  onSendInvitation: () => void;
  onResendInvitation: () => void;
  onDocuments: () => void;
  onEnd: () => void;
  onCancel: () => void;
}

/** Ticks once a second so the countdown and freshness stamp stay honest without a refetch. */
const useNowTick = (enabled: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
};

/**
 * One toolbar action. `solid` marks the single focal action for the current status (brand teal);
 * every other button renders as a soft tint in its own semantic colour, so the toolbar reads as
 * a hierarchy rather than a row of competing saturated buttons.
 *
 * Labels collapse below `sm`, leaving icon-only buttons — the `title` keeps them identifiable.
 */
const ToolbarButton = ({
  icon,
  label,
  tone,
  solid = false,
  iconClassName,
  onClick,
}: {
  icon: string;
  label: string;
  tone: SoftTone;
  solid?: boolean;
  /** Tints the icon independently of the fill — used by the quiet white-background buttons. */
  iconClassName?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    title={label}
    onClick={onClick}
    className={clsx(
      'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium',
      'transition-colors focus:outline-none focus-visible:ring-offset-1',
      solid
        ? 'bg-primary text-white shadow-sm hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40'
        : SOFT_TONES[tone],
    )}
  >
    <Icon
      name={icon}
      style="solid"
      className={clsx('size-3.5 sm:mr-1.5', !solid && iconClassName)}
    />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const formatDuration = (ms: number): string => {
  const totalMinutes = Math.floor(Math.abs(ms) / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const MeetingCommandBar = ({
  meeting,
  canAdminister,
  totalItems,
  isLive,
  dataUpdatedAt,
  onEdit,
  onCutOff,
  onSendInvitation,
  onResendInvitation,
  onDocuments,
  onEnd,
  onCancel,
}: MeetingCommandBarProps) => {
  const { t } = useTranslation('meeting');
  const navigate = useNavigate();
  const { status } = meeting;

  const primaryAction = getPrimaryToolbarAction(status, totalItems > 0);
  const startMs = meeting.startAt ? new Date(meeting.startAt).getTime() : null;
  const isUpcoming = status === 'New' || status === 'InvitationSent';
  // Only tick when something on screen actually changes each second.
  const now = useNowTick(isLive || (isUpcoming && startMs !== null));

  let clock: { icon: string; text: string; tone: string } | null = null;
  if (startMs !== null && isUpcoming && startMs > now) {
    clock = {
      icon: 'clock',
      text: t('session.startsIn', { time: formatDuration(startMs - now) }),
      tone: 'text-gray-500',
    };
  } else if (isLive && startMs !== null && startMs <= now) {
    clock = {
      icon: 'circle-play',
      text: t('session.running', { time: formatDuration(now - startMs) }),
      tone: 'text-amber-600',
    };
  }

  const freshnessSeconds = Math.max(0, Math.round((now - dataUpdatedAt) / 1000));

  return (
    <div className="sticky top-0 z-20 -mx-1 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80 bg-white/95">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/meetings')} type="button">
            <Icon name="arrow-left" style="solid" className="size-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">{t('buttons.back')}</span>
          </Button>

          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <MeetingNoBadge meetingNo={meeting.meetingNo} />
            <h2 className="truncate text-base font-semibold text-gray-900">{meeting.title}</h2>
            <MeetingStatusBadge status={status} />

            {clock && (
              <span className={clsx('inline-flex items-center gap-1 text-xs', clock.tone)}>
                <Icon name={clock.icon} style="solid" className="size-3" />
                {clock.text}
              </span>
            )}

            {isLive && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                title={t('session.updatedAgo', {
                  time: freshnessSeconds < 5 ? t('session.justNow') : `${freshnessSeconds}s`,
                })}
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                {t('session.live')}
              </span>
            )}
          </div>
        </div>

        {canAdminister && (
          <div className="flex shrink-0 items-center gap-2">
            {EDIT_ELIGIBLE.has(status) && (
              <ToolbarButton icon="pen" label={t('buttons.edit')} tone="slate" onClick={onEdit} />
            )}

            {CUT_OFF_ELIGIBLE.has(status) && (
              <ToolbarButton
                icon="scissors"
                label={t('buttons.cutOff')}
                tone="amber"
                solid={primaryAction === 'cutOff'}
                onClick={onCutOff}
              />
            )}

            {status === 'New' && totalItems > 0 && (
              <ToolbarButton
                icon="envelope"
                label={t('buttons.sendInvitation')}
                tone="info"
                solid={primaryAction === 'sendInvitation'}
                onClick={onSendInvitation}
              />
            )}

            {RESEND_INVITATION_ELIGIBLE.has(status) && (
              <ToolbarButton
                icon="paper-plane"
                label={t('buttons.resendInvitation')}
                tone="white"
                iconClassName="text-blue-600"
                onClick={onResendInvitation}
              />
            )}

            <ToolbarButton
              icon="folder-open"
              label={t('buttons.documents')}
              tone="white"
              iconClassName="text-primary"
              onClick={onDocuments}
            />

            {END_ELIGIBLE.has(status) && (
              <ToolbarButton
                icon="flag-checkered"
                label={t('buttons.endMeeting')}
                tone="emerald"
                solid={primaryAction === 'end'}
                onClick={onEnd}
              />
            )}

            {CANCEL_ELIGIBLE.has(status) && (
              <ToolbarButton
                icon="xmark"
                label={t('buttons.cancel')}
                tone="danger"
                onClick={onCancel}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingCommandBar;
