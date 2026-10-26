import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLockTask } from '@/features/task/api';
import Badge, { type BadgeTone } from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import type { AppraisalSummaryDto, CompanyQuotationItemDto } from '../schemas/quotation';
import { getActivityConfig } from '@/features/task/config/activityConfig';
import { formatCurrency } from '@/shared/utils/formatUtils';
import { itemNetFee } from '../utils/itemNetFee';

interface AssignmentResultSummaryProps {
  appraisals: AppraisalSummaryDto[];
  /** Winning company's per-appraisal items — source of the net fee column. */
  winnerItems: CompanyQuotationItemDto[];
  /** Who may open the appraisal-assignment task: only admins; everyone else just reads the result. */
  canOpenAdministration: boolean;
}

/** Assignment statuses that mean someone has since assigned the appraisal (Pending is the only open one). */
const ASSIGNED_STATUSES = ['Assigned', 'InProgress', 'UnderReview', 'Verified', 'Completed'];

const TONE: Record<string, BadgeTone> = {
  Assigned: 'green',
  AssignedElsewhere: 'green',
  Failed: 'red',
  Parked: 'yellow',
  Returned: 'yellow',
  Skipped: 'gray',
};

/** Literal keys, so tsc catches a renamed or removed one; an unknown outcome shows its raw name. */
const OUTCOME_KEYS = {
  Assigned: 'assignSummary.outcomes.Assigned',
  AssignedElsewhere: 'assignSummary.outcomes.AssignedElsewhere',
  Failed: 'assignSummary.outcomes.Failed',
  Parked: 'assignSummary.outcomes.Parked',
  Returned: 'assignSummary.outcomes.Returned',
  Skipped: 'assignSummary.outcomes.Skipped',
} as const;
// hasOwnProperty, not `in` (it would accept 'constructor'); the ES2020 lib has no Object.hasOwn.
const isOutcomeKey = (outcome: string): outcome is keyof typeof OUTCOME_KEYS =>
  Object.prototype.hasOwnProperty.call(OUTCOME_KEYS, outcome);

/** Outcomes whose live state replaced the stored result, so the stored message would contradict them. */
const NOTE_KEYS = {
  AssignedElsewhere: 'assignSummary.assignedElsewhere',
  Returned: 'assignSummary.returnedNote',
} as const;

/**
 * Literal keys per reason code the backend stores next to the outcome (classifier and handler
 * codes). A null or unknown code shows the stored message instead.
 */
const REASON_KEYS = {
  deleted: 'assignSummary.reasons.deleted',
  workflowEnded: 'assignSummary.reasons.workflowEnded',
  noAssignment: 'assignSummary.reasons.noAssignment',
  notPending: 'assignSummary.reasons.notPending',
  assignmentNotReset: 'assignSummary.reasons.assignmentNotReset',
  constructionInspection: 'assignSummary.reasons.constructionInspection',
  notAtAssignment: 'assignSummary.reasons.notAtAssignment',
  taskHeld: 'assignSummary.reasons.taskHeld',
  documentFollowupOpen: 'assignSummary.reasons.documentFollowupOpen',
  winnerUnavailable: 'assignSummary.reasons.winnerUnavailable',
  unpriced: 'assignSummary.reasons.unpriced',
  feeBaseMissing: 'assignSummary.reasons.feeBaseMissing',
  stopped: 'assignSummary.reasons.stopped',
  unexpectedStop: 'assignSummary.reasons.unexpectedStop',
  stateUnreadable: 'assignSummary.reasons.stateUnreadable',
  staffIneligible: 'assignSummary.reasons.staffIneligible',
  staffValidationFailed: 'assignSummary.reasons.staffValidationFailed',
  assignRejected: 'assignSummary.reasons.assignRejected',
  assignFailed: 'assignSummary.reasons.assignFailed',
  noMatch: 'assignSummary.reasons.noMatch',
  workflowElsewhere: 'assignSummary.reasons.workflowElsewhere',
  unverified: 'assignSummary.reasons.unverified',
} as const;
const isReasonCode = (code: string): code is keyof typeof REASON_KEYS =>
  Object.prototype.hasOwnProperty.call(REASON_KEYS, code);

