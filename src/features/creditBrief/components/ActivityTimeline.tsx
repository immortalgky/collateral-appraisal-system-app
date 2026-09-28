import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { isPoolAssignee, loginCode, poolLabel } from '../assigneeLabels';
import type { ActivityLogItemDto } from '@/features/appraisal/api/workflow';
import { phaseLabel } from '../phaseLabels';

/**
 * The work history, as a timeline rather than a table.
 *
 * The table it replaces had eight columns, and for a credit officer three of them
 * were noise: ACTION carried the workflow's own single-letter codes (P / R /
 * INT), STATUS read "completed" on every row, and END DATE repeated the next
 * row's START DATE. What was left — who had it, how long they took, and why it
 * came back — had to be reassembled by eye across the width of the screen.
 *
 * Read top to bottom instead: the date sits in its own gutter and is printed
 * only when the day changes, so a run of entries a minute apart reads as one
 * burst rather than ten repetitions of the same timestamp.
 */
interface ActivityTimelineProps {
  activityLog: ActivityLogItemDto[];
  /** Entries shown before "ดูทั้งหมด". A long history is the exception, not the rule. */
  collapseAfter?: number;
}

/**
 * Which way the work went at this step.
 *
 * `Movement` is the workflow engine's own direction and the only reliable
 * signal: **F** forward, **B** back, **C** cancelled — 852 / 129 / 3 rows on the
 * dev database. It is NOT P / R / INT, which is what the old table's ACTION
 * column showed; that column is `ActionTaken`, a different field holding what
 * the user clicked (P, R, RouteBack, Recalled, reject, Reassigned, …). Reading
 * the direction off ActionTaken, as this first did, meant every row fell through
 * to "no direction" and nothing was marked at all.
 *
 * ActionTaken is still consulted as a fallback, for rows old enough to predate
 * Movement being stamped.
 */
type Direction = 'forward' | 'back' | 'cancel';

const BACKWARD_ACTIONS = new Set([
  'R',
  'RouteBack',
  'route_back',
  'Recalled',
  'reject',
  'Decline',
  'Declined',
  'Counter',
]);
const CANCEL_ACTIONS = new Set(['C', 'Cancelled', 'Closed']);

const directionOf = (item: ActivityLogItemDto): Direction | null => {
  if (item.movement === 'B') return 'back';
  if (item.movement === 'C') return 'cancel';
  if (item.movement === 'F') return 'forward';

  const action = item.actionTaken;
  if (!action) return null;
  if (CANCEL_ACTIONS.has(action)) return 'cancel';
  if (BACKWARD_ACTIONS.has(action)) return 'back';
  return 'forward';
};

/**
 * What to call it. The direction carries the meaning, except for a reassignment,
 * which moves forward but to a different person — worth saying, because it is
 * the other reason an appraisal sits still.
 */
const labelKeyOf = (item: ActivityLogItemDto, direction: Direction | null) => {
  if (item.actionTaken === 'Reassigned') return 'activityTracking.brief.log.reassigned' as const;
  /* INT and EXT are opposites, and lumping them together said the wrong thing:
     an appraisal handed to a valuation firm (EXT, 64 rows) was being labelled
     "มอบหมายภายใน". EXTO is the same decision with a different flavour. */
  if (item.actionTaken === 'INT') return 'activityTracking.brief.log.assignedInternal' as const;
  if (item.actionTaken === 'EXT' || item.actionTaken === 'EXTO')
    return 'activityTracking.brief.log.assignedExternal' as const;
  if (direction === 'back') return 'activityTracking.brief.log.returned' as const;
  if (direction === 'cancel') return 'activityTracking.brief.log.cancelled' as const;
  if (direction === 'forward') return 'activityTracking.brief.log.forwarded' as const;
  return null;
};

const dayOf = (iso: string) => iso.slice(0, 10);

const formatDay = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const initials = (name: string) =>
  name
    .replace(/^(นาย|นาง|นางสาว|บริษัท|บจก\.|คณะ)\s*/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p.charAt(0))
    .join('');

/** Hours a step took, parsed back out of the "1632h 32m" the API formats. */
const hoursOf = (timeTaken: string | null) => {
  const m = timeTaken?.match(/^(\d+)h/);
  return m ? Number(m[1]) : 0;
};

