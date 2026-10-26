import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import Dropdown from '@/shared/components/inputs/Dropdown';
import Textarea from '@/shared/components/inputs/Textarea';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import {
  useActivityId,
  useIsTaskOwner,
  useWorkflowInstanceId,
} from '@/features/appraisal/context/AppraisalContext';
import {
  type ActivityAction,
  type TaskHistoryItem,
  useGetActivityActions,
  useGetTaskHistory,
} from '@/features/appraisal/api/workflow';
import { useGetEligibleStaff } from '@/features/appraisal/api/administration';
import { useParameterOptions } from '@/shared/utils/parameterUtils';
import ActivityTrackingTimeline, {
  type ActivityStep,
  type TimelineGhost,
  type TimelineReturnTo,
} from './ActivityTrackingTimeline';
import { ApprovalListPanel } from './ApprovalListPanel';
import {
  activityTitle,
  COMMITTEE_ACTIVITY_ID,
  countVotes,
  decisionDisplayLabel,
  destinationName,
  destinationText,
  endsWorkflow,
  isDissentingVote,
  isManualAssignmentAction,
  movementOf,
  reasonGroupOf,
  resolveActionKind,
  sameUser,
  currentStepOf,
  useCommitteeApproval,
} from './decisionHelpers';
import '@/styles/decisionSection.css';

// ==================== Decision tiles ====================

/** Where a decision sends the work, which is also its colour: forward teal, back amber, cancel red. */
type Tone = 'F' | 'B' | 'C';

const TONE_ICON: Record<Tone, string> = { F: 'arrow-right', B: 'rotate-left', C: 'ban' };
const TONE_GROUP: Record<Tone, 'forward' | 'back' | 'cancel'> = {
  F: 'forward',
  B: 'back',
  C: 'cancel',
};
const TONE_ORDER: Record<Tone, number> = { F: 0, B: 1, C: 2 };

/** Committee votes are coloured and iconned by what they are, not by the action's movement. */
const VOTE_TONE: Record<string, Tone> = { approve: 'F', reject: 'C', route_back: 'B' };
const VOTE_ICON: Record<string, string> = {
  approve: 'check',
  reject: 'xmark',
  route_back: 'rotate-left',
};

const toneOf = (action: ActivityAction, isCommittee: boolean): Tone => {
  const vote = isCommittee ? VOTE_TONE[action.value.toLowerCase()] : undefined;
  return vote ?? (movementOf(action) as Tone);
};

// ==================== Helpers ====================

/** Map a backend TaskHistoryItem to the timeline's ActivityStep shape. */
/** The holder clock, or the SLA anchor when talking to an API that predates it. */
const receivedAtOf = (item: TaskHistoryItem): string => item.assigneeAssignedAt ?? item.assignedAt;

const mapHistoryItemToStep = (item: TaskHistoryItem): ActivityStep => ({
  stepName: item.taskName,
  taskDescription: item.taskDescription,
  role: item.assignedType,
  assigneeName: item.assignedTo || null,
  assigneeDisplayName: item.assignedToDisplayName || null,
  startedAt: receivedAtOf(item),
  completedAt: item.completedAt,
  status: item.completedAt ? 'completed' : 'in_progress',
  movement: item.movement,
  remark: item.remark,
  timing: {
    receivedAt: receivedAtOf(item),
    stepEnteredAt: item.assignedAt,
    openedAt: item.openedAt ?? null,
    taskState: item.taskState ?? null,
    slaStartAt: item.slaStartAt ?? null,
    dueAt: item.dueAt ?? null,
    slaStatus: item.slaStatus ?? null,
    slaDurationHours: item.slaDurationHours ?? null,
  },
});

// ==================== Sub-components ====================

