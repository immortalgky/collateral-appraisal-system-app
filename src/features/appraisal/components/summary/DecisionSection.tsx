import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import GroupCard from '@/shared/components/sections/GroupCard';
import InlineSubSection from '@/shared/components/sections/InlineSubSection';
import Dropdown from '@/shared/components/inputs/Dropdown';
import Textarea from '@/shared/components/inputs/Textarea';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useActivityId, useIsTaskOwner, useWorkflowInstanceId, } from '@/features/appraisal/context/AppraisalContext';
import { type TaskHistoryItem, useGetActivityActions, useGetTaskHistory, } from '@/features/appraisal/api/workflow';
import { useGetEligibleStaff } from '@/features/appraisal/api/administration';
import { RaiseFollowupDialog } from '@/features/document-followup/components/RaiseFollowupDialog';
import { OpenFollowupBanner } from '@/features/document-followup/components/OpenFollowupBanner';

import ActivityTrackingTimeline, { type ActivityStep } from './ActivityTrackingTimeline';

// ==================== Decision-card visual mapping ====================

type DecisionColor = 'emerald' | 'red' | 'purple' | 'amber' | 'blue' | 'gray';

interface DecisionVisual {
  icon: string;
  color: DecisionColor;
}

/** Maps action value/label keywords → icon + color. Falls back to gray + neutral icon. */
const resolveDecisionVisual = (value: string, label: string): DecisionVisual => {
  const k = `${value} ${label}`.toLowerCase();
  if (/(approve|agree|accept|confirm)/.test(k))
    return { icon: 'check', color: 'emerald' };
  if (/(reject|disagree|decline|deny)/.test(k))
    return { icon: 'xmark', color: 'red' };
  if (/(route.?back|send.?back|return)/.test(k))
    return { icon: 'rotate-left', color: 'purple' };
  if (/(proceed|forward|next|complete)/.test(k))
    return { icon: 'arrow-right', color: 'blue' };
  if (/(hold|defer|pause)/.test(k))
    return { icon: 'pause', color: 'amber' };
  return { icon: 'circle-dot', color: 'gray' };
};

const COLOR_CLASSES: Record<DecisionColor, {
  borderSelected: string;
  bgSelected: string;
  textSelected: string;
  iconBgSelected: string;
  iconBgIdle: string;
  iconTextIdle: string;
  ring: string;
}> = {
  emerald: {
    borderSelected: 'border-emerald-500',
    bgSelected: 'bg-emerald-50',
    textSelected: 'text-emerald-900',
    iconBgSelected: 'bg-emerald-500',
    iconBgIdle: 'bg-emerald-100',
    iconTextIdle: 'text-emerald-600',
    ring: 'focus-within:ring-emerald-200',
  },
  red: {
    borderSelected: 'border-red-500',
    bgSelected: 'bg-red-50',
    textSelected: 'text-red-900',
    iconBgSelected: 'bg-red-500',
    iconBgIdle: 'bg-red-100',
    iconTextIdle: 'text-red-600',
    ring: 'focus-within:ring-red-200',
  },
  purple: {
    borderSelected: 'border-purple-500',
    bgSelected: 'bg-purple-50',
    textSelected: 'text-purple-900',
    iconBgSelected: 'bg-purple-500',
    iconBgIdle: 'bg-purple-100',
    iconTextIdle: 'text-purple-600',
    ring: 'focus-within:ring-purple-200',
  },
  amber: {
    borderSelected: 'border-amber-500',
    bgSelected: 'bg-amber-50',
    textSelected: 'text-amber-900',
    iconBgSelected: 'bg-amber-500',
    iconBgIdle: 'bg-amber-100',
    iconTextIdle: 'text-amber-600',
    ring: 'focus-within:ring-amber-200',
  },
  blue: {
    borderSelected: 'border-blue-500',
    bgSelected: 'bg-blue-50',
    textSelected: 'text-blue-900',
    iconBgSelected: 'bg-blue-500',
    iconBgIdle: 'bg-blue-100',
    iconTextIdle: 'text-blue-600',
    ring: 'focus-within:ring-blue-200',
  },
  gray: {
    borderSelected: 'border-gray-500',
    bgSelected: 'bg-gray-50',
    textSelected: 'text-gray-900',
    iconBgSelected: 'bg-gray-500',
    iconBgIdle: 'bg-gray-100',
    iconTextIdle: 'text-gray-600',
    ring: 'focus-within:ring-gray-200',
  },
};

