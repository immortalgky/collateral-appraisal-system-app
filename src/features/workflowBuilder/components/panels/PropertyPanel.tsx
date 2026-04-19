import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import { StartForm } from './StartForm';
import { TaskForm } from './TaskForm';
import { RoutingForm } from './RoutingForm';
import { EndForm } from './EndForm';
import { CompanySelectionForm } from './CompanySelectionForm';
import { IfElseForm } from './IfElseForm';
import { SwitchForm } from './SwitchForm';
import { ForkForm } from './ForkForm';
import { JoinForm } from './JoinForm';
import { DynamicPropertyForm } from './DynamicPropertyForm';
import { TransitionForm } from './TransitionForm';
import { ApprovalForm } from './ApprovalForm';
import { MeetingForm } from './MeetingForm';
import { AwaitSignalForm } from './AwaitSignalForm';
import { InternalFollowupSelectionForm } from './InternalFollowupSelectionForm';
import { RequestSubmissionActivityForm } from './RequestSubmissionActivityForm';
import { AdminReviewActivityForm } from './AdminReviewActivityForm';
import { TimerForm } from './TimerForm';

export function PropertyPanel() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const selectedEdgeId = useWorkflowStore((s) => s.selectedEdgeId);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const clearSelection = useWorkflowStore((s) => s.clearSelection);
  const removeActivity = useWorkflowStore((s) => s.removeActivity);
  const removeTransition = useWorkflowStore((s) => s.removeTransition);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;
  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null;

  if (!selectedNode && !selectedEdge) return null;

  const nodeData = selectedNode?.data as ActivityNodeData | undefined;

  return (
    <div className="flex h-full w-[320px] flex-col border-l border-base-300 bg-base-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
        <h3 className="text-sm font-semibold text-base-content">
          {selectedNode ? 'Activity Properties' : 'Transition Properties'}
        </h3>
        <button
          onClick={clearSelection}
          className="btn btn-ghost btn-xs"
        >
          ✕
        </button>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode && nodeData && (
          <>
            {renderFormForType(nodeData)}
            {!nodeData.isStartActivity && (
              <div className="mt-6 border-t border-base-300 pt-4">
                <button
                  onClick={() => {
                    removeActivity(selectedNode.id);
                    clearSelection();
                  }}
                  className="btn btn-error btn-outline btn-sm w-full"
                >
                  Delete Activity
                </button>
              </div>
            )}
          </>
        )}

        {selectedEdge && (
          <>
            <TransitionForm edgeId={selectedEdge.id} />
            <div className="mt-6 border-t border-base-300 pt-4">
              <button
                onClick={() => {
                  removeTransition(selectedEdge.id);
                  clearSelection();
                }}
                className="btn btn-error btn-outline btn-sm w-full"
              >
                Delete Transition
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function renderFormForType(data: ActivityNodeData) {
  switch (data.type) {
    case 'StartActivity':
      return <StartForm nodeId={data.id} />;
    case 'TaskActivity':
      return <TaskForm nodeId={data.id} />;
    case 'RoutingActivity':
      return <RoutingForm nodeId={data.id} />;
    case 'EndActivity':
      return <EndForm nodeId={data.id} />;
    case 'CompanySelectionActivity':
      return <CompanySelectionForm nodeId={data.id} />;
    case 'IfElseActivity':
      return <IfElseForm nodeId={data.id} />;
    case 'SwitchActivity':
      return <SwitchForm nodeId={data.id} />;
    case 'ForkActivity':
      return <ForkForm nodeId={data.id} />;
    case 'JoinActivity':
      return <JoinForm nodeId={data.id} />;
    // Phase 2 — new activity forms
    case 'ApprovalActivity':
      return <ApprovalForm nodeId={data.id} />;
    case 'MeetingActivity':
      return <MeetingForm nodeId={data.id} />;
    case 'AwaitSignalActivity':
      return <AwaitSignalForm nodeId={data.id} />;
    case 'InternalFollowupSelectionActivity':
      return <InternalFollowupSelectionForm nodeId={data.id} />;
    case 'RequestSubmissionActivity':
      return <RequestSubmissionActivityForm nodeId={data.id} />;
    case 'AdminReviewActivity':
      return <AdminReviewActivityForm nodeId={data.id} />;
    case 'TimerActivity':
      return <TimerForm nodeId={data.id} />;
    default:
      return <DynamicPropertyForm nodeId={data.id} />;
  }
}
