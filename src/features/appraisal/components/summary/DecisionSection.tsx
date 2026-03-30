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
import { useGetActivityActions } from '@/features/appraisal/api/workflow';

import ActivityTrackingTimeline, { type ActivityStep } from './ActivityTrackingTimeline';

// ==================== Mock Activity Tracking (replace with API later) ====================

const MOCK_ACTIVITIES: ActivityStep[] = [
  {
    stepName: 'Request Maker',
    role: 'Maker',
    assigneeName: 'Jane Doe',
    startedAt: '1991-01-01T08:30:00+07:00',
    completedAt: '1991-01-01T08:40:00+07:00',
    status: 'completed',
    remark: 'Remark',
  },
  {
    stepName: 'Request Checker',
    role: 'Checker',
    assigneeName: 'Marry Jane',
    startedAt: '1991-01-01T08:48:00+07:00',
    completedAt: '1991-01-01T09:01:00+07:00',
    status: 'completed',
    remark: 'Remark',
  },
  {
    stepName: 'Admin Staff',
    role: 'Admin',
    assigneeName: 'Maria Gouse',
    startedAt: '1991-01-01T10:02:00+07:00',
    completedAt: '1991-01-01T10:15:00+07:00',
    status: 'completed',
    remark: null,
  },
  {
    stepName: 'Appraisal Staff',
    role: 'Appraiser',
    assigneeName: 'Peter Parker',
    startedAt: '1991-01-01T10:25:00+07:00',
    completedAt: null,
    status: 'in_progress',
    remark: null,
  },
];

// ==================== Component ====================

interface DecisionSectionProps {
  selectedDecision: string | null;
  onDecisionChange: (value: string | null) => void;
  comments: string;
  onCommentsChange: (value: string) => void;
}

const DecisionSection = ({
  selectedDecision,
  onDecisionChange,
  comments,
  onCommentsChange,
}: DecisionSectionProps) => {
  const isPageReadOnly = usePageReadOnly();
  const isTaskOwner = useIsTaskOwner();
  const workflowInstanceId = useWorkflowInstanceId();
  const activityId = useActivityId();

  // Fetch available actions from workflow
  const { data: actionsData, isLoading: isActionsLoading } = useGetActivityActions(
    workflowInstanceId,
    activityId,
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

  return (
    <FormCard title="Decision" icon="gavel" iconColor="rose">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 lg:gap-6">
        {/* Left: Activity Tracking */}
        <div>
          <div className="flex items-center gap-2.5 mb-5 px-3 py-2.5 rounded-lg bg-gradient-to-r from-cyan-50 to-transparent border border-cyan-100">
            <div className="w-7 h-7 rounded-md bg-cyan-100 flex items-center justify-center shrink-0">
              <Icon name="clock-rotate-left" style="solid" className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Activity Tracking</h3>
          </div>
          <ActivityTrackingTimeline activities={MOCK_ACTIVITIES} />
        </div>

        {/* Vertical divider (lg+) / Horizontal divider (mobile) */}
        <div className="hidden lg:block w-px bg-gray-100" />
        <div className="lg:hidden my-6 h-px bg-gray-100" />

        {/* Right: Decision Form */}
        <div>
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
                      onChange={onDecisionChange}
                      placeholder="Please select a decision..."
                    />
                    {selectedDecision && (
                      <div className="mt-2">
                        <Badge type="vote" value={badgeMap[selectedDecision] ?? selectedDecision} size="sm" />
                      </div>
                    )}
                  </div>

                  <Textarea
                    label="Comments"
                    value={comments}
                    onChange={(e) => onCommentsChange(e.target.value)}
                    placeholder="Enter your comments or reason for this decision..."
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </FormCard>
  );
};

export default DecisionSection;