/** Contextual comment placeholder based on the selected decision. */
const resolveCommentPlaceholder = (value: string | null, label: string | null): string => {
  if (!value) return 'Enter your comments or reason for this decision...';
  const k = `${value} ${label ?? ''}`.toLowerCase();
  if (/(approve|agree|accept|confirm)/.test(k)) return 'Why are you approving?';
  if (/(reject|disagree|decline|deny)/.test(k)) return 'Why are you rejecting?';
  if (/(route.?back|send.?back|return)/.test(k)) return 'What needs to be revised?';
  if (/(proceed|forward|next|complete)/.test(k)) return 'Any final notes before proceeding?';
  if (/(hold|defer|pause)/.test(k)) return 'Why are you placing this on hold?';
  return 'Enter your comments or reason for this decision...';
};

// ==================== Helpers ====================

/** Map a backend TaskHistoryItem to the timeline's ActivityStep shape. */
const mapHistoryItemToStep = (item: TaskHistoryItem): ActivityStep => ({
  stepName: item.taskName,
  taskDescription: item.taskDescription,
  role: item.assignedType,
  assigneeName: item.assignedTo || null,
  assigneeDisplayName: item.assignedToDisplayName || null,
  startedAt: item.assignedAt,
  completedAt: item.completedAt,
  status: item.completedAt ? 'completed' : 'in_progress',
  movement: item.movement,
  remark: item.remark,
});

// ==================== Component ====================

interface DecisionSectionProps {
  selectedDecision: string | null;
  onDecisionChange: (value: string | null) => void;
  comments: string;
  onCommentsChange: (value: string) => void;
  selectedAssigneeUserId: string | null;
  onAssigneeChange: (userId: string | null) => void;
}

