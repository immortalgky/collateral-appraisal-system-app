import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  GetPoolTasksParams,
  GetTasksParams,
  PoolTaskListResponse,
  Task,
  TaskDateType,
  TaskListResponse,
} from './types';

/** Maps a (dateType, dateFrom, dateTo) tuple onto the backend's Pascal-cased query params. */
function toDateQueryParams(dateType: TaskDateType | undefined, from?: string, to?: string) {
  if (!from && !to) return {};
  const pairs: Record<TaskDateType, [string, string]> = {
    assigned: ['DateFrom', 'DateTo'],
    appointment: ['AppointmentDateFrom', 'AppointmentDateTo'],
    requested: ['RequestedAtFrom', 'RequestedAtTo'],
  };
  const [fromKey, toKey] = pairs[dateType ?? 'assigned'];
  return {
    ...(from && { [fromKey]: from }),
    ...(to && { [toKey]: to }),
  };
}

/**
 * Hook for fetching a paginated list of tasks for the current user
 * GET /tasks/me
 */
export const useGetTasks = (params: GetTasksParams = {}) => {
  const {
    pageNumber = 0,
    pageSize = 10,
    search,
    taskName,
    status,
    priority,
    activityId,
    sortBy,
    sortDir,
    appraisalNumber,
    customerName,
    pendingTaskStatus,
    slaStatus,
    assigneeUserId,
    dateType,
    dateFrom,
    dateTo,
  } = params;

  // When drilldown targets another user, switch to the all-tasks endpoint.
  // `/tasks/me` is hardcoded to the current user, `/tasks` accepts `AssigneeUserId`.
  const endpoint = assigneeUserId ? '/tasks' : '/tasks/me';

  const queryKey = [
    endpoint === '/tasks' ? 'all-tasks' : 'my-tasks',
    {
      pageNumber,
      pageSize,
      ...(search && { search }),
      ...(taskName && { taskName }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(activityId && { activityId }),
      ...(sortBy && { sortBy }),
      ...(sortDir && { sortDir }),
      ...(appraisalNumber && { appraisalNumber }),
      ...(customerName && { customerName }),
      ...(pendingTaskStatus && { pendingTaskStatus }),
      ...(slaStatus && { slaStatus }),
      ...(assigneeUserId && { assigneeUserId }),
      ...(dateType && { dateType }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<TaskListResponse> => {
      const { data } = await axios.get(endpoint, {
        params: {
          PageNumber: pageNumber,
          PageSize: pageSize,
          ...(search && { Search: search }),
          ...(taskName && { TaskName: taskName }),
          ...(status && { Status: status }),
          ...(priority && { Priority: priority }),
          ...(activityId && { ActivityId: activityId }),
          ...(sortBy && { SortBy: sortBy }),
          ...(sortDir && { SortDir: sortDir }),
          ...(appraisalNumber && { AppraisalNumber: appraisalNumber }),
          ...(customerName && { CustomerName: customerName }),
          // Backend accepts `taskStatus` which maps to PendingTaskStatus column.
          ...(pendingTaskStatus && { TaskStatus: pendingTaskStatus }),
          // SlaStatus support — backend may not yet accept this; plan step pending.
          ...(slaStatus && { SlaStatus: slaStatus }),
          ...(assigneeUserId && { AssigneeUserId: assigneeUserId }),
          ...toDateQueryParams(dateType, dateFrom, dateTo),
        },
      });

      // API returns { result: { items, count, pageNumber, pageSize } }
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Hook for fetching all tasks for Kanban view (no pagination, large page)
 * GET /tasks/me
 */
export const useGetTasksForKanban = (
  params: Omit<GetTasksParams, 'pageNumber' | 'pageSize'> = {},
) => {
  const { search, taskName, status, priority, activityId } = params;

  const queryKey = [
    'my-tasks-kanban',
    {
      ...(search && { search }),
      ...(taskName && { taskName }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(activityId && { activityId }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<Task[]> => {
      const { data } = await axios.get('/tasks/me', {
        params: {
          PageNumber: 0,
          PageSize: 200,
          ...(search && { Search: search }),
          ...(taskName && { TaskName: taskName }),
          ...(status && { Status: status }),
          ...(priority && { Priority: priority }),
          ...(activityId && { ActivityId: activityId }),
        },
      });

      const result = data.result ?? data;
      return result.items ?? [];
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Hook for fetching a paginated list of pool (group-assigned) tasks
 * GET /tasks/pool
 */
export const useGetPoolTasks = (params: GetPoolTasksParams = {}) => {
  const {
    pageNumber = 0,
    pageSize = 25,
    search,
    sortBy,
    sortDir,
    appraisalNumber,
    customerName,
    status,
    dateType,
    dateFrom,
    dateTo,
    activityId,
  } = params;

  const queryKey = [
    'pool-tasks',
    {
      pageNumber,
      pageSize,
      ...(search && { search }),
      ...(sortBy && { sortBy }),
      ...(sortDir && { sortDir }),
      ...(appraisalNumber && { appraisalNumber }),
      ...(customerName && { customerName }),
      ...(status && { status }),
      ...(dateType && { dateType }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(activityId && { activityId }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PoolTaskListResponse> => {
      const { data } = await axios.get('/tasks/pool', {
        params: {
          PageNumber: pageNumber,
          PageSize: pageSize,
          ...(search && { Search: search }),
          ...(sortBy && { SortBy: sortBy }),
          ...(sortDir && { SortDir: sortDir }),
          ...(appraisalNumber && { AppraisalNumber: appraisalNumber }),
          ...(customerName && { CustomerName: customerName }),
          ...(status && { Status: status }),
          ...toDateQueryParams(dateType, dateFrom, dateTo),
          ...(activityId && { ActivityId: activityId }),
        },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Lock a pool task for editing
 * POST /tasks/{id}/lock → 200 { lockedBy, lockedAt } | 409 { message }
 */
export const useLockTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      axios.post<{ lockedBy: string; lockedAt: string }>(`/tasks/${taskId}/lock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
    },
  });
};

/**
 * Release the lock on a pool task (called by the lock owner)
 * DELETE /tasks/{id}/lock → 204
 */
export const useUnlockTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => axios.delete(`/tasks/${taskId}/lock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
    },
  });
};

/**
 * Send a heartbeat to keep the lock alive
 * PUT /tasks/{id}/lock/heartbeat → 204
 */
export const useHeartbeatTaskLock = () => {
  return useMutation({
    mutationFn: (taskId: string) => axios.put(`/tasks/${taskId}/lock/heartbeat`),
  });
};

/**
 * Admin-force-release a lock on any pool task
 * DELETE /tasks/{id}/lock/admin → 204
 */
export const useAdminUnlockTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => axios.delete(`/tasks/${taskId}/lock/admin`),
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
    },
  });
};

/**
 * Claim a pool task into personal task list
 * POST /tasks/{id}/claim → 200
 */
export const useClaimTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => axios.post(`/tasks/${taskId}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-counts'] });
    },
  });
};

export interface ActivityTaskCount {
  activityId: string;
  myCount: number;
  poolCount: number;
}

/**
 * Per-activity My/Pool counts for the current user. Single round-trip used by
 * the sidebar task badges and the activity-page Pool tab badge.
 * GET /tasks/counts → { result: ActivityTaskCount[] }
 *
 * Activities with zero in both buckets are omitted by the backend, so consumers
 * must default to 0 when an activityId is missing from the map.
 */
export const useGetTaskCounts = () =>
  useQuery({
    queryKey: ['task-counts'],
    queryFn: async (): Promise<Map<string, ActivityTaskCount>> => {
      const { data } = await axios.get('/tasks/counts');
      const rows: ActivityTaskCount[] = data.result ?? data ?? [];
      return new Map(rows.map(r => [r.activityId, r]));
    },
    staleTime: 30 * 1000,
  });

export interface OpenTaskResult {
  isSuccess: boolean;
  errorMessage?: string;
  appraisalId?: string;
  workflowInstanceId?: string;
  taskName?: string;
}

/**
 * Open and auto-start a task (validates ownership, transitions Not Started → In Progress)
 * POST /tasks/{id}/open → 200 { isSuccess, appraisalId, workflowInstanceId, taskName }
 */
export const useOpenTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string): Promise<OpenTaskResult> => {
      const { data } = await axios.post(`/tasks/${taskId}/open`);
      return data.result ?? data;
    },
    onSuccess: result => {
      if (result.isSuccess) {
        // Task status changed (Not Started → In Progress) — invalidate both lists
        // so they reflect the new status when the user navigates back
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['task-counts'] });
      }
    },
  });
};
