import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import GroupCard from '@/shared/components/sections/GroupCard';
import InlineSubSection from '@/shared/components/sections/InlineSubSection';
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
import ActivityTrackingTimeline, { type ActivityStep } from './ActivityTrackingTimeline';
import { ApprovalListPanel } from './ApprovalListPanel';
import {
  activityTitle,
  COMMITTEE_ACTIVITY_ID,
  COMMITTEE_VOTE_VALUES,
  countVotes,
  decisionDisplayLabel,
  destinationName,
  destinationText,
  isDissentingVote,
  isManualAssignmentAction,
  movementOf,
  reasonGroupOf,
  useCommitteeApproval,
} from './decisionHelpers';

// ==================== Decision-card visual mapping ====================

type DecisionColor = 'emerald' | 'red' | 'purple' | 'amber' | 'blue' | 'gray';

interface DecisionVisual {
  icon: string;
  color: DecisionColor;
}

/** Icon + color per decision kind (the keys resolveDecisionKind returns). */
const KIND_VISUALS: Record<string, DecisionVisual> = {
  reject: { icon: 'xmark', color: 'red' },
  approve: { icon: 'check', color: 'emerald' },
  routeBack: { icon: 'rotate-left', color: 'purple' },
  proceed: { icon: 'arrow-right', color: 'blue' },
  hold: { icon: 'pause', color: 'amber' },
  default: { icon: 'circle-dot', color: 'gray' },
};

/** Icon + color for an action. Committee votes are read by value (never guessed from the label),
 *  then movement B / C, then label keywords; falls back to gray + neutral icon. */
const resolveActionKind = (action: ActivityAction): string => {
  if (COMMITTEE_VOTE_VALUES.includes(action.value.toLowerCase())) {
    return resolveDecisionKind(action.value, null);
  }
  if (action.movement === 'B') return 'routeBack';
  if (action.movement === 'C') return 'reject';
  return resolveDecisionKind(action.value, action.label);
};

const resolveActionVisual = (action: ActivityAction): DecisionVisual =>
  KIND_VISUALS[resolveActionKind(action)];

const COLOR_CLASSES: Record<
  DecisionColor,
  {
    borderSelected: string;
    bgSelected: string;
    textSelected: string;
    iconBgSelected: string;
    iconBgIdle: string;
    iconTextIdle: string;
  }
> = {
  emerald: {
    borderSelected: 'border-emerald-500',
    bgSelected: 'bg-emerald-50',
    textSelected: 'text-emerald-900',
    iconBgSelected: 'bg-emerald-500',
    iconBgIdle: 'bg-emerald-100',
    iconTextIdle: 'text-emerald-600',
  },
  red: {
    borderSelected: 'border-red-500',
    bgSelected: 'bg-red-50',
    textSelected: 'text-red-900',
    iconBgSelected: 'bg-red-500',
    iconBgIdle: 'bg-red-100',
    iconTextIdle: 'text-red-600',
  },
  purple: {
    borderSelected: 'border-purple-500',
    bgSelected: 'bg-purple-50',
    textSelected: 'text-purple-900',
    iconBgSelected: 'bg-purple-500',
    iconBgIdle: 'bg-purple-100',
    iconTextIdle: 'text-purple-600',
  },
  amber: {
    borderSelected: 'border-amber-500',
    bgSelected: 'bg-amber-50',
    textSelected: 'text-amber-900',
    iconBgSelected: 'bg-amber-500',
    iconBgIdle: 'bg-amber-100',
    iconTextIdle: 'text-amber-600',
  },
  blue: {
    borderSelected: 'border-blue-500',
    bgSelected: 'bg-blue-50',
    textSelected: 'text-blue-900',
    iconBgSelected: 'bg-blue-500',
    iconBgIdle: 'bg-blue-100',
    iconTextIdle: 'text-blue-600',
  },
  gray: {
    borderSelected: 'border-gray-500',
    bgSelected: 'bg-gray-50',
    textSelected: 'text-gray-900',
    iconBgSelected: 'bg-gray-500',
    iconBgIdle: 'bg-gray-100',
    iconTextIdle: 'text-gray-600',
  },
};

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

// ==================== Decision grouping ====================

/** Actions are grouped by where they send the work, so forward/back/cancel can't be confused. */
const MOVEMENT_GROUPS = [
  { movement: 'F', key: 'forward', icon: 'arrow-right', danger: false },
  { movement: 'B', key: 'back', icon: 'rotate-left', danger: false },
  { movement: 'C', key: 'cancel', icon: 'ban', danger: true },
] as const;

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
  <details open={defaultOpen} className="group rounded-lg border border-gray-200 bg-white">
    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</span>
      {summary && <span className="ml-auto text-xs text-gray-500">{summary}</span>}
      <Icon
        name="chevron-down"
        style="solid"
        className={clsx(
          'size-3 text-gray-400 transition-transform group-open:rotate-180',
          !summary && 'ml-auto',
        )}
      />
    </summary>
    <div className="px-3 pb-3">{children}</div>
  </details>
);