/**
 * Consecutive steps done by the same outside firm, folded into one entry.
 *
 * What happens inside a valuation firm — which of its staff surveyed, who
 * checked, who re-checked — is the firm's own business, and it produced six
 * near-identical rows reading "Eastern Appraisal Services" in the screenshot.
 * To a credit officer it is one thing: the work went out, and it came back.
 * The fold keeps the span and the step count so nothing is actually lost.
 *
 * Detected by the ACTIVITY ID, not by the assignee's company. `companyName` is
 * whatever company the assigned user belongs to, which is a fact about the
 * person; `ext-` on the activity id is the workflow itself saying this leg is
 * the external one. A bank employee following up an external assignment appears
 * on an `ext-` activity with no company, and belongs in the fold; an outside
 * user who happens to be assigned an internal step does not.
 */
const isExternalLeg = (item: ActivityLogItemDto) => item.activityId?.startsWith('ext-') === true;

interface Entry {
  head: ActivityLogItemDto;
  tail: ActivityLogItemDto;
  /** Every step in the fold, kept so the entry can be opened up. */
  items: ActivityLogItemDto[];
  company: string | null;
}

const ActivityTimeline = ({ activityLog, collapseAfter = 8 }: ActivityTimelineProps) => {
  const { t } = useTranslation('appraisal');
  const localizeCompanyName = useLocalizedCompanyName();
  const [expanded, setExpanded] = useState(false);
  /**
   * Which folded entries the reader has opened. Closed by default: the fold
   * exists because who did what inside a valuation firm is not credit's
   * business day to day — but when an appraisal has been out three times, being
   * able to look is the difference between "it is with the firm" and knowing
   * which round stalled.
   */
  const [openLegs, setOpenLegs] = useState<Record<string, boolean>>({});

  if (!activityLog?.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-gray-100">
          <Icon name="clock-rotate-left" style="regular" className="h-5 w-5 text-gray-400" />
        </span>
        <p className="text-sm text-gray-500">{t('activityTracking.brief.log.empty')}</p>
      </div>
    );
  }

  /** Fold the external leg; everything else stays one entry per step. */
  const entries: Entry[] = [];
  for (const item of activityLog) {
    const last = entries[entries.length - 1];
    const external = isExternalLeg(item);
    const company = item.companyName
      ? localizeCompanyName(item.companyName, item.companyNameLocal)
      : null;

    // Same firm, still running: extend the entry rather than opening a new one.
    if (last && external && isExternalLeg(last.head) && last.company === company) {
      last.tail = item;
      last.items.push(item);
      continue;
    }
    entries.push({ head: item, tail: item, items: [item], company });
  }

  /**
   * Collapsed shows the LATEST entries, not the first.
   *
   * The log runs oldest-first, so trimming from the end hid exactly what a
   * reader opens this panel for — where the work is now. On a long history like
   * 69000115 (three rounds with the valuation firm, eighteen steps) that pushed
   * every recent return out of view behind a button.
   */
  const shown = expanded ? entries : entries.slice(Math.max(0, entries.length - collapseAfter));

  return (
    <div>
      {/* The rail and the date gutter. `pl-[118px]` leaves room for the gutter, which is
          positioned into it — a grid would give every row the gutter's full height even when
          the date is not printed. */}
      <ol className="relative pl-[118px]">
        <span className="absolute bottom-2 left-[104px] top-2 w-px bg-gray-200" />

        {shown.map((entry, i) => {
          const item = entry.head;
          const start = item.startDate;
          const newDay = i === 0 || dayOf(shown[i - 1].head.startDate) !== dayOf(start);
          const direction = directionOf(item);
          const returned = direction === 'back';
          const cancelled = direction === 'cancel';
          const company = entry.company;
          const folded = entry.items.length > 1;
          const legKey = `${item.sequenceNo}-${start}`;
          const legOpen = !!openLegs[legKey];
          /**
           * A pool row is a desk, not a person: GetAppraisalWorkflowProgress only resolves a
           * display name for AssignedType '1', so a pool falls through to the raw assignee, which
           * carries PoolAssigneeSelector's ":Team_<teamId>" suffix. Trimmed to the group name.
           */
          const isPool = isPoolAssignee(item.assignedType);
          const poolName = isPool ? poolLabel(item.assignedTo) : null;
          const who =
            company ||
            (folded ? t('activityTracking.brief.log.externalLeg') : null) ||
            item.assignedToDisplayName ||
            poolName ||
            item.assignedTo ||
            null;
          /**
           * The bank code the person logs in with, beside the name. Credit asks the appraisal desk
           * for people by code as often as by name, and two staff can share a display name — the
           * approval rows below are five different people on the same activity. Suppressed for a
           * firm, for a folded external leg and for a pool, none of which has a login; and when
           * the display name IS the code (the lookup missed), so it never prints "P5229 · P5229".
           */
          const login =
            company || folded || isPool
              ? null
              : loginCode(item.assignedTo, item.assignedToDisplayName);
          // A folded entry spans from its first step's start to its last one's end.
          const endsAt = entry.tail.endDate;
          const phase = phaseLabel(t, item.group) ?? item.activityName;
          const movement = labelKeyOf(item, direction);
          // A step that ran for days is the answer to "why is this taking so long", and in the
          // old table it was a grey chip identical to the ones reading "0h 0m".
          const slow = hoursOf(item.timeTaken) >= 48;

          return (
            <li
              key={`${item.sequenceNo}-${start}`}
              className="relative border-t border-gray-100 py-3 first:border-t-0"
            >
              <span className="absolute -left-[22px] top-[18px] text-right text-[11.5px] leading-tight text-gray-400">
                <span className="absolute -left-[96px] top-0 w-[92px] text-right">
                  {newDay && (
                    <span className="block text-xs font-semibold text-gray-600">
                      {formatDay(start)}
                    </span>
                  )}
                  {formatTime(start)}
                </span>
              </span>
              {/* Direction, on the rail itself.
                  A step that went BACK is the only thing in this list a reader is scanning for —
                  it is why an appraisal is late — and it was marked only by an amber ring on a
                  2.5px dot and a chip several words in. Now the rail turns amber for the length
                  of that step and the node carries a turn-back arrow, so the loop is visible
                  before anything is read. */}
              {(returned || cancelled) && (
                <span className="absolute -left-[18px] bottom-0 top-0 w-px bg-amber-300" />
              )}
              {returned || cancelled ? (
                <span className="absolute -left-[23px] top-[14px] grid h-4 w-4 place-items-center rounded-full bg-amber-100 ring-2 ring-white">
                  <Icon
                    name="arrow-turn-up"
                    style="solid"
                    className="h-2 w-2 text-amber-700"
                    aria-hidden
                  />
                </span>
              ) : (
                /* Solid once the step is finished, hollow while it is still running. Every node
                   used to be hollow, so the one step actually in progress looked like all the
                   rest — and "where is it now" is the first thing this list is read for. */
                <span
                  className={clsx(
                    'absolute -left-[18px] top-[19px] h-2.5 w-2.5 rounded-full border-2 border-primary',
                    item.status === 'Completed' ? 'bg-primary' : 'bg-white',
                  )}
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-gray-900">{phase}</span>
                {folded && (
                  <button
                    type="button"
                    onClick={() => setOpenLegs(prev => ({ ...prev, [legKey]: !prev[legKey] }))}
                    aria-expanded={legOpen}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    <Icon
                      name={legOpen ? 'chevron-up' : 'chevron-down'}
                      style="solid"
                      className="h-2 w-2"
                      aria-hidden
                    />
                    {t('activityTracking.brief.log.steps', { count: entry.items.length })}
                  </button>
                )}
                {item.timeTaken && (
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-[11px] tabular-nums',
                      slow ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500',
                    )}
                  >
                    {item.timeTaken}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-gray-500">
                {who && (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <i
                      className={clsx(
                        'grid h-5 w-5 flex-none place-items-center rounded-full text-[9px] font-bold not-italic',
                        company || isPool || folded
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-teal-50 text-teal-700',
                      )}
                    >
                      {/* A firm, a committee OR a pool — none of them is a person, and "IntAdmin"
                          rendered as a teal "I" read as one. The rail and the holder card already
                          draw the same desk with the group icon; this was the odd one out. */}
                      {company || isPool || folded ? (
                        <Icon
                          name={company ? 'building' : 'users'}
                          style="solid"
                          className="h-2.5 w-2.5"
                        />
                      ) : (
                        initials(who)
                      )}
                    </i>
                    <span className="truncate">
                      {who}
                      {login && <span className="ml-1 text-gray-400">({login})</span>}
                    </span>
                  </span>
                )}
                {/* A folded entry's own movement codes describe hand-offs inside the firm, so
                    only the span is shown; a single step keeps its outcome. */}
                {folded && endsAt ? (
                  <span className="tabular-nums text-gray-400">
                    {formatDay(start)} {formatTime(start)} – {formatDay(endsAt)}{' '}
                    {formatTime(endsAt)}
                  </span>
                ) : (
                  movement && (
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                        returned || cancelled
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700',
                      )}
                    >
                      <Icon
                        name={returned || cancelled ? 'arrow-turn-up' : 'arrow-right'}
                        style="solid"
                        className="h-2 w-2"
                        aria-hidden
                      />
                      {t(movement)}
                    </span>
                  )
                )}
              </div>

              {/* The firm's own steps, on request. Each keeps the individual who did it — the
                  name the fold deliberately hides at the top level — and its own direction, so a
                  return inside the firm is as visible here as one between firm and bank. */}
              {folded && legOpen && (
                <ol className="mt-2 space-y-1.5 border-l border-dashed border-blue-200 pl-3">
                  {entry.items.map((step, stepIdx) => {
                    const stepDir = directionOf(step);
                    const stepBack = stepDir === 'back' || stepDir === 'cancel';
                    /**
                     * The date, but only when it changes.
                     *
                     * A folded leg can span weeks — the header prints the range — while the steps
                     * inside it showed a bare "10:09", so a step three days after the one above it
                     * read as three minutes after. Repeating the date on every row would drown the
                     * times, so it appears on the first step and on each row that opens a new day,
                     * which is how the outer timeline already marks day boundaries.
                     */
                    const stepDay =
                      stepIdx === 0 ||
                      dayOf(entry.items[stepIdx - 1].startDate) !== dayOf(step.startDate)
                        ? formatDay(step.startDate)
                        : null;
                    return (
                      <li
                        key={`${step.sequenceNo}-${step.startDate}`}
                        className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-gray-500"
                      >
                        <span className="tabular-nums text-gray-400">
                          {stepDay && <span className="mr-1 text-gray-400">{stepDay}</span>}
                          {formatTime(step.startDate)}
                        </span>
                        <span className="font-medium text-gray-700">{step.activityName}</span>
                        {(() => {
                          const stepPool = isPoolAssignee(step.assignedType)
                            ? poolLabel(step.assignedTo)
                            : null;
                          const stepWho = step.assignedToDisplayName || stepPool || step.assignedTo;
                          const stepLogin = stepPool
                            ? null
                            : loginCode(step.assignedTo, step.assignedToDisplayName);
                          return (
                            stepWho && (
                              <span className="truncate">
                                · {stepWho}
                                {stepLogin && (
                                  <span className="ml-1 text-gray-400">({stepLogin})</span>
                                )}
                              </span>
                            )
                          );
                        })()}
                        {stepBack && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 text-[10px] font-medium text-amber-800">
                            <Icon
                              name="arrow-turn-up"
                              style="solid"
                              className="h-1.5 w-1.5"
                              aria-hidden
                            />
                            {t('activityTracking.brief.log.returned')}
                          </span>
                        )}
                        {step.remark && <span className="w-full text-gray-500">{step.remark}</span>}
                      </li>
                    );
                  })}
                </ol>
              )}

              {/* Spelled out, not hidden behind an icon. Why a step came back is the most useful
                  thing in this whole list, and the table made it a tooltip. */}
              {item.remark && (
                <p className="mt-1.5 border-l-2 border-gray-200 bg-gray-50 py-1.5 pl-2.5 pr-2 text-xs text-gray-600">
                  {item.remark}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {entries.length > collapseAfter && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-teal-800"
        >
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            style="solid"
            className="h-2.5 w-2.5"
          />
          {expanded
            ? t('activityTracking.brief.log.showLess')
            : t('activityTracking.brief.log.showAll', { count: entries.length })}
        </button>
      )}
    </div>
  );
};

export default ActivityTimeline;
