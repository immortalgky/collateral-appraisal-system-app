import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import type { ActivityLogItemDto, PhaseStepDto } from '@/features/appraisal/api/workflow';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { phaseLabel } from '../phaseLabels';
import { useTranslation } from 'react-i18next';
import { committeeName } from '../committeeNames';
import { isPoolAssignee, loginCode, poolLabel } from '../assigneeLabels';
import type { BriefExternalCompany, BriefMeeting } from '../api/appraisalBrief';

/**
 * The workflow phases as a vertical rail.
 *
 * Vertical rather than the horizontal track used elsewhere because this one is the page's
 * spine: it sits in its own column and stays put while the detail scrolls, so "where is this
 * and who has it" is answerable at any scroll position rather than only at the top.
 *
 * Phase level only — no SLA clock and no internal remark. Those belong to the appraisal team,
 * and this panel is read by people outside it.
 */
interface ProgressSpineProps {
  steps: PhaseStepDto[];
  activityLog: ActivityLogItemDto[];
  /** The committee sitting, when the appraisal has been tabled. Replaces the name on Approval. */
  meeting?: BriefMeeting | null;
  /** Committee code stamped on approval — names the body when there was no meeting. */
  approvedByCommittee?: string | null;
  /** The outside firm, when the work went out. Supplies the contact shown under its name. */
  externalCompany?: BriefExternalCompany | null;
}

const initials = (name: string) =>
  name
    .replace(/^(นาย|นาง|นางสาว|บริษัท|บจก\.|คณะ)\s*/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p.charAt(0))
    .join('');

const shortDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

