import { type TFunction } from 'i18next';
import { roundAwayFromZero, snap } from '@/shared/utils/decimalRounding';
import { type ActivityAction } from '@/features/appraisal/api/workflow';
import { getActivityConfig } from '@/features/task/config/activityConfig';
import {
  isTransientError,
  useGetApprovalHistory,
  useGetApprovalList,
  type GetApprovalListResponse,
} from '../../api/decisionSummary';

// Decision / committee-vote rules shared by DecisionSection, ApprovalListPanel and
// DecisionSummaryPage. Kept out of the component files so Fast Refresh can hot-swap them.

// ==================== Committee votes ====================

/** The workflow activity that runs the committee vote. */
export const COMMITTEE_ACTIVITY_ID = 'pending-approval';

/** Per-vote tally for a round — the API carries the roster, not the breakdown. */
export const countVotes = (data: GetApprovalListResponse | undefined, vote: string): number =>
  (data?.members ?? []).filter(
    m => m.status === 'Voted' && (m.vote ?? '').toLowerCase() === vote.toLowerCase(),
  ).length;

/** Display label for a vote value (approve → Agree, reject → Disagree); falls back as given. */
export const voteLabel = (t: TFunction<'appraisal'>, vote: string, fallback = vote): string =>
  t(`approvalListSection.voteLabels.${vote.toLowerCase()}`, { defaultValue: fallback });

// ==================== Decisions ====================

export const movementOf = (action: ActivityAction): string =>
  action.movement === 'B' || action.movement === 'C' ? action.movement : 'F';

/** The action lets the user pick who gets the next task (instead of system assignment). */
export const isManualAssignmentAction = (action: ActivityAction | null | undefined): boolean =>
  action?.assignmentMode === 'user' && !!action.targetActivityId;

/** A forward action with no target step at all (null or empty) is the last step of the workflow.
 *  A target that is set but not in the activity config (a system / routing node) is NOT an end:
 *  the work goes on, we just have no title for where. activityConfig has no end marker to tell the
 *  two apart, so "no target id" is the only signal we use. */
export const endsWorkflow = (action: ActivityAction): boolean =>
  movementOf(action) === 'F' && !action.targetActivityId;

/** Cancel / Route Back need a reason code from their parameter group; others have none. */
export const reasonGroupOf = (action: ActivityAction | null | undefined): string | null =>
  action?.movement === 'C' ? 'CancelReason' : action?.movement === 'B' ? 'RoutebackReason' : null;

/** Committee vote values the approval-list / actions APIs use. */
export const COMMITTEE_VOTE_VALUES = ['approve', 'reject', 'route_back'];
const DISSENTING_VOTES = ['reject', 'route_back'];

/** A Disagree / Route Back committee vote: it must carry a comment (the voter's own words). */
export const isDissentingVote = (
  activityId: string | undefined,
  decision: string | null,
): boolean =>
  activityId === COMMITTEE_ACTIVITY_ID && DISSENTING_VOTES.includes(decision?.toLowerCase() ?? '');

/** Decision kind from value/label keywords — drives both the card visual and the comment
 *  placeholder. Reject is tested before approve so "Disagree" / "Disapprove" never read as approve. */
function resolveDecisionKind(value: string | null, label: string | null): string {
  if (!value) return 'default';
  const k = `${value} ${label ?? ''}`.toLowerCase();
  if (/(reject|disagree|disapprove|decline|deny)/.test(k)) return 'reject';
  if (/(approve|agree|accept|confirm)/.test(k)) return 'approve';
  if (/(route.?back|send.?back|return)/.test(k)) return 'routeBack';
  if (/(proceed|forward|next|complete)/.test(k)) return 'proceed';
  if (/(hold|defer|pause)/.test(k)) return 'hold';
  return 'default';
}

/** Icon + color for an action. Committee votes are read by value (never guessed from the label),
 *  then movement B / C, then label keywords; falls back to gray + neutral icon. */
export const resolveActionKind = (action: ActivityAction): string => {
  if (COMMITTEE_VOTE_VALUES.includes(action.value.toLowerCase())) {
    return resolveDecisionKind(action.value, null);
  }
  if (action.movement === 'B') return 'routeBack';
  if (action.movement === 'C') return 'reject';
  return resolveDecisionKind(action.value, action.label);
};