/**
 * The stored result is a snapshot from Finalize time. A Failed/Parked appraisal whose assignment has
 * since moved to an assigned status was assigned by hand, so the live state wins over the snapshot.
 * It must also have left appraisal-assignment: a no-match bounce leaves the workflow right back there
 * and still needs action. Anything else (Rejected, Cancelled, null, unknown) keeps the stored result,
 * and so does Skipped. The reverse also happens: a stored Assigned appraisal that is back at
 * appraisal-assignment with a task (routed back since) is "Returned". So is a Skipped one, but only
 * when it was skipped because the assignment was not pending: the other Skipped codes (deleted,
 * ended, noAssignment) are not "came back" cases, and noAssignment can be stored for an appraisal
 * that never left appraisal-assignment.
 */
const outcomeOf = (a: AppraisalSummaryDto): string | null => {
  const stored = a.autoAssignResult;
  if (!stored) return null;
  const atAssignment = a.currentActivityId === 'appraisal-assignment';
  if (
    (stored === 'Assigned' || (stored === 'Skipped' && a.autoAssignReasonCode === 'notPending')) &&
    atAssignment &&
    a.assignmentTaskId
  ) {
    return 'Returned';
  }
  const assignedByHand =
    (stored === 'Failed' || stored === 'Parked') &&
    a.assignmentStatus != null &&
    ASSIGNED_STATUSES.includes(a.assignmentStatus) &&
    !atAssignment;
  return assignedByHand ? 'AssignedElsewhere' : stored;
};

/**
 * Per-appraisal outcome of "assign every appraisal right after finalize", shown on the Finalized
 * quotation. Renders nothing for quotations finalized before auto-assign existed.
 */
