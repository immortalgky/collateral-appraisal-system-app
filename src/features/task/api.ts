import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { GetTasksParams, Task, TaskListResponse } from './types';

/**
 * Hook for fetching a paginated list of tasks for the current user
 * GET /tasks/me
 */
export const useGetTasks = (params: GetTasksParams = {}) => {
  const {
    pageNumber = 0,
    pageSize = 10,
    taskName,
    status,
    priority,
  } = params;

  const queryKey = [
    'my-tasks',
    {
      pageNumber,
      pageSize,
      ...(taskName && { taskName }),
      ...(status && { status }),
      ...(priority && { priority }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<TaskListResponse> => {
      const { data } = await axios.get('/tasks/me', {
        params: {
          PageNumber: pageNumber,
          PageSize: pageSize,
          ...(taskName && { TaskName: taskName }),
          ...(status && { Status: status }),
          ...(priority && { Priority: priority }),
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
  const { taskName, status, priority } = params;

  const queryKey = [
    'my-tasks-kanban',
    {
      ...(taskName && { taskName }),
      ...(status && { status }),
      ...(priority && { priority }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<Task[]> => {
      const { data } = await axios.get('/tasks/me', {
        params: {
          PageNumber: 0,
          PageSize: 200,
          ...(taskName && { TaskName: taskName }),
          ...(status && { Status: status }),
          ...(priority && { Priority: priority }),
        },
      });

      const result = data.result ?? data;
      return result.items ?? [];
    },
    staleTime: 30 * 1000,
  });
};