/** Same user, ignoring case: user ids reach the decision page through different backend paths (the
 *  task draft, the eligible-staff list, the completion response) and do not agree on casing. */
export const sameUser = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** The success animation a completed activity gets (ActivitySubmitLiftoff). */
export type LiftoffScene = 'forward' | 'routeBack' | 'cancel' | 'approve' | 'reject' | 'final';

const VOTE_SCENES: Record<string, LiftoffScene> = {
  approve: 'approve',
  reject: 'reject',
  route_back: 'routeBack',
};

/** Committee only, what this vote did to the round: `pending` = the work is still on the committee
 *  step (waiting on other members), `moved` = the round closed and the work left it (to another
 *  step, or none reported), `ended` = the workflow completed. */
export type LiftoffVoteOutcome = 'pending' | 'moved' | 'ended';

/** Committee votes are read by value and stamped; every other activity by movement (route back /
 *  cancel, which win over completion because a cancel ends the workflow), then "final" once the
 *  workflow has completed, else forward. No label keywords: outside the committee no action
 *  carries an approve / reject value. `voteOutcome` is null outside the committee. */
export const resolveLiftoff = ({
  action,
  activityId,
  isCompleted,
  nextActivityId,
}: {
  action: ActivityAction | null | undefined;
  activityId: string | undefined;
  isCompleted: boolean;
  nextActivityId: string | null | undefined;
}): { scene: LiftoffScene; voteOutcome: LiftoffVoteOutcome | null } => {
  if (activityId === COMMITTEE_ACTIVITY_ID) {
    // Only "still on the committee step" is an open round; any other result (a different step, or
    // none reported) means the round closed. By the backend's rules an approve vote closes the
    // round only once its condition is met, a reject vote never does (it stays `pending`), and a
    // single route_back vote closes it at once, so route_back + a different step is a live path.
    const stillOpen = nextActivityId === activityId;
    return {
      scene: VOTE_SCENES[action?.value.toLowerCase() ?? ''] ?? 'forward',
      voteOutcome: isCompleted ? 'ended' : stillOpen ? 'pending' : 'moved',
    };
  }
  const movement = action ? movementOf(action) : 'F';
  if (movement === 'B') return { scene: 'routeBack', voteOutcome: null };
  if (movement === 'C') return { scene: 'cancel', voteOutcome: null };
  return { scene: isCompleted ? 'final' : 'forward', voteOutcome: null };
};

/** Committee actions read as votes (Agree / Disagree / Route Back); everything else as-is. */
export const decisionDisplayLabel = (
  t: TFunction<'appraisal'>,
  activityId: string | undefined,
  action: ActivityAction,
): string =>
  activityId === COMMITTEE_ACTIVITY_ID ? voteLabel(t, action.value, action.label) : action.label;

/** English title from the task activity config (no translated names exist yet); null for
 *  targets it doesn't know (end / system nodes), so a raw activity id is never shown. */
export const activityTitle = (activityId: string | null): string | null =>
  (activityId && getActivityConfig(activityId)?.title) || null;

/** Does a task-history row belong to the step with this title? History rows do not carry the
 *  activity id: `taskName` is a code ("InitiationCheck") and `taskDescription` is the readable
 *  name ("Appraisal Initiation Check"), which is what `activityTitle` returns. So compare the
 *  description (the name when there is none) with the title, ignoring case and outer spaces. */
export const stepHasTitle = (
  step: { taskDescription: string | null; stepName: string },
  title: string | null,
): boolean => {
  const norm = (s: string) => s.trim().toLowerCase();
  const name = step.taskDescription || step.stepName;
  return !!title && !!name && norm(name) === norm(title);
};

/** The current step of a history list: the LAST in-progress row. The one definition shared by the
 *  header chip and the timeline (its "here" tag, flowing connector and ghost row). Written as a
 *  loop because Array.prototype.findLast is ES2023 and the project's lib stops at ES2020. */
export const currentStepOf = <T extends { status: string }>(steps: T[]): T | undefined => {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    if (steps[i].status === 'in_progress') return steps[i];
  }
  return undefined;
};

/** Where the work ends up: the target step's title, or "Ends the workflow" for a cancel with no
 *  known target step. */
export const destinationName = (t: TFunction<'appraisal'>, action: ActivityAction): string | null =>
  activityTitle(action.targetActivityId) ??
  (movementOf(action) === 'C' ? t('decision.destination.cancel') : null);