const AssignmentResultSummary = ({
  appraisals,
  winnerItems,
  canOpenAdministration,
}: AssignmentResultSummaryProps) => {
  const { t } = useTranslation('quotation');
  const navigate = useNavigate();
  const { mutate: lockTask, isPending: isLocking } = useLockTask();

  // appraisal-assignment is a pool task: lock it first, then open it, as the pool task list does.
  // lockedTaskId lets the opening page release the lock if opening fails. The lock endpoint answers
  // 409 { message: "Task is locked by x" } when someone else holds the task: say so and stay put.
  // Any other refusal (400: not a pool task because it is assigned to a person, not found, not a
  // pool member, ...) leaves nothing of ours to release, so go to the opening page without
  // lockedTaskId and let OpenTask decide access and show its own error.
  // landOn: the task's default page is Request Information, so ask the opening page for the Administration tab.
  const openAdministration = (taskId: string) =>
    lockTask(taskId, {
      onSuccess: () =>
        navigate(`/tasks/${taskId}/opening`, {
          state: { lockedTaskId: taskId, landOn: 'administration' },
        }),
      onError: (err: unknown) => {
        if (isAxiosError<{ message?: string }>(err) && err.response?.status === 409) {
          toast.error(err.response.data?.message?.trim() || t('assignSummary.lockFailed'));
          return;
        }
        navigate(`/tasks/${taskId}/opening`, { state: { landOn: 'administration' } });
      },
    });

  const rows = appraisals
    .map(a => ({ appraisal: a, outcome: outcomeOf(a) }))
    .filter((r): r is { appraisal: AppraisalSummaryDto; outcome: string } => r.outcome !== null);
  if (rows.length === 0) return null;

  const count = (...outcomes: string[]) => rows.filter(r => outcomes.includes(r.outcome)).length;
  const stats = [
    {
      label: t('assignSummary.stats.assigned'),
      value: count('Assigned', 'AssignedElsewhere'),
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: t('assignSummary.stats.failed'),
      value: count('Failed'),
      color: 'text-(--palette-danger)',
    },
    {
      label: t('assignSummary.stats.parked'),
      value: count('Parked'),
      color: 'text-amber-600 dark:text-amber-400',
    },
    ...(count('Returned') > 0
      ? [
          {
            label: t('assignSummary.stats.returned'),
            value: count('Returned'),
            color: 'text-amber-600 dark:text-amber-400',
          },
        ]
      : []),
    ...(count('Skipped') > 0
      ? [
          {
            label: t('assignSummary.stats.skipped'),
            value: count('Skipped'),
            color: 'text-(--palette-gray-600)',
          },
        ]
      : []),
  ];

  const feeFor = (appraisalId: string) => {
    const item = winnerItems.find(i => i.appraisalId === appraisalId);
    return item ? itemNetFee(item) : null;
  };

  // assignRejected carries the backend's own detail, so it follows the translated prefix.
  // workflowElsewhere does not: its snapshot names an activity id that can contradict "Now at".
  const reasonText = (a: AppraisalSummaryDto) => {
    const code = a.autoAssignReasonCode;
    if (!code || !isReasonCode(code)) return a.autoAssignMessage;
    const text = t(REASON_KEYS[code]);
    return code === 'assignRejected' && a.autoAssignMessage
      ? `${text}: ${a.autoAssignMessage}`
      : text;
  };

  const methodLabel = (method: string | null | undefined) => {
    switch (method?.toLowerCase()) {
      case 'roundrobin':
        return t('finalize.autoAssign.roundRobin');
      case 'manual':
        return t('finalize.autoAssign.manual');
      default:
        return method ?? null;
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-green-100 dark:border-green-500/20 px-4 py-3">
      <h3 className="text-sm font-semibold text-(--palette-ink)">{t('assignSummary.title')}</h3>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2.5">
        {stats.map(s => (
          <div
            key={s.label}
            className="flex flex-col rounded-lg border border-(--palette-line) px-3 py-2"
          >
            <span className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</span>
            <span className="text-xs text-(--palette-gray-500)">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-(--palette-line)">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-(--palette-line) bg-(--palette-surface-2) text-left text-xs font-semibold text-(--palette-gray-600)">
              <th className="px-3 py-2">{t('finalize.appraisal')}</th>
              <th className="px-3 py-2">{t('assignSummary.columns.result')}</th>
              <th className="px-3 py-2">{t('assignSummary.columns.currentActivity')}</th>
              <th className="px-3 py-2">{t('finalize.autoAssign.followup')}</th>
              <th className="px-3 py-2 text-right">{t('assignSummary.columns.netFee')}</th>
              <th className="px-3 py-2">{t('assignSummary.columns.note')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-(--palette-line-soft)">
            {rows.map(({ appraisal: a, outcome }) => {
              const method = methodLabel(a.followupMethod);
              const fee = feeFor(a.appraisalId);
              const noteKey =
                outcome === 'AssignedElsewhere' || outcome === 'Returned'
                  ? NOTE_KEYS[outcome]
                  : null;
              return (
                <tr key={a.appraisalId} className="align-top">
                  <td className="px-3 py-2 font-medium text-(--palette-ink)">
                    {a.appraisalNumber?.trim() || a.appraisalId.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge size="sm" tone={TONE[outcome] ?? 'gray'} className="whitespace-nowrap">
                      {isOutcomeKey(outcome) ? t(OUTCOME_KEYS[outcome]) : outcome}
                    </Badge>
                  </td>
                  <td
                    className="px-3 py-2 text-xs text-(--palette-gray-600)"
                    title={a.currentActivityId ?? undefined}
                  >
                    {a.currentActivityId ? (
                      (getActivityConfig(a.currentActivityId)?.title ?? a.currentActivityId)
                    ) : (
                      <span className="text-(--palette-gray-400)">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {a.followupStaffName ? (
                      <>
                        {a.followupStaffName}
                        {method && (
                          <span className="block text-xs text-(--palette-gray-500)">{method}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-(--palette-gray-400)">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fee != null ? (
                      formatCurrency(fee)
                    ) : (
                      <span className="text-(--palette-gray-400)">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-(--palette-gray-500)">
                    {/* The cap sits on a div: Firefox ignores max-width on table cells. */}
                    <div className="max-w-[18rem]">
                      {noteKey
                        ? t(noteKey)
                        : (reasonText(a) ?? <span className="text-(--palette-gray-400)">—</span>)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {/* Purely live: the task is open at appraisal-assignment, whatever the badge says. */}
                    {canOpenAdministration &&
                      a.currentActivityId === 'appraisal-assignment' &&
                      a.assignmentTaskId && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={isLocking}
                          onClick={() => openAdministration(a.assignmentTaskId!)}
                        >
                          {t('assignSummary.openAdministration')}
                        </Button>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignmentResultSummary;