interface DecisionCardProps {
  action: ActivityAction;
  label: string;
  checked: boolean;
  onSelect: () => void;
  /** Second line: where the work goes, or the vote's effect on the tally. */
  detail: string | null;
  detailIcon: string;
  /** Native radio group; arrow keys move only within one group. */
  groupName: string;
}

/** A decision option: a native radio inside a card. Each movement group is its own radio
 *  group, so arrow keys only move within Forward / Back / Cancel — Tab crosses groups. */
const DecisionCard = ({
  action,
  label,
  checked,
  onSelect,
  detail,
  detailIcon,
  groupName,
}: DecisionCardProps) => {
  const visual = resolveActionVisual(action);
  const c = COLOR_CLASSES[visual.color];
  return (
    <label
      className={clsx(
        'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30',
        checked ? [c.borderSelected, c.bgSelected] : 'border-gray-200 hover:bg-gray-50',
      )}
    >
      <input
        type="radio"
        name={groupName}
        value={action.value}
        checked={checked}
        onChange={onSelect}
        // The cards sit inside the page's <form>; Enter must not trigger its implicit submit.
        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
        className="sr-only"
      />
      <span
        className={clsx(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          checked ? [c.iconBgSelected, 'text-white'] : [c.iconBgIdle, c.iconTextIdle],
        )}
      >
        <Icon name={visual.icon} style="solid" className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={clsx('block text-sm font-medium', checked ? c.textSelected : 'text-gray-900')}
        >
          {label}
        </span>
        {detail && (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
            <Icon name={detailIcon} style="solid" className="size-2.5 text-gray-400" />
            <span className="truncate">{detail}</span>
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={clsx(
          'size-4 shrink-0 rounded-full border-2',
          checked ? [c.borderSelected, 'border-[5px]'] : 'border-gray-300',
        )}
      />
    </label>
  );
};

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

  const activitySteps = useMemo<ActivityStep[]>(() => {
    const previewName = activityTitle(selectedAction?.targetActivityId ?? null);
    // Preview where the picked decision sends the work, as a dashed last row. Not for committee
    // votes: one vote doesn't move the work — the round resolves on the backend.
    if (
      isReadOnly ||
      isCommitteeStep ||
      !selectedAction ||
      !previewName ||
      movementOf(selectedAction) === 'C'
    ) {
      return historySteps;
    }
    const assignee = eligibleStaff?.find(s => s.id === selectedAssigneeUserId)?.name ?? null;
    return [
      ...historySteps,
      {
        stepName: previewName,
        taskDescription: null,
        role: '',
        assigneeName: assignee,
        assigneeDisplayName: null,
        startedAt: null,
        completedAt: null,
        status: 'pending',
        movement: movementOf(selectedAction),
        remark: null,
        preview: true,
      },
    ];
  }, [
    historySteps,
    isReadOnly,
    isCommitteeStep,
    selectedAction,
    eligibleStaff,
    selectedAssigneeUserId,
  ]);

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

  /** Committee cards show the vote's effect ("Agree 2 → 3"); the backend owns the outcome. */
  const cardDetail = (action: ActivityAction): { text: string | null; icon: string } => {
    if (isCommitteeStep) {
      // Projection only while the round is open — a resolved round's tally no longer moves.
      if (
        committee.data?.status !== 'Pending' ||
        !COMMITTEE_VOTE_VALUES.includes(action.value.toLowerCase())
      ) {
        return { text: null, icon: 'chart-simple' };
      }
      const now = countVotes(committee.data, action.value);
      return {
        text: t('decision.voteImpact', { from: now, to: now + 1 }),
        icon: 'chart-simple',
      };
    }
    const m = movementOf(action);
    return {
      text: destinationText(t, action),
      icon: m === 'B' ? 'rotate-left' : m === 'C' ? 'ban' : 'arrow-right',
    };
  };

  const renderCard = (action: ActivityAction) => {
    const detail = cardDetail(action);
    return (
      <DecisionCard
        key={action.value}
        action={action}
        label={labelOf(action)}
        checked={selectedDecision === action.value}
        onSelect={() => selectDecision(action.value)}
        detail={detail.text}
        detailIcon={detail.icon}
        // Committee votes are one flat group; decisions are one group per movement, so arrow
        // keys never slide from Forward into Cancel.
        groupName={isCommitteeStep ? 'decision-vote' : `decision-${movementOf(action)}`}
      />
    );
  };

  const timeline = isHistoryLoading ? (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
      <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin" />
      {t('decision.loadingActivity')}
    </div>
  ) : (
    <ActivityTrackingTimeline activities={activitySteps} />
  );

  return (
    <>
      <GroupCard title={t('decision.sectionTitle')} icon="gavel" iconColor="rose">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 lg:gap-6">
          {/* Left: committee votes (when there are any) + Activity Tracking */}
          {committee.data || committee.liveLoading || committee.liveFailed ? (
            <div className="min-w-0 space-y-3">
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
                      className="w-5 h-5 animate-spin text-gray-400"
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
                {timeline}
              </FoldSection>
            </div>
          ) : (
            <InlineSubSection title={t('decision.activityTracking')} className="min-w-0">
              {timeline}
            </InlineSubSection>
          )}

          {/* Vertical divider (lg+) / Horizontal divider (mobile) */}
          <div className="hidden lg:block w-px bg-gray-200" />
          <div className="lg:hidden my-6 h-px bg-gray-200" />

          {/* Right: Decision Form — stays in view while the timeline scrolls */}
          <InlineSubSection className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            {isReadOnly ? (
              // Read-only view
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
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
                    <span className="text-sm text-gray-400">{t('decision.noDecision')}</span>
                  )}
                </div>
                {comments && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('decision.commentsLabel')}
                    </label>
                    <p className="text-sm text-gray-600">{comments}</p>
                  </div>
                )}
              </div>
            ) : (
              // Editable view
              <div className="space-y-4">
                {isActionsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin" />
                    {t('decision.loadingActions')}
                  </div>
                ) : actions.length === 0 ? (
                  // Failed or empty actions query — say so instead of an empty required group.
                  <p className="text-sm text-gray-500">{t('decision.noActions')}</p>
                ) : (
                  <>
                    {/* Decision cards — grouped by where the work goes; committee votes flat */}
                    <div>
                      <div
                        id="decision-group-label"
                        className="block text-xs font-medium text-gray-700 mb-2"
                      >
                        {isCommitteeStep ? t('decision.yourVote') : t('decision.decisionLabel')}
                        <span className="text-danger ml-0.5">*</span>
                      </div>
                      {isCommitteeStep ? (
                        <div
                          role="radiogroup"
                          aria-labelledby="decision-group-label"
                          className="space-y-2"
                        >
                          {actions.map(renderCard)}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {MOVEMENT_GROUPS.map(group => {
                            const list = actions.filter(a => movementOf(a) === group.movement);
                            if (list.length === 0) return null;
                            return (
                              <div key={group.movement}>
                                <div
                                  className={clsx(
                                    'mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide',
                                    group.danger ? 'text-red-600' : 'text-gray-500',
                                  )}
                                >
                                  <Icon name={group.icon} style="solid" className="size-3" />
                                  {t(`decision.groups.${group.key}`)}
                                </div>
                                <div
                                  role="radiogroup"
                                  aria-label={t(`decision.groups.${group.key}`)}
                                  className="space-y-2"
                                >
                                  {list.map(renderCard)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {isManualAssignment &&
                      (isStaffLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin" />
                          {t('decision.loadingAssignees')}
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
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
                        <label className="block text-xs font-medium text-gray-700 mb-2">
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

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
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
                            comments.length > 4000 ? 'text-danger' : 'text-gray-400',
                          )}
                        >
                          {comments.length}/4000
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </InlineSubSection>
        </div>
      </GroupCard>
    </>
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
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
}

/** What is about to be submitted, shown in the page's ConfirmDialog before completing. */
export const DecisionConfirmSummary = ({
  action,
  activityId,
  workflowInstanceId,
  assigneeUserId,
  reasonCode,
  comments,
  acknowledged,
  onAcknowledgedChange,
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
  const assignee = isManual ? staff?.find(s => s.id === assigneeUserId)?.name : null;
  const reason = reasonOptions.find(o => o.value === reasonCode)?.label;
  const needsAck = isDissentingVote(activityId, action.value);

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
      <p className="mb-3 text-center text-sm text-gray-500">
        {activityId === COMMITTEE_ACTIVITY_ID
          ? t('decisionSummary.confirmDialog.voteMessage')
          : t('decisionSummary.confirmDialog.message')}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-gray-500">{k}</dt>
            <dd className="font-medium text-gray-900 break-words whitespace-pre-wrap">{v}</dd>
          </div>
        ))}
      </dl>
      {needsAck && (
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-0.5"
            checked={acknowledged}
            onChange={e => onAcknowledgedChange(e.target.checked)}
          />
          {t('decisionSummary.confirmDialog.voteAck', { vote: label })}
        </label>
      )}
    </div>
  );
};

export default DecisionSection;
