import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// Workflow Progress types

export interface PhaseStepDto {
  group: string;
  status: 'Completed' | 'Current' | 'Pending';
}

export interface ActivityLogItemDto {
  sequenceNo: number;
  activityName: string;
  taskDescription: string | null;
  assignedTo: string | null;
  assignedToDisplayName: string | null;
  startDate: string;
  endDate: string | null;
  actionTaken: string | null;
  timeTaken: string | null;
  remark: string | null;
  status: 'Completed' | 'Pending';
  group: string | null;
  activityId: string | null;
  companyName: string | null;
}

export interface WorkflowProgressResponse {
  workflowInstanceId: string | null;
  workflowStatus: string | null;
  routeType: string;
  currentActivityId: string | null;
  steps: PhaseStepDto[];
  activityLog: ActivityLogItemDto[];
}

// Types

export interface TaskDetailResult {
  taskId: string;
  requestId: string;
  appraisalId: string | null;
  /**
   * Populated only for quotation-workflow tasks (non-null when the task wraps a quotation).
   * Use this — not taskId — as the quotation route identifier.
   */
  quotationRequestId: string | null;
  workflowInstanceId: string;
  activityId: string;
  assigneeUserId: string;
  assignedType: string;
  taskName: string | null;
  isOwner: boolean;
  workingBy: string | null;
  lockedAt: string | null;
}

export interface ActivityAction {
  value: string;
  label: string;
  assignmentMode: string;
  targetActivityId: string | null;
}

export interface ActivityActionsResponse {
  activityId: string;
  activityName: string;
  actions: ActivityAction[];
  /** True when the workflow definition permits this task to raise document followups */
  canRaiseFollowup?: boolean;
}

export interface CompleteActivityResponse {
  workflowInstanceId: string;
  status: string;
  nextActivityId: string | null;
  currentAssignee: string | null;
  nextAssignee: string | null;
  isCompleted: boolean;
  validationErrors: string[] | null;
}

export interface TaskHistoryItem {
  taskId: string;
  taskName: string;
  taskDescription: string | null;
  assignedTo: string;
  assignedToDisplayName: string | null;
  assignedType: string;
  assignedAt: string;
  completedAt: string | null;
  actionTaken: string | null;
  movement: string | null;
  remark: string | null;
}

export interface TaskHistoryResponse {
  items: TaskHistoryItem[];
}

/**
 * Hook for fetching a task by ID
 * GET /tasks/{taskId}
 */
export const useGetTaskById = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async (): Promise<TaskDetailResult> => {
      const { data } = await axios.get(`/tasks/${taskId}`);
      return data;
    },
    enabled: !!taskId,
    retry: false,
  });
};

/**
 * Hook for fetching available actions for a workflow activity
 * GET /api/workflows/instances/{workflowInstanceId}/activities/{activityId}/actions
 */
export const useGetActivityActions = (
  workflowInstanceId: string | undefined,
  activityId: string | undefined,
) => {
  return useQuery({
    queryKey: ['activity-actions', workflowInstanceId, activityId],
    queryFn: async (): Promise<ActivityActionsResponse> => {
      const { data } = await axios.get(
        `/api/workflows/instances/${workflowInstanceId}/activities/${activityId}/actions`,
      );
      return data;
    },
    enabled: !!workflowInstanceId && !!activityId,
  });
};

/**
 * Hook for fetching the task history (completed + currently pending) for a workflow instance.
 * GET /api/workflows/instances/{workflowInstanceId}/task-history
 */
export const useGetTaskHistory = (workflowInstanceId: string | undefined) => {
  return useQuery({
    queryKey: ['workflow', 'task-history', workflowInstanceId],
    queryFn: async (): Promise<TaskHistoryResponse> => {
      const { data } = await axios.get(
        `/api/workflows/instances/${workflowInstanceId}/task-history`,
      );
      return data;
    },
    enabled: !!workflowInstanceId,
  });
};

/**
 * Hook for fetching workflow progress for an appraisal
 * GET /api/workflows/appraisals/{appraisalId}/progress
 */
export const useGetWorkflowProgress = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: ['workflow-progress', appraisalId],
    queryFn: async (): Promise<WorkflowProgressResponse> => {
      const { data } = await axios.get(`/api/workflows/appraisals/${appraisalId}/progress`);
      return data;
    },
    enabled: !!appraisalId,
    staleTime: 30_000,
  });
};

/**
 * Hook for completing a workflow activity (submitting a decision)
 * POST /api/workflows/instances/{workflowInstanceId}/activities/{activityId}/complete
 */
export const useCompleteActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowInstanceId,
      activityId,
      input,
      nextAssignmentOverrides,
    }: {
      workflowInstanceId: string;
      activityId: string;
      input: Record<string, unknown>;
      nextAssignmentOverrides?: Record<
        string,
        {
          runtimeAssignee?: string;
          runtimeAssigneeGroup?: string;
          overrideReason?: string;
        }
      >;
    }): Promise<CompleteActivityResponse> => {
      const { data } = await axios.post(
        `/api/workflows/instances/${workflowInstanceId}/activities/${activityId}/complete`,
        { input, nextAssignmentOverrides },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-progress'] });
    },
  });
};
