import { type TFunction } from 'i18next';
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

/** Cancel / Route Back need a reason code from their parameter group; others have none. */
export const reasonGroupOf = (action: ActivityAction | null | undefined): string | null =>
  action?.movement === 'C' ? 'CancelReason' : action?.movement === 'B' ? 'RoutebackReason' : null;

/** Committee vote values the approval-list / actions APIs use. */
export const COMMITTEE_VOTE_VALUES = ['approve', 'reject', 'route_back'];
const DISSENTING_VOTES = ['reject', 'route_back'];

/** A Disagree / Route Back committee vote: it must carry a comment and be ticked in the confirm
 *  dialog — these are the costly mis-clicks. */
export const isDissentingVote = (
  activityId: string | undefined,
  decision: string | null,
): boolean =>
  activityId === COMMITTEE_ACTIVITY_ID && DISSENTING_VOTES.includes(decision?.toLowerCase() ?? '');

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
}: UseCommitteeApprovalArgs) => {
  const liveEnabled = enabled && !isTerminal && activityId === COMMITTEE_ACTIVITY_ID;
  const live = useGetApprovalList(
    liveEnabled ? workflowInstanceId : undefined,
    COMMITTEE_ACTIVITY_ID,
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
