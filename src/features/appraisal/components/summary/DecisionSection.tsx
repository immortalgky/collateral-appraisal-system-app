import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import FormCard from '@/shared/components/sections/FormCard';
import Dropdown from '@/shared/components/inputs/Dropdown';
import Textarea from '@/shared/components/inputs/Textarea';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import {
  useWorkflowInstanceId,
  useActivityId,
  useIsTaskOwner,
} from '@/features/appraisal/context/AppraisalContext';
import {
  useGetActivityActions,
  useGetTaskHistory,
  type TaskHistoryItem,
} from '@/features/appraisal/api/workflow';
import { useGetEligibleStaff } from '@/features/appraisal/api/administration';
import { RaiseFollowupDialog } from '@/features/document-followup/components/RaiseFollowupDialog';
import { OpenFollowupBanner } from '@/features/document-followup/components/OpenFollowupBanner';

import ActivityTrackingTimeline, { type ActivityStep } from './ActivityTrackingTimeline';

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
    selectedAction?.assignmentMode === 'manual' && !!selectedAction.targetActivityId;

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

      <FormCard title="Decision" icon="gavel" iconColor="rose">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 lg:gap-6">
          {/* Left: Activity Tracking */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-5 px-3 py-2.5 rounded-lg bg-gradient-to-r from-cyan-50 to-transparent border border-cyan-100">
              <div className="w-7 h-7 rounded-md bg-cyan-100 flex items-center justify-center shrink-0">
                <Icon name="clock-rotate-left" style="solid" className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Activity Tracking</h3>
            </div>
            {isHistoryLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin" />
                Loading activity...
              </div>
            ) : (
              <ActivityTrackingTimeline activities={activitySteps} />
            )}
          </div>

          {/* Vertical divider (lg+) / Horizontal divider (mobile) */}
          <div className="hidden lg:block w-px bg-gray-100" />
          <div className="lg:hidden my-6 h-px bg-gray-100" />

          {/* Right: Decision Form */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-5 px-3 py-2.5 rounded-lg bg-gradient-to-r from-rose-50 to-transparent border border-rose-100">
              <div className="w-7 h-7 rounded-md bg-rose-100 flex items-center justify-center shrink-0">
                <Icon name="gavel" style="solid" className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">
                Decision <span className="text-danger text-xs">*</span>
              </h3>
            </div>

            {isReadOnly ? (
              // Read-only view
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Decision</label>
                  {selectedDecision ? (
                    <Badge type="vote" value={badgeMap[selectedDecision] ?? selectedDecision} size="md" />
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
                    <div>
                      <Dropdown
                        label="Decision"
                        required
                        options={decisionOptions}
                        value={selectedDecision ?? undefined}
                        onChange={(value) => {
                          // Clear stale assignee when decision changes — target activity may differ
                          onAssigneeChange(null);
                          onDecisionChange(value);
                        }}
                        placeholder="Please select a decision..."
                      />
                      {selectedDecision && (
                        <div className="mt-2">
                          <Badge type="vote" value={badgeMap[selectedDecision] ?? selectedDecision} size="sm" />
                        </div>
                      )}
                    </div>

                    {isManualAssignment && (
                      isStaffLoading ? (
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
                      )
                    )}

                    <Textarea
                      label="Comments"
                      value={comments}
                      onChange={(e) => onCommentsChange(e.target.value)}
                      placeholder="Enter your comments or reason for this decision..."
                    />

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
          </div>
        </div>
      </FormCard>

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
