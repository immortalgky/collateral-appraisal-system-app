import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import HolderTimingTooltip, { type HolderTiming } from './HolderTimingTooltip';
import { currentStepOf, stepHasTitle } from './decisionHelpers';

export interface ActivityStep {
  stepName: string;
  taskDescription: string | null;
  role: string;
  assigneeName: string | null;
  assigneeDisplayName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: 'completed' | 'in_progress' | 'pending';
  movement: string | null;
  remark: string | null;
  /** Full timing breakdown for the hover tooltip. Absent on steps with no task row behind them. */
  timing?: HolderTiming;
}

/** The faint "where the picked decision sends the work" row after the current step. */
export interface TimelineGhost {
  /** Movement colour (F teal, B amber, C red); null = nothing picked yet (neutral, dashed). */
  tone: 'F' | 'B' | 'C' | null;
  icon: string;
  title: string;
  meta: string | null;
  /** The meta line is a warning (e.g. no assignee picked yet). */
  metaWarn?: boolean;
}

/** Route back: the earlier step the work returns to, by its title (null when it is unknown). */
export interface TimelineReturnTo {
  title: string | null;
}

/** Return true if this step represents a backward movement (send-back / reject) */
const isBackward = (movement: string | null | undefined): boolean => {
  if (!movement) return false;
  const v = movement.toLowerCase();
  return v === 'b' || v === 'backward';
};

/** Return true if this step represents a forward movement */
const isForward = (movement: string | null | undefined): boolean => {
  if (!movement) return false;
  const v = movement.toLowerCase();
  return v === 'f' || v === 'forward';
};

interface ActivityTrackingTimelineProps {
  activities: ActivityStep[];
  /** The heading shown on the left of the head row; the "show earlier steps" link sits on its right. */
  heading?: string;
  /** Ghost row after the current step, following the pick. Ignored when `returnTo` is set. */
  ghost?: TimelineGhost | null;
  /** A route-back is picked: highlight the step it returns to. */
  returnTo?: TimelineReturnTo | null;
}

const COLLAPSE_THRESHOLD = 3;

/** Array.prototype.findLast is ES2023; the project's lib stops at ES2020. */
function findLast<T>(items: T[], test: (item: T) => boolean): T | undefined {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (test(items[i])) return items[i];
  }
  return undefined;
}

/** A completed step a route-back can return to: the one whose title matches (see stepHasTitle). */
const matchesReturn = (step: ActivityStep, to: TimelineReturnTo): boolean =>
  step.status === 'completed' && stepHasTitle(step, to.title);

/** Format an ISO datetime string to "DD/MM/YYYY HH:mm" */
const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Calculate human-readable duration between two ISO datetime strings */
const formatDuration = (start: string, end: string): string => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return '';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

const statusConfig = {
  completed: {
    dotBg: 'bg-emerald-500',
    ringBg: '',
    lineBorder: 'border-emerald-200',
    lineStyle: 'border-solid',
    icon: 'check',
    iconColor: 'text-white',
  },
  completed_backward: {
    dotBg: 'bg-rose-500',
    ringBg: '',
    lineBorder: 'border-rose-200',
    lineStyle: 'border-solid',
    icon: 'rotate-left',
    iconColor: 'text-white',
  },
  in_progress: {
    dotBg: 'bg-cyan-500',
    ringBg: 'ring-4 ring-cyan-500/20 motion-safe:animate-pulse',
    lineBorder: 'border-cyan-200',
    lineStyle: 'border-solid',
    icon: 'circle-dot',
    iconColor: 'text-white',
  },
  pending: {
    dotBg: 'bg-gray-300',
    ringBg: '',
    lineBorder: 'border-gray-200',
    lineStyle: 'border-dashed',
    icon: '',
    iconColor: '',
  },
};

/** A step's remark, clamped to two lines with a per-remark toggle: one long comment would
 *  otherwise push the current step and the ghost row far below the fold. The toggle shows only
 *  when the text really overflows. */
const RemarkText = ({ text }: { text: string }) => {
  const { t } = useTranslation('appraisal');
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // While clamped, the paragraph is taller than its box exactly when the toggle is needed.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="min-w-0 flex-1">
      <p
        ref={ref}
        className={clsx(
          'dz-step-remark text-xs italic break-words whitespace-pre-wrap',
          !expanded && 'line-clamp-2',
        )}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(v => !v)}
          className="dz-more mt-0.5 text-xs font-medium hover:underline"
        >
          {expanded ? t('decision.route.showLess') : t('decision.route.showMore')}
        </button>
      )}
    </div>
  );
};

