/**
 * Meeting lifecycle as a connected timeline, plus the schedule facts beside it.
 *
 * Replaces the old flat `<dl>` where `cutOffAt` / `invitationSentAt` / `endedAt` sat mixed in
 * among start/end/location, giving no sense of sequence or of what has happened yet.
 */
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import Icon from '@/shared/components/Icon';
import type { MeetingDetailDto } from '../../api/types';
import { useMeetingFormat } from '../../utils/useMeetingFormat';

interface TimelineNode {
  key: string;
  label: string;
  icon: string;
  at: string | null | undefined;
  by?: string | null;
  /** Terminal nodes (ended / cancelled) render in their own colour. */
  tone?: 'default' | 'success' | 'danger';
}

interface MeetingTimelineProps {
  meeting: MeetingDetailDto;
  /** Pulses the most recent completed node — used while a meeting is live. */
  live?: boolean;
}

const MeetingTimeline = ({ meeting, live = false }: MeetingTimelineProps) => {
  const { t } = useTranslation('meeting');
  const { formatDateTime } = useMeetingFormat();

  const isCancelled = meeting.status === 'Cancelled';

  const nodes: TimelineNode[] = [
    {
      key: 'created',
      label: t('timeline.created'),
      icon: 'plus',
      at: meeting.createdAt,
      by: meeting.createdBy,
    },
    { key: 'cutOff', label: t('timeline.cutOff'), icon: 'scissors', at: meeting.cutOffAt },
    {
      key: 'invitationSent',
      label: t('timeline.invitationSent'),
      icon: 'envelope',
      at: meeting.invitationSentAt,
    },
    {
      key: 'started',
      label: t('timeline.scheduledStart'),
      icon: 'circle-play',
      at: meeting.startAt,
    },
    isCancelled
      ? {
          key: 'cancelled',
          label: t('timeline.cancelled'),
          icon: 'circle-xmark',
          at: meeting.cancelledAt,
          tone: 'danger',
        }
      : {
          key: 'ended',
          label: t('timeline.ended'),
          icon: 'flag-checkered',
          at: meeting.endedAt,
          tone: 'success',
        },
  ];

  const now = Date.now();
  // A node is "reached" once its timestamp exists AND is in the past — `startAt` is a schedule,
  // not an event, so a future start must stay dim rather than claiming the meeting began.
  const reached = nodes.map(n => n.at != null && new Date(n.at).getTime() <= now);
  const lastReachedIndex = reached.lastIndexOf(true);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Timeline */}
      <ol className="relative space-y-0">
        {nodes.map((node, index) => {
          const isReached = reached[index];
          const isCurrent = live && index === lastReachedIndex;
          const isLast = index === nodes.length - 1;

          return (
            <li key={node.key} className="relative flex gap-3 pb-5 last:pb-0">
              {/* Connector */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    'absolute left-[13px] top-7 bottom-0 w-px',
                    isReached ? 'bg-gray-300' : 'bg-(--palette-surface-3)/60',
                  )}
                />
              )}

              <span
                className={clsx(
                  'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-(--palette-surface) transition-colors',
                  !isReached && 'bg-(--palette-surface-3) text-(--palette-gray-300)',
                  isReached &&
                    node.tone === 'success' &&
                    'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                  isReached &&
                    node.tone === 'danger' &&
                    'bg-red-100 dark:bg-red-500/20 text-(--palette-danger)',
                  isReached && !node.tone && 'bg-primary/10 text-(--palette-primary-text)',
                  isCurrent && 'animate-pulse',
                )}
              >
                <Icon name={node.icon} style="solid" className="size-3" />
              </span>

              <div className="min-w-0 pt-0.5">
                <p
                  className={clsx(
                    'text-sm font-medium',
                    isReached ? 'text-(--palette-ink)' : 'text-(--palette-gray-400)',
                  )}
                >
                  {node.label}
                </p>
                <p className="mt-0.5 text-xs text-(--palette-gray-500)">
                  {isReached || node.at ? formatDateTime(node.at) : t('timeline.pending')}
                  {node.by && isReached && (
                    <span className="ml-1.5 text-(--palette-gray-400)">
                      {t('timeline.by', { name: node.by })}
                    </span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Schedule facts */}
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 self-start sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-(--palette-gray-400)">
            {t('detail.start')}
          </dt>
          <dd className="mt-0.5 text-sm text-(--palette-ink)">{formatDateTime(meeting.startAt)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-(--palette-gray-400)">
            {t('detail.end')}
          </dt>
          <dd className="mt-0.5 text-sm text-(--palette-ink)">{formatDateTime(meeting.endAt)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-(--palette-gray-400)">
            {t('detail.location')}
          </dt>
          <dd className="mt-0.5 text-sm text-(--palette-ink)">{meeting.location ?? '—'}</dd>
        </div>
        {meeting.fromText && (
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-(--palette-gray-400)">
              {t('detail.from')}
            </dt>
            <dd className="mt-0.5 text-sm text-(--palette-ink)">{meeting.fromText}</dd>
          </div>
        )}
        {meeting.toText && (
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-(--palette-gray-400)">
              {t('detail.to')}
            </dt>
            <dd className="mt-0.5 text-sm text-(--palette-ink)">{meeting.toText}</dd>
          </div>
        )}
        {meeting.notes && (
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-(--palette-gray-400)">
              {t('detail.notes')}
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-(--palette-ink)">
              {meeting.notes}
            </dd>
          </div>
        )}
        {meeting.updatedAt && (
          <div className="sm:col-span-2 border-t border-(--palette-line-soft) pt-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-(--palette-gray-400)">
              {t('timeline.lastUpdated')}
            </dt>
            <dd className="mt-0.5 text-xs text-(--palette-gray-500)">
              {formatDateTime(meeting.updatedAt)}
              {meeting.updatedBy && (
                <span className="ml-1.5 text-(--palette-gray-400)">
                  {t('timeline.by', { name: meeting.updatedBy })}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
};

export default MeetingTimeline;
