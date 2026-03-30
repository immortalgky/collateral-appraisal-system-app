import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// Types

export interface TaskDetailResult {
  taskId: string;
  appraisalId: string;
  workflowInstanceId: string;
  activityId: string;
  assigneeUserId: string;
  assignedType: string;
  taskName: string | null;
  isOwner: boolean;
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
    },
  });
};