const ActivityTrackingTimeline = ({
  activities,
  heading,
  ghost = null,
  returnTo = null,
}: ActivityTrackingTimelineProps) => {
  const { t } = useTranslation('appraisal');
  const [expanded, setExpanded] = useState(false);

  const { visibleActivities, hiddenCount } = useMemo(() => {
    const completedCount = activities.filter(a => a.status === 'completed').length;
    if (expanded || completedCount <= COLLAPSE_THRESHOLD) {
      return { visibleActivities: activities, hiddenCount: 0 };
    }
    // Keep the most recent N completed steps + every non-completed step, preserving
    // original order.
    const completedToHide = completedCount - COLLAPSE_THRESHOLD;
    let skipped = 0;
    const kept = activities.filter(a => {
      if (a.status === 'completed' && skipped < completedToHide) {
        skipped += 1;
        return false;
      }
      return true;
    });
    return { visibleActivities: kept, hiddenCount: completedToHide };
  }, [activities, expanded]);

  // Route back: the latest completed step that matches the target, and whether it is on screen.
  const targetStep = returnTo ? findLast(activities, a => matchesReturn(a, returnTo)) : undefined;
  const targetVisible = !!targetStep && visibleActivities.includes(targetStep);
  const currentStep = currentStepOf(visibleActivities);
  const showTarget = !!returnTo && targetVisible && !!currentStep;

  // The ghost row: the pick's destination, or (route back whose target is not on screen) a stand-in.
  const shownGhost: TimelineGhost | null = returnTo
    ? targetVisible
      ? null
      : {
          tone: 'B',
          icon: 'rotate-left',
          title: t('decision.route.backTo', {
            title: returnTo.title ?? t('decision.route.previousStep'),
          }),
          meta: null,
        }
    : ghost;
  const tone = returnTo ? 'B' : (ghost?.tone ?? null);

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Icon name="clock-rotate-left" style="regular" className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No activity history available yet</p>
      </div>
    );
  }

  const completedCount = activities.filter(a => a.status === 'completed').length;
  const hasCollapseToggle = completedCount > COLLAPSE_THRESHOLD;

  return (
    <div className={clsx(tone && `dz-tone-${tone}`)}>
      {/* Head row: the heading on the left, the earlier-steps link on the right */}
      {(heading || hasCollapseToggle) && (
        <div className="dz-route-head">
          {heading ? <span className="dz-kicker">{heading}</span> : <span />}
          {hasCollapseToggle && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="dz-more text-xs font-medium hover:underline"
            >
              {expanded
                ? t('decision.route.hideEarlier')
                : t('decision.route.showEarlier', { count: hiddenCount })}
            </button>
          )}
        </div>
      )}

      {visibleActivities.map((step, index) => {
        const isLast = index === visibleActivities.length - 1 && !shownGhost;
        const isCurrent = step === currentStep;
        const isTarget = showTarget && step === targetStep;
        // Movement drives the color (F = green, B = red). In-progress always shows
        // its active cyan style regardless of movement. Missing movement falls back
        // to the status-based config (pending = gray, completed = green).
        let configKey: keyof typeof statusConfig;
        if (step.status === 'in_progress') {
          configKey = 'in_progress';
        } else if (isBackward(step.movement)) {
          configKey = 'completed_backward';
        } else if (isForward(step.movement)) {
          configKey = 'completed';
        } else {
          configKey = step.status;
        }
        const config = statusConfig[configKey];

        // A pick is shown for the current step: its connector leads to the ghost row, in the tone.
        const leadsToGhost = isCurrent && !!shownGhost;
        // Any pick animates the connector (forward, route back, cancel); an idle ghost stays a
        // still dashed line.
        const flowsToGhost = leadsToGhost && !!tone;
        // Line 2: "<user code> · <short name>"; the time row sits below it, as before the redesign.
        const who = [step.assigneeName, step.assigneeDisplayName].filter(Boolean).join(' · ');
        const isInstant =
          step.startedAt != null &&
          step.completedAt != null &&
          new Date(step.startedAt).getTime() === new Date(step.completedAt).getTime();
        const duration =
          step.startedAt && step.completedAt
            ? formatDuration(step.startedAt, step.completedAt)
            : null;
        const isZeroDuration = duration === '0m';

        return (
          <div
            key={`${step.stepName}-${index}`}
            className={clsx(
              'relative flex gap-3 transition-opacity',
              showTarget && step.status === 'completed' && !isTarget && 'opacity-55',
            )}
          >
            {/* Timeline column: dot + line */}
            <div className="flex flex-col items-center">
              {/* Dot (with status icon when applicable) */}
              <div
                className={clsx(
                  'size-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center',
                  isTarget ? 'dz-dot-target' : config.dotBg,
                  config.ringBg,
                )}
              >
                {config.icon && (
                  <Icon
                    name={config.icon}
                    style="solid"
                    className={clsx('size-2.5', config.iconColor)}
                  />
                )}
              </div>
              {/* Connecting line */}
              {!isLast &&
                (flowsToGhost ? (
                  // Dashes flowing down to the picked next step, in the movement colour
                  <div className="dz-flow flex-1 my-1" />
                ) : (
                  <div
                    className={clsx(
                      'w-0 flex-1 border-l-2 my-1',
                      leadsToGhost
                        ? ['border-dashed', tone ? 'dz-line-tone' : 'border-gray-200']
                        : [config.lineBorder, config.lineStyle],
                    )}
                  />
                ))}
            </div>

            <div className={clsx('pb-4 flex-1 min-w-0', isLast && 'pb-0')}>
              {/* Line 1: the step, with a tag on the current step / the route-back target */}
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="dz-step-name">{step.taskDescription || step.stepName}</span>
                {/* The dot's colour and icon are the only visual status; say it in words too */}
                {configKey !== 'pending' && (
                  <span className="sr-only">
                    {t(
                      configKey === 'in_progress'
                        ? 'decision.route.inProgress'
                        : configKey === 'completed_backward'
                          ? 'decision.route.statusRoutedBack'
                          : 'decision.route.statusCompleted',
                    )}
                  </span>
                )}
                {isCurrent && <span className="dz-tag-here">{t('decision.route.here')}</span>}
                {isTarget && <span className="dz-tag-back">{t('decision.route.returnsHere')}</span>}
              </div>

              {/* Line 2: who */}
              {who && (
                <div className="dz-step-meta">
                  <span>{who}</span>
                </div>
              )}

              {/* Time range + duration (hover the start for the timing breakdown) */}
              {step.startedAt && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 flex-wrap">
                  <Icon name="clock" style="regular" className="w-3 h-3 text-gray-400" />
                  {step.timing ? (
                    <HolderTimingTooltip timing={step.timing}>
                      {formatDateTime(step.startedAt)}
                    </HolderTimingTooltip>
                  ) : (
                    <span>{formatDateTime(step.startedAt)}</span>
                  )}

                  {!isInstant && step.completedAt && (
                    <>
                      <span className="text-gray-300">→</span>
                      <span>{formatDateTime(step.completedAt)}</span>
                    </>
                  )}

                  {!step.completedAt && (
                    <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded-full text-[10px] font-medium">
                      <span className="size-1.5 rounded-full bg-cyan-500 motion-safe:animate-pulse" />
                      Active now
                    </span>
                  )}

                  {duration && (
                    <span
                      className={clsx(
                        'ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                        isZeroDuration ? 'text-gray-300' : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {duration}
                    </span>
                  )}
                </div>
              )}

              {/* Remark */}
              {step.remark && (
                <div className="mt-1.5 flex items-start gap-1.5 min-w-0">
                  <Icon
                    name="message"
                    style="regular"
                    className="w-3 h-3 text-gray-400 mt-0.5 shrink-0"
                  />
                  <RemarkText text={step.remark} />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Ghost: where the picked (not yet submitted) decision sends the work */}
      {shownGhost && (
        // Keyed by the destination, so the slide-in restarts whenever the pick changes (not when only
        // the assignee line does).
        <div
          key={`${shownGhost.tone ?? 'idle'}|${shownGhost.icon}|${shownGhost.title}`}
          className="dz-ghost relative flex gap-3"
        >
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                'size-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center',
                shownGhost.tone ? 'dz-ghost-dot' : 'dz-ghost-dot-idle',
              )}
            >
              <Icon name={shownGhost.icon} style="solid" className="size-2.5" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {/* Not a step yet: say so, or a screen reader lists it as the next row of the history */}
            <span className="sr-only">{t('decision.route.previewSr')} </span>
            <span className={clsx('dz-step-name', !shownGhost.tone && 'dz-step-idle')}>
              {shownGhost.title}
            </span>
            {shownGhost.meta && (
              <div className={clsx('dz-step-meta', shownGhost.metaWarn && 'dz-warn')}>
                {shownGhost.meta}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityTrackingTimeline;