/** Native <details> block for the committee left column — each part folds on its own. */
const FoldSection = ({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) => (
  <details
    open={defaultOpen}
    className="group rounded-lg border border-(--palette-line) bg-(--palette-surface)"
  >
    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
      <span className="text-xs font-semibold uppercase tracking-wide text-(--palette-gray-600)">
        {title}
      </span>
      {summary && <span className="ml-auto text-xs text-(--palette-gray-500)">{summary}</span>}
      <Icon
        name="chevron-down"
        style="solid"
        className={clsx(
          'size-3 text-(--palette-gray-400) transition-transform group-open:rotate-180',
          !summary && 'ml-auto',
        )}
      />
    </summary>
    <div className="px-3 pb-3">{children}</div>
  </details>
);

interface DecisionTileProps {
  action: ActivityAction;
  tone: Tone;
  icon: string;
  /** Small caption above the label: the movement, or "Vote". */
  tag: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  /** Where the work goes, or the vote's effect on the tally. */
  detail: string | null;
}

/** The one radio group every tile belongs to (the wrapper in DecisionSection is its radiogroup). */
const TILE_GROUP_NAME = 'decision-choice';

/** A decision option: a native radio inside a tile, coloured by where it sends the work. All the
 *  tiles share one name, so they are a single radio group: one Tab stop, and the arrow keys walk
 *  through every option in order (Forward, Back, Cancel). */
const DecisionTile = ({
  action,
  tone,
  icon,
  tag,
  label,
  checked,
  onSelect,
  detail,
}: DecisionTileProps) => (
  <label className={clsx('dz-tile', `dz-tone-${tone}`)}>
    <input
      type="radio"
      name={TILE_GROUP_NAME}
      value={action.value}
      checked={checked}
      onChange={onSelect}
      // The tiles sit inside the page's <form>; Enter must not trigger its implicit submit.
      onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
      className="dz-tile-input"
    />
    <span className="dz-tile-ic">
      <Icon name={icon} style="solid" className="size-4" />
    </span>
    <span className="min-w-0">
      <span className="dz-tile-tag">{tag}</span>
      <span className="dz-tile-label">{label}</span>
      {detail && <span className="dz-tile-dest">{detail}</span>}
    </span>
    <span className="dz-tick" aria-hidden="true">
      <Icon name="check" style="solid" className="size-2.5" />
    </span>
  </label>
);

// ==================== Component ====================

interface DecisionSectionProps {
  selectedDecision: string | null;
  onDecisionChange: (value: string | null) => void;
  comments: string;
  onCommentsChange: (value: string) => void;
  selectedAssigneeUserId: string | null;
  onAssigneeChange: (userId: string | null) => void;
  selectedReasonCode: string | null;
  onReasonChange: (code: string | null) => void;
  // On the appraisal route the context has no workflow ids; the page resolves them
  // from workflow progress and passes them in so the activity timeline still loads.
  // Fall back to context (task route) when not provided.
  workflowInstanceId?: string;
  activityId?: string;
  /** The live committee votes are allowed on this screen (the page's section config); a
   *  finished appraisal's vote history shows regardless. */
  showCommitteeVotes: boolean;
  /** Appraisal is completed/cancelled — committee votes come from the immutable history. */
  isAppraisalTerminal: boolean;
  appraisalId?: string;
  /** The decision was just submitted and the page waits behind the success card: stop polling the
   *  committee round (its data stays on screen). */
  isSubmitted?: boolean;
}

const DecisionSection = ({
  selectedDecision,
  onDecisionChange,
  comments,
  onCommentsChange,
  selectedAssigneeUserId,
  onAssigneeChange,
  selectedReasonCode,
  onReasonChange,
  workflowInstanceId: workflowInstanceIdProp,
  activityId: activityIdProp,
  showCommitteeVotes,
  isAppraisalTerminal,
  appraisalId,
  isSubmitted = false,
}: DecisionSectionProps) => {
  const { t } = useTranslation('appraisal');
  const isPageReadOnly = usePageReadOnly();
  const isTaskOwner = useIsTaskOwner();
  const ctxWorkflowInstanceId = useWorkflowInstanceId();
  const ctxActivityId = useActivityId();
  const workflowInstanceId = workflowInstanceIdProp ?? ctxWorkflowInstanceId;
  const activityId = activityIdProp ?? ctxActivityId;
  const isCommitteeStep = activityId === COMMITTEE_ACTIVITY_ID;

  // Fetch available actions from workflow
  const { data: actionsData, isLoading: isActionsLoading } = useGetActivityActions(
    workflowInstanceId,
    activityId,
  );
  const actions = useMemo(() => actionsData?.actions ?? [], [actionsData]);

  // Fetch task history (completed + currently-pending) for the activity tracking timeline
  const { data: taskHistoryData, isLoading: isHistoryLoading } =
    useGetTaskHistory(workflowInstanceId);

  const committee = useCommitteeApproval({
    enabled: showCommitteeVotes,
    isTerminal: isAppraisalTerminal,
    appraisalId,
    workflowInstanceId,
    activityId,
    paused: isSubmitted,
  });

  const selectedAction = useMemo(
    () => actions.find(a => a.value === selectedDecision) ?? null,
    [actions, selectedDecision],
  );

  const isManualAssignment = isManualAssignmentAction(selectedAction);

  // Reason dropdown: only shown for Cancel (C) or Routeback (B) movements.
  // Hook must be called unconditionally — pass '' when no group so it returns [].
  const reasonGroup = reasonGroupOf(selectedAction);
  const reasonOptions = useParameterOptions(reasonGroup ?? '');

  const { data: eligibleStaff, isLoading: isStaffLoading } = useGetEligibleStaff(
    workflowInstanceId,
    selectedAction?.targetActivityId ?? '',
    isManualAssignment,
  );

  // Read-only if page is read-only OR user is not the task owner
  const isReadOnly = isPageReadOnly || !isTaskOwner;

  const historySteps = useMemo<ActivityStep[]>(
    () =>
      (taskHistoryData?.items ?? [])
        .slice()
        // assigneeAssignedAt, not assignedAt: a supervisor reassign freezes assignedAt across the
        // outgoing and incoming rows to keep the SLA clock running, so sorting on it ties.
        .sort((a, b) => new Date(receivedAtOf(a)).getTime() - new Date(receivedAtOf(b)).getTime())
        .map(mapHistoryItemToStep),
    [taskHistoryData],
  );

  // Route preview: where the picked decision sends the work, after the current step. Not for a
  // committee vote (one vote doesn't move the work: the round resolves on the backend) nor for a
  // read-only viewer. A route back is not a ghost row but the earlier step it returns to.
  const previewing = !isReadOnly && !isCommitteeStep;
  const pickedMovement = selectedAction ? movementOf(selectedAction) : null;
  const returnTo: TimelineReturnTo | null =
    previewing && selectedAction && pickedMovement === 'B'
      ? { title: activityTitle(selectedAction.targetActivityId) }
      : null;
  const assigneeName = eligibleStaff?.find(s => sameUser(s.id, selectedAssigneeUserId))?.name;
  const ghost: TimelineGhost | null = !previewing
    ? null
    : !selectedAction
      ? {
          tone: null,
          icon: 'arrow-right',
          title: t('decision.nextStep'),
          meta: t('decision.route.ghostIdle'),
        }
      : pickedMovement === 'C'
        ? {
            tone: 'C',
            icon: 'ban',
            title: t('decision.route.cancel'),
            meta: t('decision.route.cancelMeta'),
          }
        : endsWorkflow(selectedAction)
          ? {
              tone: 'F',
              icon: 'flag',
              title: t('decision.route.final'),
              meta: t('decision.route.finalMeta'),
            }
          : pickedMovement === 'F'
            ? {
                tone: 'F',
                icon: 'arrow-right',
                title: activityTitle(selectedAction.targetActivityId) ?? t('decision.nextStep'),
                meta: !isManualAssignment
                  ? null
                  : assigneeName
                    ? t('decision.route.assignee', { name: assigneeName })
                    : t('decision.route.assigneeMissing'),
                metaWarn: isManualAssignment && !assigneeName,
              }
            : null;

  const labelOf = (action: ActivityAction) => decisionDisplayLabel(t, activityId, action);
  const badgeLabel = selectedAction ? labelOf(selectedAction) : selectedDecision;

  const selectDecision = (value: string) => {
    // Clear stale assignee / reason when decision changes — the target activity and reason group
    // may differ, and a leftover code would be submitted with the new decision.
    onAssigneeChange(null);
    onReasonChange(null);
    // Drop a comment that is still just the old reason's auto-filled text; keep anything the
    // user wrote or edited.
    const autoFilled = reasonOptions.find(o => o.value === selectedReasonCode)?.label;
    if (autoFilled && comments === autoFilled) onCommentsChange('');
    onDecisionChange(value);
  };

  const commentRequired = isDissentingVote(activityId, selectedDecision);
  const placeholderKey = selectedAction ? resolveActionKind(selectedAction) : 'default';

  /** The tile's second line: where the work goes, or (committee) what the vote does to the round.
   *  The backend owns the outcome; this is only the projection. */
  const tileDetail = (action: ActivityAction): string | null => {
    if (!isCommitteeStep) {
      // No target step at all = the last step. A target we have no title for says nothing.
      if (endsWorkflow(action)) return t('decision.destination.final');
      return destinationText(t, action);
    }
    switch (action.value.toLowerCase()) {
      case 'approve': {
        // Projection only while the round is open: a resolved round's tally no longer moves.
        if (committee.data?.status !== 'Pending') return null;
        const from = countVotes(committee.data, 'approve');
        const to = from + 1;
        const minVotes = committee.data.conditions.find(c => c.conditionType === 'MinVotes');
        const need = minVotes?.minVotesRequired;
        if (need == null) return t('decision.voteImpact', { from, to });
        if (to < need) return t('decision.voteImpactShort', { from, to, left: need - to });
        // "Threshold met" claims the round would pass: only when no other condition (a required
        // role must still vote, ...) is outstanding. Otherwise just the count.
        const othersMet = committee.data.conditions.every(c => c === minVotes || c.met);
        return othersMet
          ? t('decision.voteImpactMet', { from, to })
          : t('decision.voteImpact', { from, to });
      }
      case 'route_back': {
        const name = activityTitle(action.targetActivityId);
        return name ? t('decision.voteBackNow', { name }) : t('decision.voteBackNowNoName');
      }
      case 'reject':
        return t('decision.voteNeedsReason');
      default:
        return null;
    }
  };

  const renderTile = (action: ActivityAction) => {
    const tone = toneOf(action, isCommitteeStep);
    return (
      <DecisionTile
        key={action.value}
        action={action}
        tone={tone}
        icon={(isCommitteeStep && VOTE_ICON[action.value.toLowerCase()]) || TONE_ICON[tone]}
        tag={isCommitteeStep ? t('decision.voteTag') : t(`decision.groups.${TONE_GROUP[tone]}`)}
        label={labelOf(action)}
        checked={selectedDecision === action.value}
        onSelect={() => selectDecision(action.value)}
        detail={tileDetail(action)}
      />
    );
  };
  // Decisions read forward, back, cancel (within a movement the backend's order stands: the sort is
  // stable). The committee's votes keep the backend's order.
  const orderOf = (action: ActivityAction) => TONE_ORDER[toneOf(action, false)];
  const ordered = isCommitteeStep ? actions : [...actions].sort((a, b) => orderOf(a) - orderOf(b));
  const tiles = ordered.map(renderTile);

  const renderTimeline = (heading?: string) =>
    isHistoryLoading ? (
      <div className="dz-hint flex items-center gap-2 text-sm py-4">
        <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin" />
        {t('decision.loadingActivity')}
      </div>
    ) : (
      <ActivityTrackingTimeline
        activities={historySteps}
        heading={heading}
        ghost={ghost}
        returnTo={returnTo}
      />
    );

  // The header chip: which step the work is on and what it is doing. Nothing to say on a finished
  // appraisal (read-only and terminal); a read-only viewer of a live one just sees the step. The
  // current step is the one the timeline marks ("here" tag, flowing connector, ghost row).
  const current = currentStepOf(historySteps);
  const stepTitle = current
    ? current.taskDescription || activityTitle(activityId ?? null) || current.stepName
    : activityTitle(activityId ?? null);
  const doing = isCommitteeStep ? t('decision.route.awaitingVote') : t('decision.route.inProgress');
  const nowChip = !stepTitle
    ? null
    : !isReadOnly
      ? `${stepTitle} · ${doing}`
      : isAppraisalTerminal
        ? null
        : stepTitle;

  return (
    <section className="dz" aria-labelledby="decision-section-title">
      <header className="dz-head">
        <Icon name="gavel" style="solid" className="dz-gavel size-3.5" />
        <h2 id="decision-section-title">{t('decision.sectionTitle')}</h2>
        {nowChip && <span className="dz-now">{nowChip}</span>}
      </header>
      <div className="dz-grid">
        {/* Left: the route preview. At the committee step (or when there are votes to show) the
            vote panel comes first, with the timeline folded below it. */}
        <div className="dz-left">
          {committee.data || committee.liveLoading || committee.liveFailed ? (
            <div className="space-y-3">
              <FoldSection
                title={t('decision.committeeVotes')}
                summary={
                  committee.data
                    ? t('decision.votesSummary', {
                        received: committee.data.votesReceived,
                        total: committee.data.totalMembers,
                      })
                    : undefined
                }
                defaultOpen
              >
                {committee.data ? (
                  <ApprovalListPanel data={committee.data} />
                ) : committee.liveFailed ? (
                  <p className="py-4 text-sm text-danger">{t('decision.votesLoadFailed')}</p>
                ) : (
                  <div className="flex justify-center py-6">
                    <Icon
                      name="spinner"
                      style="solid"
                      className="w-5 h-5 animate-spin text-(--palette-gray-400)"
                    />
                  </div>
                )}
              </FoldSection>
              <FoldSection
                title={t('decision.activityTracking')}
                summary={
                  taskHistoryData?.items
                    ? t('decision.stepsCount', { count: taskHistoryData.items.length })
                    : undefined
                }
              >
                {renderTimeline()}
              </FoldSection>
            </div>
          ) : (
            renderTimeline(t('decision.route.title'))
          )}
        </div>

        {/* Right: the decision tiles and the fields the pick needs */}
        <div className="dz-right">
          {isReadOnly ? (
            // Read-only view
            <div className="space-y-4">
              <div>
                <label className="dz-label block text-xs font-medium mb-1">
                  {t('decision.decisionLabel')}
                </label>
                {selectedDecision ? (
                  <Badge
                    type="vote"
                    value={
                      isCommitteeStep
                        ? selectedDecision
                        : (selectedAction?.label ?? selectedDecision)
                    }
                    size="md"
                  >
                    {badgeLabel}
                  </Badge>
                ) : (
                  <span className="dz-hint text-sm">{t('decision.noDecision')}</span>
                )}
              </div>
              {comments && (
                <div>
                  <label className="dz-label block text-xs font-medium mb-1">
                    {t('decision.commentsLabel')}
                  </label>
                  <p className="dz-label text-sm">{comments}</p>
                </div>
              )}
            </div>
          ) : isActionsLoading ? (
            <div className="dz-hint flex items-center gap-2 text-sm">
              <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin" />
              {t('decision.loadingActions')}
            </div>
          ) : actions.length === 0 ? (
            // Failed or empty actions query — say so instead of an empty required group.
            <p className="dz-hint text-sm">{t('decision.noActions')}</p>
          ) : (
            <>
              <div>
                <div id="decision-group-label" className="dz-kicker mb-2">
                  {isCommitteeStep ? t('decision.yourVote') : t('decision.decisionLabel')}
                  <span className="text-danger ml-0.5">*</span>
                </div>
                <div
                  role="radiogroup"
                  aria-required="true"
                  aria-labelledby="decision-group-label"
                  className="dz-tiles"
                >
                  {tiles}
                </div>
              </div>

              {/* Only the fields the pick needs: assignee (manual), reason (back / cancel), comment */}
              <div className="dz-fields">
                {isManualAssignment &&
                  (isStaffLoading ? (
                    <div className="dz-hint flex items-center gap-2 text-sm">
                      <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin" />
                      {t('decision.loadingAssignees')}
                    </div>
                  ) : (
                    <div>
                      <label className="dz-label block text-xs font-medium mb-2">
                        {t('decision.assignNextTo')}
                        <span className="text-danger ml-0.5">*</span>
                      </label>
                      <Dropdown
                        options={(eligibleStaff ?? []).map(s => ({
                          value: s.id,
                          label: s.name,
                        }))}
                        value={selectedAssigneeUserId ?? undefined}
                        onChange={onAssigneeChange}
                        placeholder={t('decision.assigneePlaceholder')}
                      />
                    </div>
                  ))}

                {/* Reason dropdown — required for Cancel (C) and Routeback (B) */}
                {reasonGroup !== null && (
                  <div>
                    <label className="dz-label block text-xs font-medium mb-2">
                      {t('decision.reasonLabel')}
                      <span className="text-danger ml-0.5">*</span>
                    </label>
                    <Dropdown
                      options={reasonOptions}
                      value={selectedReasonCode ?? undefined}
                      onChange={code => {
                        onReasonChange(code);
                        // A dissenting vote's comment must be the voter's own words, so the
                        // reason text is not copied into it at the committee step.
                        if (isCommitteeStep) return;
                        const desc = reasonOptions.find(o => o.value === code)?.label ?? '';
                        onCommentsChange(desc);
                      }}
                      placeholder={t('decision.reasonPlaceholder')}
                    />
                  </div>
                )}

                <div className="dz-fields-wide">
                  <label className="dz-label block text-xs font-medium mb-2">
                    {t('decision.commentsLabel')}
                    {commentRequired && <span className="text-danger ml-0.5">*</span>}
                  </label>
                  <Textarea
                    value={comments}
                    onChange={e => onCommentsChange(e.target.value)}
                    placeholder={t(
                      `decision.commentPlaceholders.${placeholderKey}` as `decision.commentPlaceholders.default`,
                    )}
                    maxLength={4000}
                  />
                  <div className="mt-1 flex justify-end">
                    <span
                      className={clsx(
                        'text-xs',
                        comments.length > 4000 ? 'text-danger' : 'dz-hint',
                      )}
                    >
                      {comments.length}/4000
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

// ==================== Confirm-dialog summary ====================

interface DecisionConfirmSummaryProps {
  action: ActivityAction;
  activityId: string | undefined;
  workflowInstanceId: string | undefined;
  assigneeUserId: string | null;
  reasonCode: string | null;
  comments: string;
}

/** What is about to be submitted, shown in the page's ConfirmDialog before completing. */
export const DecisionConfirmSummary = ({
  action,
  activityId,
  workflowInstanceId,
  assigneeUserId,
  reasonCode,
  comments,
}: DecisionConfirmSummaryProps) => {
  const { t } = useTranslation('appraisal');
  const isManual = isManualAssignmentAction(action);
  // Same queries the section already ran — served from cache.
  const reasonOptions = useParameterOptions(reasonGroupOf(action) ?? '');
  const { data: staff } = useGetEligibleStaff(
    workflowInstanceId,
    action.targetActivityId ?? '',
    isManual,
  );
  const label = decisionDisplayLabel(t, activityId, action);
  const destination = destinationName(t, action);
  const assignee = isManual ? staff?.find(s => sameUser(s.id, assigneeUserId))?.name : null;
  const reason = reasonOptions.find(o => o.value === reasonCode)?.label;

  const rows = (
    [
      ['decision', label],
      ['destination', activityId !== COMMITTEE_ACTIVITY_ID ? destination : null],
      ['assignee', assignee],
      ['reason', reason],
      ['comments', comments.trim() ? comments : null],
    ] as const
  )
    .filter((row): row is readonly [(typeof row)[0], string] => !!row[1])
    .map(([key, value]) => [t(`decisionSummary.confirmDialog.summary.${key}`), value] as const);

  return (
    <div className="text-left">
      <p className="mb-3 text-center text-sm text-(--palette-gray-500)">
        {activityId === COMMITTEE_ACTIVITY_ID
          ? t('decisionSummary.confirmDialog.voteMessage')
          : t('decisionSummary.confirmDialog.message')}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-(--palette-line) bg-(--palette-surface-2) px-4 py-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-(--palette-gray-500)">{k}</dt>
            <dd className="font-medium text-(--palette-ink) break-words whitespace-pre-wrap">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default DecisionSection;
