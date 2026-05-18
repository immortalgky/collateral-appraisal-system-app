import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { z } from 'zod';
import type {
  EligibleAssigneesResponse,
  GetMonitoredPeopleParams,
  GetMonitoredTasksParams,
  MonitoredPersonListResponse,
  MonitoredTaskListResponse,
  MonitorFilterOptions,
  ReassignTaskRequest,
  ReassignTaskResponse,
} from '../types';

// ─── Zod schemas ────────────────────────────────────────────────────────────

export const reassignTaskSchema = z.object({
  newAssignedTo: z.string().min(1, 'Please select an assignee'),
});

export type ReassignTaskFormValues = z.infer<typeof reassignTaskSchema>;

// ─── Query key factory ───────────────────────────────────────────────────────

export const taskMonitorKeys = {
  all: ['task-monitor'] as const,
  list: (params: GetMonitoredTasksParams) => ['task-monitor', 'list', params] as const,
  people: (params: GetMonitoredPeopleParams) => ['task-monitor', 'people', params] as const,
  filterOptions: () => ['task-monitor', 'filter-options'] as const,
  eligibleAssignees: (workflowInstanceId: string, activityId: string) =>
    ['task-monitor', 'eligible-assignees', workflowInstanceId, activityId] as const,
};

/**
 * Distinct task-type descriptions (supervisor scope) + appraisal status enum
 * for the drill-down filter card dropdowns.
 * GET /tasks/monitor/filter-options
 */
export const useMonitorFilterOptions = () =>
  useQuery({
    queryKey: taskMonitorKeys.filterOptions(),
    queryFn: async (): Promise<MonitorFilterOptions> => {
      const { data } = await axios.get('/tasks/monitor/filter-options');
      return data.result ?? data;
    },
    staleTime: 5 * 60 * 1000,
  });

/**
 * Fetches the supervisor-scoped people list (one row per monitored user with task counts).
 * GET /tasks/monitor/people
 */
export const useMonitoredPeople = (params: GetMonitoredPeopleParams = {}) => {
  const { search, sortBy, sortDir, page = 0, pageSize = 25 } = params;

  return useQuery({
    queryKey: taskMonitorKeys.people(params),
    queryFn: async (): Promise<MonitoredPersonListResponse> => {
      const { data } = await axios.get('/tasks/monitor/people', {
        params: {
          PageNumber: page,
          PageSize: pageSize,
          ...(search && { Search: search }),
          ...(sortBy && { SortBy: sortBy }),
          ...(sortDir && { SortDir: sortDir }),
        },
      });
      return data.result ?? data;
    },
    staleTime: 0,
  });
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetches the supervisor-scoped monitored task list.
 * GET /tasks/monitor
 *
 * staleTime: 0 so post-reassign invalidations always trigger a fresh fetch.
 */
export const useMonitoredTasks = (params: GetMonitoredTasksParams = {}) => {
  const {
    groupId,
    assigneeUsername,
    sla,
    activityId,
    search,
    appraisalNumber,
    customerName,
    appraisalStatus,
    taskType,
    sortBy,
    sortDir,
    page = 0,
    pageSize = 25,
  } = params;

  return useQuery({
    queryKey: taskMonitorKeys.list(params),
    queryFn: async (): Promise<MonitoredTaskListResponse> => {
      const { data } = await axios.get('/tasks/monitor', {
        params: {
          PageNumber: page,
          PageSize: pageSize,
          ...(groupId && { GroupId: groupId }),
          ...(assigneeUsername && { AssigneeUsername: assigneeUsername }),
          ...(sla && { Sla: sla }),
          ...(activityId && { ActivityId: activityId }),
          ...(search && { Search: search }),
          ...(appraisalNumber && { AppraisalNumber: appraisalNumber }),
          ...(customerName && { CustomerName: customerName }),
          ...(appraisalStatus && { AppraisalStatus: appraisalStatus }),
          ...(taskType && { TaskType: taskType }),
          ...(sortBy && { SortBy: sortBy }),
          ...(sortDir && { SortDir: sortDir }),
        },
      });
      return data.result ?? data;
    },
    staleTime: 0,
  });
};

/**
 * Fetches eligible assignees for a workflow activity.
 * GET /api/workflows/instances/{workflowInstanceId}/activities/{activityId}/eligible-assignees
 *
 * Only fires when both IDs are provided (modal is open and a task is selected).
 */
export const useEligibleAssignees = (
  workflowInstanceId: string | null,
  activityId: string | null,
) => {
  return useQuery({
    queryKey: taskMonitorKeys.eligibleAssignees(workflowInstanceId ?? '', activityId ?? ''),
    queryFn: async (): Promise<EligibleAssigneesResponse> => {
      const { data } = await axios.get(
        `/api/workflows/instances/${workflowInstanceId}/activities/${activityId}/eligible-assignees`,
      );
      return data.result ?? data;
    },
    enabled: !!workflowInstanceId && !!activityId,
    staleTime: 30 * 1000,
  });
};

/**
 * Reassigns a pending task to a new user.
 * POST /tasks/{taskId}/reassign
 */
export const useReassignTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      body,
    }: {
      taskId: string;
      body: ReassignTaskRequest;
    }): Promise<ReassignTaskResponse> => {
      const { data } = await axios.post(`/tasks/${taskId}/reassign`, body);
      return data.result ?? data;
    },
    onSuccess: result => {
      if (result.isSuccess) {
        // Invalidate the monitor list so it refetches with the new assignment
        queryClient.invalidateQueries({ queryKey: taskMonitorKeys.all });
      }
    },
    onError: () => {
      // On concurrency error: silently refetch the list in the background
      queryClient.invalidateQueries({ queryKey: taskMonitorKeys.all });
    },
  });
};
