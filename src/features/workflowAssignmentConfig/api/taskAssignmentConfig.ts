import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

/** Banking segment scope for an override. null = applies to any segment. */
export type BankingSegment = 'Retail' | 'IBG';

/** Canonical assignment-strategy tokens (mirror of the backend AssigneeSelectionStrategy enum). */
export const ASSIGNMENT_STRATEGIES = [
  'manual',
  'round_robin',
  'workload_based',
  'random',
  'previous_owner',
  'supervisor',
  'team_constrained',
  'started_by',
  'pool',
  'variable_assignee',
] as const;

export type AssignmentStrategy = (typeof ASSIGNMENT_STRATEGIES)[number];

export interface TaskAssignmentConfigDto {
  id: string;
  activityId: string;
  workflowDefinitionId: string | null;
  bankingSegment: BankingSegment | null;
  assigneeGroup: string | null;
  primaryStrategies: string[];
  routeBackStrategies: string[];
  specificAssignee: string | null;
  adminPoolId: string | null;
  escalateToAdminPool: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/** An activity of the workflow definition, with its JSON-definition baseline (what an override replaces). */
export interface WorkflowActivityOption {
  id: string;
  name: string;
  assigneeGroup: string | null;
  initialAssignmentStrategies: string[];
  revisitAssignmentStrategies: string[];
}

export interface SaveTaskAssignmentConfigBody {
  activityId: string;
  workflowDefinitionId?: string | null;
  bankingSegment?: BankingSegment | null;
  assigneeGroup?: string | null;
  primaryStrategies: string[];
  routeBackStrategies: string[];
  specificAssignee?: string | null;
  adminPoolId?: string | null;
  escalateToAdminPool: boolean;
  isActive: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────────────────────────────────────

const BASE = '/api/workflow/task-assignment-configs';

export const taskAssignmentConfigKeys = {
  all: ['task-assignment-configs'] as const,
  list: (params: Record<string, unknown>) => [...taskAssignmentConfigKeys.all, 'list', params] as const,
  activities: (workflowDefinitionId?: string) =>
    [...taskAssignmentConfigKeys.all, 'activities', workflowDefinitionId ?? 'default'] as const,
};

// ──────────────────────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────────────────────

export const useListTaskAssignmentConfigs = (params?: {
  activityId?: string;
  bankingSegment?: BankingSegment;
}) => {
  return useQuery({
    queryKey: taskAssignmentConfigKeys.list(params ?? {}),
    queryFn: async (): Promise<TaskAssignmentConfigDto[]> => {
      const { data } = await axios.get<TaskAssignmentConfigDto[]>(BASE, {
        params: {
          ...(params?.activityId && { activityId: params.activityId }),
          ...(params?.bankingSegment && { bankingSegment: params.bankingSegment }),
        },
      });
      return data ?? [];
    },
    staleTime: 30_000,
  });
};

/** Activity picker source — TaskActivities of the (default or given) workflow definition. */
export const useListWorkflowActivities = (workflowDefinitionId?: string) => {
  return useQuery({
    queryKey: taskAssignmentConfigKeys.activities(workflowDefinitionId),
    queryFn: async (): Promise<WorkflowActivityOption[]> => {
      const { data } = await axios.get<WorkflowActivityOption[]>(`${BASE}/activities`, {
        params: workflowDefinitionId ? { workflowDefinitionId } : undefined,
      });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
};

export const useCreateTaskAssignmentConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SaveTaskAssignmentConfigBody): Promise<TaskAssignmentConfigDto> => {
      const { data } = await axios.post<TaskAssignmentConfigDto>(BASE, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskAssignmentConfigKeys.all });
    },
  });
};

export const useUpdateTaskAssignmentConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: SaveTaskAssignmentConfigBody;
    }): Promise<TaskAssignmentConfigDto> => {
      const { data } = await axios.put<TaskAssignmentConfigDto>(`${BASE}/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskAssignmentConfigKeys.all });
    },
  });
};

export const useDeleteTaskAssignmentConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`${BASE}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskAssignmentConfigKeys.all });
    },
  });
};