const ProgressSpine = ({
  steps,
  activityLog,
  meeting,
  approvedByCommittee,
  externalCompany,
}: ProgressSpineProps) => {
  const { t } = useTranslation('appraisal');
  const localizeCompanyName = useLocalizedCompanyName();

  // One log row per phase — the latest to have started. A phase can carry several rows after a
  // reassignment, and the holder a reader cares about is the current one.
  const byGroup = new Map<string, ActivityLogItemDto>();
  for (const item of activityLog) {
    if (item.group) byGroup.set(item.group, item);
  }

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const log = step.group ? byGroup.get(step.group) : undefined;
        const isLast = i === steps.length - 1;
        const done = step.status === 'Completed';
        const current = step.status === 'Current';
        const cancelled = step.status === 'Cancelled';
        const when = done || cancelled ? shortDate(log?.endDate) : shortDate(log?.startDate);

        /**
         * Who the phase names, which is not the same question in every phase.
         *
         * - Execution done by an outside firm: the FIRM. Credit deals with the panel firm, not
         *   with whichever of its staff happened to key the book in, and the individual's name is
         *   the appraisal side's business anyway.
         * - Approval: the committee SITTING, not a member of it. "ขออนุมัติราคาประเมิน ครั้งที่
         *   53/2569" tells the reader when a decision is due; a secretary's name does not.
         * - Everything else: the bank staff member holding it.
         */
        const company = log?.companyName
          ? localizeCompanyName(log.companyName, log.companyNameLocal)
          : null;
        const isApproval = step.group === 'Approval';
        const committee = isApproval ? committeeName(t, approvedByCommittee) : null;

        /**
         * The approval step names the BODY, not a member of it, and prefers the committee to the
         * sitting: "คณะกรรมการ" is what a credit officer recognises, where a meeting number is an
         * internal reference. The sitting and its date drop to the second line.
         */
        /**
         * A pool row is a DESK, not a person. GetTaskHistory only resolves a display name for
         * AssignedType '1', so a pool falls through to the raw assignee — which carries
         * PoolAssigneeSelector's ":Team_<teamId>" suffix and printed a GUID on the rail. Trimmed to
         * the group name, which is what a credit officer recognises.
         */
        const isPool = isPoolAssignee(log?.assignedType);
        const poolName = isPool ? poolLabel(log?.assignedTo) : null;

        const who = isApproval
          ? committee?.short ||
            meeting?.title ||
            log?.assignedToDisplayName ||
            poolName ||
            log?.assignedTo ||
            null
          : company || log?.assignedToDisplayName || poolName || log?.assignedTo || null;

        // The login, for a named person only — a pool name is already a code, a firm has none.
        const login =
          company || isApproval || isPool
            ? null
            : loginCode(log?.assignedTo, log?.assignedToDisplayName);

        /**
         * Under an outside firm, the firm's ADMIN and its number — not the appraiser who did the
         * work. The appraiser is out on site and is the appraisal side's business anyway; the
         * admin is who answers "where is this".
         */
        const externalContact =
          externalCompany?.adminName ||
          externalCompany?.phone ||
          externalCompany?.adminPhone ||
          null;
        const sub = isApproval
          ? [meeting?.title, shortDate(meeting?.startAt ?? null)].filter(Boolean).join(' · ') ||
            null
          : company
            ? externalContact
            : null;

        const isOrg = isApproval
          ? !!(committee || meeting?.title)
          : !!company || (isPool && !!poolName);

        /**
         * A phase the work has not reached yet names nobody.
         *
         * The log can already carry a row for it — a task is created the moment the step is
         * queued, before anyone picks it up — so a greyed-out "ยังไม่ถึง" step was still printing
         * a name underneath, which reads as "this person has it" when they do not. Only the
         * phases that have happened (or are happening) say who.
         */
        const reached = done || current || cancelled;
        // The full committee name runs about four times the rail's width; the tooltip carries it
        // so the visible text can stay short instead of ending in an ellipsis.
        const whoTitle = isApproval
          ? committee?.full || meeting?.title || undefined
          : who || undefined;

        return (
          <li key={`${step.group}-${i}`} className="relative pb-6 pl-10 last:pb-0">
            {!isLast && (
              <span
                className={clsx(
                  // Centred on the marker: the circle is w-6 at left-0, so its axis is 12px; a w-1 rail
                  // therefore starts at 10px. left-[11px] put it a pixel right of centre.
                  'absolute bottom-[-4px] left-[10px] top-7 w-1 rounded-full',
                  done && 'bg-primary',
                  current && 'bg-gradient-to-b from-primary to-gray-200',
                  !done && !current && 'bg-gray-200',
                )}
              />
            )}
            <span
              className={clsx(
                'absolute left-0 top-0 grid h-6 w-6 place-items-center rounded-full ring-4 ring-white',
                done && 'bg-primary text-white',
                current && 'bg-white ring-primary/20 outline outline-2 outline-primary',
                cancelled && 'bg-red-600 text-white',
                !done && !current && !cancelled && 'bg-gray-200',
              )}
            >
              {done && <Icon name="check" style="solid" className="h-3 w-3" />}
              {cancelled && <Icon name="xmark" style="solid" className="h-3 w-3" />}
              {current && <span className="h-2 w-2 rounded-full bg-primary" />}
              {!done && !current && !cancelled && (
                <span className="h-2 w-2 rounded-full bg-gray-400" />
              )}
            </span>

            <span
              className={clsx(
                'block text-sm font-semibold leading-tight',
                done && 'text-gray-900',
                current && 'text-primary',
                cancelled && 'text-red-600',
                !done && !current && !cancelled && 'text-gray-400',
              )}
            >
              {phaseLabel(t, step.group) ?? step.group}
            </span>
            <span className="mt-0.5 block text-xs text-gray-400">
              {/* The STEP's status decides the wording; the date only fills it in.

                  A queued task stamps a start date before anyone has touched it, so an unreached
                  step must not print one — but the converse was worse: a step the rail had already
                  ticked green fell through to "ยังไม่ถึง" whenever it had no activity-log row,
                  which happens when the phase completed without leaving one (the log is joined by
                  activity id, and not every activity maps to a phase). The result was a green
                  check over the words "not yet reached" in the same block. `steps` is the
                  authority on where the work is; the log only supplies the date. */}
              {when && reached
                ? when
                : done
                  ? t('activityTracking.brief.phases.completed')
                  : cancelled
                    ? t('activityTracking.brief.phases.cancelled')
                    : current
                      ? t('activityTracking.brief.phases.inProgress')
                      : t('activityTracking.brief.phases.notReached')}
            </span>
            {reached && who && (
              <span className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-600">
                <i
                  className={clsx(
                    'grid h-5 w-5 flex-none place-items-center rounded-full text-[9px] font-bold not-italic',
                    done ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {/* A firm or a committee is not a person — initials would read as one. */}
                  {isOrg ? (
                    <Icon
                      name={isApproval ? 'gavel' : company ? 'building' : 'users'}
                      style="solid"
                      className="h-2.5 w-2.5"
                    />
                  ) : (
                    initials(who)
                  )}
                </i>
                <span className="min-w-0" title={whoTitle}>
                  <span className="block truncate">
                    {who}
                    {login && <span className="text-gray-400"> ({login})</span>}
                  </span>
                  {sub && (
                    <span className="block truncate text-gray-400" title={sub}>
                      {sub}
                    </span>
                  )}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default ProgressSpine;