/** "Goes to X" / "Returns to X" / "Ends the workflow"; null when the target is unknown. */
export const destinationText = (
  t: TFunction<'appraisal'>,
  action: ActivityAction,
): string | null => {
  const movement = movementOf(action);
  const name = activityTitle(action.targetActivityId);
  if (!name) return movement === 'C' ? t('decision.destination.cancel') : null;
  return t(movement === 'B' ? 'decision.destination.back' : 'decision.destination.forward', {
    name,
  });
};

// ==================== Data ====================

interface UseCommitteeApprovalArgs {
  /** The live committee section is allowed on this screen (section config). History for a
   *  finished appraisal is always shown when it exists. */
  enabled: boolean;
  /** Appraisal has reached a terminal status (completed / cancelled / migrated). */
  isTerminal: boolean;
  appraisalId: string | undefined;
  workflowInstanceId: string | undefined;
  /** The activity the workflow is currently on (live round only exists at the committee step). */
  activityId: string | undefined;
  /** Stop polling the live round, keeping what is shown (the viewer's vote was just submitted). */
  paused?: boolean;
}

/**
 * Committee votes for the Decision section. Ongoing and finished appraisals read from different
 * endpoints, so the source is picked by status (never both — a finished appraisal used to show a
 * "not active yet" placeholder next to its real history):
 *   - ongoing:  live approval-list, polled until the round resolves; only at the committee step
 *   - terminal: immutable approval-history; 404 (cancelled before the committee) hides the panel
 * `data` is undefined while loading and on any error. History renders only once it exists, so a
 * 404 never flashes an empty panel; the live round reports loading / failure so a voter can tell
 * the tally is missing.
 */
export const useCommitteeApproval = ({
  enabled,
  isTerminal,
  appraisalId,
  workflowInstanceId,
  activityId,
  paused = false,
}: UseCommitteeApprovalArgs) => {
  const liveEnabled = enabled && !isTerminal && activityId === COMMITTEE_ACTIVITY_ID;
  const live = useGetApprovalList(
    liveEnabled ? workflowInstanceId : undefined,
    COMMITTEE_ACTIVITY_ID,
    paused,
  );
  const history = useGetApprovalHistory(
    isTerminal ? appraisalId : undefined,
    COMMITTEE_ACTIVITY_ID,
  );
  const query = isTerminal ? history : live;
  // Loading / error only matter for the live round: a finished appraisal's 404 just means no votes.
  return {
    data: query.data,
    liveLoading: !isTerminal && live.isLoading,
    // A 4xx (not a member, no round yet) hides the panel like before; only an outage is shown.
    liveFailed: !isTerminal && live.isError && isTransientError(live.error),
  };
};

// ==================== Force Selling Price (Review) ====================

const round1000 = (v: number) => roundAwayFromZero(v, 1000);

/**
 * The derived "Force Selling Price (Review)" for a typed Total Appraisal Price (Review).
 *
 * Non-block: the effective rate % of the reviewed total. Block: the rate already went into each
 * unit's price, so the forced sale scales in proportion to the unit sums (the backend's rule),
 * reviewed x (unit forced sale / unit appraisal total), or the resolved rate when there is no
 * unit total to take a ratio of. Rounded to the nearest 1,000, except that the unit total itself
 * returns the unit forced sale exactly.
 */
export const deriveForceSellingPriceReview = ({
  reviewedTotal,
  isBlock,
  unitTotal,
  unitForceSellingPrice,
  blockRate,
  effectiveRate,
}: {
  reviewedTotal: number | null | undefined;
  isBlock: boolean;
  unitTotal: number | null | undefined;
  unitForceSellingPrice: number | null | undefined;
  blockRate: number | null | undefined;
  effectiveRate: number | null | undefined;
}): number | null => {
  if (reviewedTotal == null) return null;
  if (!isBlock) {
    return effectiveRate != null ? round1000(snap(reviewedTotal * effectiveRate) / 100) : null;
  }
  if (unitTotal != null && unitTotal > 0 && unitForceSellingPrice != null) {
    // The unit total itself: the unit sum exactly, not re-rounded (the backend does the same).
    if (reviewedTotal === unitTotal) return unitForceSellingPrice;
    return round1000(snap((reviewedTotal * unitForceSellingPrice) / unitTotal));
  }
  return blockRate != null ? round1000(snap(reviewedTotal * blockRate) / 100) : null;
};
