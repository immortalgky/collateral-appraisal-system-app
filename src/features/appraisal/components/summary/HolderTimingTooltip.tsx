import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

/**
 * The per-row timing facts behind a history entry. A supervisor reassign deliberately freezes
 * `stepEnteredAt` (the SLA anchor) while handing the task to a new holder, so the visible date
 * (`receivedAt`) and the SLA reference can legitimately disagree. This tooltip is where that
 * divergence is explained instead of hidden.
 */
export interface HolderTiming {
  /** When THIS row's holder received the task (AssigneeAssignedAt). The date shown on screen. */
  receivedAt: string;
  /** When the workflow entered this step (AssignedAt). Repeats across hand-off rows. */
  stepEnteredAt: string | null;
  /** When this holder first opened it. Null on archived rows predating the column. */
  openedAt: string | null;
  /** The real SLA clock-start — the appointment date or a window's start, not always the step entry. */
  slaStartAt: string | null;
  dueAt: string | null;
  slaStatus: string | null;
  slaDurationHours: number | null;
  /** True while the task is still open. */
  isPending: boolean;
  /**
   * The task's own status. A null `openedAt` means two different things: "never opened" while the
   * task is still Assigned, and "we have no record" once it is InProgress or archived — the latter
   * covers rows written before OpenedAt was carried onto CompletedTask, which are deliberately not
   * backfilled. Claiming "not opened yet" for those would be a lie.
   */
  taskState: string | null;
}

/** Gap between the trigger and the panel, and the minimum margin kept from any viewport edge. */
const OFFSET = 6;
const VIEWPORT_MARGIN = 8;

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

// The task layer emits "OnTime" and the appraisal layer "OnTrack" for the same state — SlaCells and
// TaskMonitorTable both accept either, so this must too or a healthy SLA renders in neutral gray.
const slaStatusTone: Record<string, string> = {
  breached: 'text-rose-300',
  atrisk: 'text-amber-300',
  ontime: 'text-emerald-300',
  ontrack: 'text-emerald-300',
};

interface RowProps {
  label: string;
  children: ReactNode;
}

const Row = ({ label, children }: RowProps) => (
  <div className="flex items-baseline gap-6 whitespace-nowrap">
    <span className="text-gray-400 shrink-0">{label}</span>
    <span className="ml-auto text-right tabular-nums">{children}</span>
  </div>
);

interface HolderTimingTooltipProps {
  timing: HolderTiming;
  /** The visible trigger — normally the formatted `receivedAt` already rendered by the caller. */
  children: ReactNode;
}

/**
 * Wraps a date and reveals the full timing breakdown on hover. Rows that would merely repeat the
 * line above are omitted: on a task that was never reassigned every clock coincides, and showing
 * four identical timestamps teaches the reader nothing.
 *
 * The panel is portalled to <body> and positioned `fixed`. An absolutely positioned panel inside
 * the timeline would extend its scrollable ancestor's content box, which nudges the layout, moves
 * the pointer off the trigger, closes the panel, shrinks the layout back — an endless flicker near
 * the bottom of the viewport. Going fixed also escapes `overflow: hidden` clipping.
 */
const HolderTimingTooltip = ({ timing, children }: HolderTimingTooltipProps) => {
  const { t } = useTranslation('appraisal');
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const open = useCallback(() => {
    if (triggerRef.current) setAnchor(triggerRef.current.getBoundingClientRect());
  }, []);

  const close = useCallback(() => {
    setAnchor(null);
    setPosition(null);
  }, []);

  // Measure the rendered panel, then place it: below when it fits, flipped above when it does not,
  // and always clamped inside the viewport. Runs before paint so the panel never shows mid-flight.
  useLayoutEffect(() => {
    if (!anchor || !panelRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = panelRef.current;
    const fitsBelow = anchor.bottom + OFFSET + h + VIEWPORT_MARGIN <= window.innerHeight;
    const top = fitsBelow
      ? anchor.bottom + OFFSET
      : Math.max(VIEWPORT_MARGIN, anchor.top - OFFSET - h);
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(anchor.left, window.innerWidth - w - VIEWPORT_MARGIN),
    );
    setPosition({ top, left });
  }, [anchor]);

  // Fixed coordinates go stale the moment anything scrolls or the window resizes; close instead of
  // chasing it. Capture phase so scrolls inside the timeline panel are caught too.
  useLayoutEffect(() => {
    if (!anchor) return;
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [anchor, close]);

  // Always shown when known, even when it equals `receivedAt`. Hiding the duplicate saved a line but
  // left the reader unable to tell WHICH clock `Received` was — the whole point of the tooltip.
  const showStepEntered = timing.stepEnteredAt != null;
  // Same reasoning: a hidden row is indistinguishable from an unknown one, and the SLA anchor is
  // exactly the fact a reader comes here to check. Shown whenever it is known.
  const showSlaStart = timing.slaStartAt != null;
  const tone = timing.slaStatus ? slaStatusTone[timing.slaStatus.toLowerCase()] : undefined;

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        className="border-b border-dotted border-gray-300 cursor-help outline-none
                   focus-visible:ring-1 focus-visible:ring-blue-400 rounded-sm"
      >
        {children}
      </span>

      {anchor &&
        createPortal(
          <div
            ref={panelRef}
            role="tooltip"
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? 'visible' : 'hidden',
            }}
            className="fixed z-50 px-3 py-2 rounded-lg bg-gray-800 text-white text-[11px]
                       leading-relaxed shadow-lg pointer-events-none font-normal space-y-0.5"
          >
            <Row label={t('activityTracking.timing.receivedAt')}>
              {formatDateTime(timing.receivedAt)}
            </Row>

            {/* Always rendered, for the same reason as the rows around it: an omitted row is
                indistinguishable from an unknown one. When empty it says which kind of empty —
                "not opened yet" only while the task is still Assigned, "no record" once it is
                InProgress or archived and the stamp is simply not recoverable. */}
            <Row label={t('activityTracking.timing.openedAt')}>
              {timing.openedAt ? (
                formatDateTime(timing.openedAt)
              ) : (
                <span className="text-gray-400 italic">
                  {timing.taskState === 'Assigned'
                    ? t('activityTracking.timing.notOpenedYet')
                    : t('activityTracking.timing.noOpenRecord')}
                </span>
              )}
            </Row>

            {showStepEntered && (
              <Row label={t('activityTracking.timing.stepEnteredAt')}>
                {formatDateTime(timing.stepEnteredAt!)}
              </Row>
            )}

            {showSlaStart && (
              <Row label={t('activityTracking.timing.slaStartAt')}>
                {formatDateTime(timing.slaStartAt!)}
              </Row>
            )}

            {timing.dueAt && (
              <Row label={t('activityTracking.timing.dueAt')}>
                {formatDateTime(timing.dueAt)}
                {timing.slaDurationHours != null && (
                  <span className="text-gray-400">
                    {' '}
                    · {t('activityTracking.timing.hoursShort', { hours: timing.slaDurationHours })}
                  </span>
                )}
              </Row>
            )}

            {timing.slaStatus && (
              <Row label={t('activityTracking.timing.slaStatus')}>
                <span className={tone ?? 'text-gray-200'}>{timing.slaStatus}</span>
              </Row>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default HolderTimingTooltip;
