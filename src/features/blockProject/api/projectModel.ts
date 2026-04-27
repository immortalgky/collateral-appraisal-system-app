import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';
import type { ProjectModel } from '../types';

// ==================== Query Keys ====================

export const projectModelKeys = {
  /** ['appraisal', appraisalId, 'project', 'models'] */
  all: (appraisalId: string) => ['appraisal', appraisalId, 'project', 'models'] as const,
  /** ['appraisal', appraisalId, 'project', 'models', modelId] */
  detail: (appraisalId: string, modelId: string) =>
    ['appraisal', appraisalId, 'project', 'models', modelId] as const,
};

// ==================== Request Types ====================

type CreateProjectModelRequest = Omit<ProjectModel, 'id' | 'projectId'>;
type UpdateProjectModelRequest = Omit<ProjectModel, 'id' | 'projectId'>;

// ==================== Hooks ====================

/**
 * List all models for a project (works for both Condo and LandAndBuilding).
 * GET /appraisals/{appraisalId}/project/models
 */
export const useGetProjectModels = (appraisalId: string) => {
  return useQuery({
    queryKey: projectModelKeys.all(appraisalId),
    queryFn: async (): Promise<ProjectModel[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/project/models`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Get a single model by ID.
 * GET /appraisals/{appraisalId}/project/models/{modelId}
 */
export const useGetProjectModelById = (appraisalId: string, modelId?: string) => {
  return useQuery({
    queryKey: projectModelKeys.detail(appraisalId, modelId!),
    queryFn: async (): Promise<ProjectModel> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/project/models/${modelId}`,
      );
      return data;
    },
    enabled: !!appraisalId && !!modelId,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

/**
 * Create a new model within a project.
 * POST /appraisals/{appraisalId}/project/models
 */
export const useCreateProjectModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: CreateProjectModelRequest;
    }): Promise<{ id: string }> => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/project/models`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectModelKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Update an existing model.
 * PUT /appraisals/{appraisalId}/project/models/{modelId}
 */
export const useUpdateProjectModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      modelId: string;
      data: UpdateProjectModelRequest;
    }): Promise<void> => {
      await axios.put(
        `/appraisals/${params.appraisalId}/project/models/${params.modelId}`,
        params.data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectModelKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: projectModelKeys.detail(variables.appraisalId, variables.modelId),
      });
    },
  });
};

/**
 * Delete a model.
 * DELETE /appraisals/{appraisalId}/project/models/{modelId}
 */
export const useDeleteProjectModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      modelId: string;
    }): Promise<void> => {
      await axios.delete(
        `/appraisals/${params.appraisalId}/project/models/${params.modelId}`,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectModelKeys.all(variables.appraisalId),
      });
    },
  });
};
