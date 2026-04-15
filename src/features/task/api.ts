import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { GetPoolTasksParams, GetTasksParams, PoolTaskListResponse, Task, TaskListResponse } from './types';

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
    taskStatus,
    taskType,
    dateFrom,
    dateTo,
  } = params;

  const queryKey = [
    'my-tasks',
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
      ...(taskStatus && { taskStatus }),
      ...(taskType && { taskType }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<TaskListResponse> => {
      const { data } = await axios.get('/tasks/me', {
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
          ...(taskStatus && { TaskStatus: taskStatus }),
          ...(taskType && { TaskType: taskType }),
          ...(dateFrom && { DateFrom: dateFrom }),
          ...(dateTo && { DateTo: dateTo }),
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
    taskStatus,
    taskType,
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
      ...(taskStatus && { taskStatus }),
      ...(taskType && { taskType }),
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
          ...(taskStatus && { TaskStatus: taskStatus }),
          ...(taskType && { TaskType: taskType }),
          ...(dateFrom && { DateFrom: dateFrom }),
          ...(dateTo && { DateTo: dateTo }),
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
    },
  });
};

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
    onSuccess: (result) => {
      if (result.isSuccess) {
        // Task status changed (Not Started → In Progress) — invalidate both lists
        // so they reflect the new status when the user navigates back
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
      }
    },
  });
};