const DecisionSection = ({
  selectedDecision,
  onDecisionChange,
  comments,
  onCommentsChange,
  selectedAssigneeUserId,
  onAssigneeChange,
}: DecisionSectionProps) => {
  const isPageReadOnly = usePageReadOnly();
  const isTaskOwner = useIsTaskOwner();
  const workflowInstanceId = useWorkflowInstanceId();
  const activityId = useActivityId();
  const { taskId } = useParams<{ taskId: string }>();
  const [raiseFollowupOpen, setRaiseFollowupOpen] = useState(false);

  // Fetch available actions from workflow
  const { data: actionsData, isLoading: isActionsLoading } = useGetActivityActions(
    workflowInstanceId,
    activityId,
  );

  // Fetch task history (completed + currently-pending) for the activity tracking timeline
  const { data: taskHistoryData, isLoading: isHistoryLoading } =
    useGetTaskHistory(workflowInstanceId);

  const activitySteps = useMemo<ActivityStep[]>(
    () =>
      (taskHistoryData?.items ?? [])
        .slice()
        .sort((a, b) => new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime())
        .map(mapHistoryItemToStep),
    [taskHistoryData],
  );

  const selectedAction = useMemo(
    () => (actionsData?.actions ?? []).find(a => a.value === selectedDecision) ?? null,
    [actionsData, selectedDecision],
  );

  const isManualAssignment =
    selectedAction?.assignmentMode === 'user' && !!selectedAction.targetActivityId;

  const { data: eligibleStaff, isLoading: isStaffLoading } = useGetEligibleStaff(
    workflowInstanceId,
    selectedAction?.targetActivityId ?? '',
    isManualAssignment,
  );

  // Build dropdown options from API actions
  const decisionOptions = (actionsData?.actions ?? []).map(action => ({
    value: action.value,
    label: action.label,
  }));

  // Build badge map from actions
  const badgeMap: Record<string, string> = {};
  for (const action of actionsData?.actions ?? []) {
    badgeMap[action.value] = action.label;
  }

  // Read-only if page is read-only OR user is not the task owner
  const isReadOnly = isPageReadOnly || !isTaskOwner;

  // Whether this task can raise a followup (comes from backend workflow definition)
  const canRaiseFollowup = !isReadOnly && (actionsData?.canRaiseFollowup ?? false);

  return (
    <>
      {/* Open followup banner — shown when there is an active document request */}
      {taskId && <OpenFollowupBanner raisingTaskId={taskId} />}

      <GroupCard title="Decision" icon="gavel" iconColor="rose">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 lg:gap-6">
          {/* Left: Activity Tracking */}
          <InlineSubSection title="Activity Tracking" className="min-w-0">
            {isHistoryLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin" />
                Loading activity...
              </div>
            ) : (
              <ActivityTrackingTimeline activities={activitySteps} />
            )}
          </InlineSubSection>

          {/* Vertical divider (lg+) / Horizontal divider (mobile) */}
          <div className="hidden lg:block w-px bg-gray-200" />
          <div className="lg:hidden my-6 h-px bg-gray-200" />

          {/* Right: Decision Form */}
          <InlineSubSection
            title="Decision"
            className="min-w-0"
            rightSlot={<span className="text-danger">*</span>}
          >
            {isReadOnly ? (
              // Read-only view
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Decision</label>
                  {selectedDecision ? (
                    <Badge
                      type="vote"
                      value={badgeMap[selectedDecision] ?? selectedDecision}
                      size="md"
                    />
                  ) : (
                    <span className="text-sm text-gray-400">No decision made</span>
                  )}
                </div>
                {comments && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Comments</label>
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
                    Loading actions...
                  </div>
                ) : (
                  <>
                    {/* Decision dropdown — scales for any number of actions */}
                    <Dropdown
                      options={decisionOptions}
                      value={selectedDecision ?? undefined}
                      onChange={value => {
                        // Clear stale assignee when decision changes — target activity may differ
                        onAssigneeChange(null);
                        onDecisionChange(value);
                      }}
                      placeholder="Select a decision..."
                    />

                    {isManualAssignment &&
                      (isStaffLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin" />
                          Loading assignees...
                        </div>
                      ) : (
                        <Dropdown
                          label="Assign Next To"
                          required
                          options={(eligibleStaff ?? []).map(s => ({ value: s.id, label: s.name }))}
                          value={selectedAssigneeUserId ?? undefined}
                          onChange={onAssigneeChange}
                          placeholder="Select an assignee..."
                        />
                      ))}

                    {/* Card-aware comment box: focus ring color matches selected decision */}
                    {(() => {
                      const visual = selectedDecision
                        ? resolveDecisionVisual(
                            selectedDecision,
                            badgeMap[selectedDecision] ?? selectedDecision,
                          )
                        : null;
                      const ringClass = visual ? COLOR_CLASSES[visual.color].ring : '';
                      const placeholder = resolveCommentPlaceholder(
                        selectedDecision,
                        selectedDecision ? badgeMap[selectedDecision] ?? null : null,
                      );
                      return (
                        <div className={clsx('rounded-xl focus-within:ring-2 transition-shadow', ringClass)}>
                          <Textarea
                            label="Comments"
                            value={comments}
                            onChange={e => onCommentsChange(e.target.value)}
                            placeholder={placeholder}
                          />
                        </div>
                      );
                    })()}

                    {/* Request Additional Documents button — only when workflow opts in */}
                    {canRaiseFollowup && (
                      <div className="pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setRaiseFollowupOpen(true)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
                        >
                          <Icon name="file-circle-plus" style="solid" className="size-4" />
                          Request Additional Documents
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </InlineSubSection>
        </div>
      </GroupCard>

      {/* Raise followup dialog */}
      {canRaiseFollowup && workflowInstanceId && taskId && (
        <RaiseFollowupDialog
          isOpen={raiseFollowupOpen}
          onClose={() => setRaiseFollowupOpen(false)}
          workflowInstanceId={workflowInstanceId}
          taskId={taskId}
        />
      )}
    </>
  );
};

export default DecisionSection;
