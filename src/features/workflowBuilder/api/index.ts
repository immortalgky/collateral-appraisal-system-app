import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@shared/api/axiosInstance';
import { workflowKeys } from './queryKeys';
import type {
  WorkflowDefinitionSummary,
  WorkflowDefinitionVersion,
  WorkflowSchema,
  ActivityTypeDefinition,
  PublishImpactReport,
  PublishVersionResponse,
  RunningInstanceSummary,
  MigrateInstancesRequest,
  MigrateInstancesResult,
} from '../types';

// === Activity Types ===

export function useGetActivityTypes() {
  return useQuery({
    queryKey: workflowKeys.activityTypes(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        activityTypes: ActivityTypeDefinition[];
      }>('/api/workflows/activity-types');
      return data.activityTypes;
    },
    staleTime: 1000 * 60 * 30,
  });
}

// === Definitions ===

export function useGetDefinitions() {
  return useQuery({
    queryKey: workflowKeys.definitions(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        definitions: WorkflowDefinitionSummary[];
      }>('/api/workflows/definitions');
      return data.definitions;
    },
  });
}

export function useCreateDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      category: string;
      workflowSchema: WorkflowSchema;
      createdBy: string;
    }) => {
      const { data } = await axiosInstance.post<{
        id: string;
        versionId: string;
        name: string;
        version: number;
        isValid: boolean;
        validationErrors: string[];
      }>('/api/workflows/definitions', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.definitions() });
    },
  });
}

export function useUpdateDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      definitionId,
      ...payload
    }: {
      definitionId: string;
      name: string;
      description: string;
      category: string;
      isActive: boolean;
      updatedBy: string;
    }) => {
      const { data } = await axiosInstance.put(
        `/api/workflows/definitions/${definitionId}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.definitions() });
    },
  });
}

// === Versions ===

export function useGetVersions(definitionId: string) {
  return useQuery({
    queryKey: workflowKeys.versions(definitionId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        versions: WorkflowDefinitionVersion[];
      }>(`/api/workflows/definitions/${definitionId}/versions`);
      return data.versions;
    },
    enabled: !!definitionId,
  });
}

export function useGetVersion(definitionId: string, versionId: string) {
  return useQuery({
    queryKey: workflowKeys.version(definitionId, versionId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<WorkflowDefinitionVersion>(
        `/api/workflows/definitions/${definitionId}/versions/${versionId}`,
      );
      return data;
    },
    enabled: !!definitionId && !!versionId,
  });
}

export function useGetLatestVersion(definitionId: string) {
  return useQuery({
    queryKey: workflowKeys.latestVersion(definitionId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<WorkflowDefinitionVersion>(
        `/api/workflows/definitions/${definitionId}/latest-version`,
      );
      return data;
    },
    enabled: !!definitionId && definitionId !== 'new',
  });
}

export function useCreateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      definitionId,
      createdBy,
    }: {
      definitionId: string;
      createdBy: string;
    }) => {
      const { data } = await axiosInstance.post<{
        isSuccess: boolean;
        versionId: string;
        version: number;
        errorMessage: string | null;
      }>(`/api/workflows/definitions/${definitionId}/versions`, { createdBy });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.versions(variables.definitionId),
      });
      queryClient.invalidateQueries({
        queryKey: workflowKeys.latestVersion(variables.definitionId),
      });
    },
  });
}

export function useSaveDraftSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      definitionId,
      versionId,
      workflowSchema,
      updatedBy,
    }: {
      definitionId: string;
      versionId: string;
      workflowSchema: WorkflowSchema;
      updatedBy: string;
    }) => {
      const { data } = await axiosInstance.put<{
        isSuccess: boolean;
        errorMessage: string | null;
      }>(
        `/api/workflows/definitions/${definitionId}/versions/${versionId}/schema`,
        { workflowSchema, updatedBy },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.version(
          variables.definitionId,
          variables.versionId,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: workflowKeys.latestVersion(variables.definitionId),
      });
    },
  });
}

export function usePublishVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      definitionId,
      versionId,
      publishedBy,
      confirmedBreakingChangeHash,
    }: {
      definitionId: string;
      versionId: string;
      publishedBy: string;
      confirmedBreakingChangeHash?: string;
    }) => {
      try {
        const { data } = await axiosInstance.post<PublishVersionResponse>(
          `/api/workflows/definitions/${definitionId}/versions/${versionId}/publish`,
          { publishedBy, confirmedBreakingChangeHash },
        );
        return data;
      } catch (err: unknown) {
        // 409 means breaking changes shifted between preview and confirm — surface the new report
        if (
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { status?: number; data?: unknown } }).response
            ?.status === 409
        ) {
          const resp = (
            err as { response: { data: { impactReport?: PublishImpactReport } } }
          ).response.data;
          const conflict = new Error('Breaking changes updated') as Error & {
            impactReport?: PublishImpactReport;
          };
          conflict.impactReport = resp.impactReport;
          throw conflict;
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.versions(variables.definitionId),
      });
      queryClient.invalidateQueries({
        queryKey: workflowKeys.latestVersion(variables.definitionId),
      });
      queryClient.invalidateQueries({
        queryKey: workflowKeys.definitions(),
      });
    },
  });
}

export function usePreviewPublish() {
  return useMutation({
    mutationFn: async ({
      definitionId,
      versionId,
    }: {
      definitionId: string;
      versionId: string;
    }) => {
      const { data } = await axiosInstance.post<PublishImpactReport>(
        `/api/workflows/definitions/${definitionId}/versions/${versionId}/publish/preview`,
      );
      return data;
    },
  });
}

export function useListRunningInstances(
  definitionId: string,
  options?: { versionId?: string },
) {
  return useQuery({
    queryKey: workflowKeys.runningInstances(definitionId, options?.versionId),
    queryFn: async () => {
      const params = options?.versionId ? `?versionId=${options.versionId}` : '';
      const { data } = await axiosInstance.get<{
        instances: RunningInstanceSummary[];
      }>(`/api/workflows/definitions/${definitionId}/instances${params}`);
      return data.instances;
    },
    enabled: !!definitionId && definitionId !== 'new',
  });
}

export function useMigrateInstances(
  definitionId: string,
  targetVersionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MigrateInstancesRequest) => {
      const { data } = await axiosInstance.post<MigrateInstancesResult>(
        `/api/workflows/definitions/${definitionId}/versions/${targetVersionId}/migrate`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.runningInstances(definitionId),
      });
    },
  });
}

export function useDeleteDraftVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      definitionId,
      versionId,
    }: {
      definitionId: string;
      versionId: string;
    }) => {
      await axiosInstance.delete(
        `/api/workflows/definitions/${definitionId}/versions/${versionId}`,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.versions(variables.definitionId),
      });
      queryClient.invalidateQueries({
        queryKey: workflowKeys.latestVersion(variables.definitionId),
      });
    },
  });
}

