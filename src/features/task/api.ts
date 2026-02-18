import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { GetTasksParams, Task, TaskListResponse } from './types';

/**
 * Hook for fetching a paginated list of tasks
 * GET /tasks
 */
export const useGetTasks = (params: GetTasksParams = {}) => {
  const {
    pageNumber = 0,
    pageSize = 10,
    search,
    status,
    taskType,
    propertyType,
    purpose,
    sortBy,
    sortDirection = 'asc',
  } = params;

  const queryKey = [
    'tasks',
    {
      pageNumber,
      pageSize,
      ...(search && { search }),
      ...(status && { status }),
      ...(taskType && { taskType }),
      ...(propertyType && { propertyType }),
      ...(purpose && { purpose }),
      ...(sortBy && { sortBy }),
      ...(sortDirection && sortBy && { sortDirection }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<TaskListResponse> => {
      const { data } = await axios.get('/tasks', {
        params: {
          PageNumber: pageNumber,
          PageSize: pageSize,
          ...(search && { Search: search }),
          ...(status && { Status: status }),
          ...(taskType && { TaskType: taskType }),
          ...(propertyType && { PropertyType: propertyType }),
          ...(purpose && { Purpose: purpose }),
          ...(sortBy && { SortBy: sortBy }),
          ...(sortBy && { SortDirection: sortDirection }),
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
 * GET /tasks
 */
export const useGetTasksForKanban = (
  params: Omit<GetTasksParams, 'pageNumber' | 'pageSize'> = {},
) => {
  const { search, status, taskType, propertyType, purpose } = params;

  const queryKey = [
    'tasks-kanban',
    {
      ...(search && { search }),
      ...(status && { status }),
      ...(taskType && { taskType }),
      ...(propertyType && { propertyType }),
      ...(purpose && { purpose }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<Task[]> => {
      const { data } = await axios.get('/tasks', {
        params: {
          PageNumber: 0,
          PageSize: 200,
          ...(search && { Search: search }),
          ...(status && { Status: status }),
          ...(taskType && { TaskType: taskType }),
          ...(propertyType && { PropertyType: propertyType }),
          ...(purpose && { Purpose: purpose }),
        },
      });

      const result = data.result ?? data;
      return result.items ?? [];
    },
    staleTime: 30 * 1000,
  });
};
