import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';
import type { VillageModel } from '../types';

// ==================== Query Keys ====================

export const villageModelKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'village-models'] as const,
  detail: (appraisalId: string, modelId: string) =>
    ['appraisal', appraisalId, 'village-models', modelId] as const,
};

// ==================== Request Types ====================

type CreateVillageModelRequest = Omit<VillageModel, 'id' | 'appraisalId'>;
type UpdateVillageModelRequest = Omit<VillageModel, 'id' | 'appraisalId'>;

// ==================== Hooks ====================

/**
 * List all village models for an appraisal
 * GET /appraisals/{appraisalId}/village-models
 */
export const useGetVillageModels = (appraisalId: string) => {
  return useQuery({
    queryKey: villageModelKeys.all(appraisalId),
    queryFn: async (): Promise<VillageModel[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/village-models`);
      return data.models ?? data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Get a single village model by ID
 * GET /appraisals/{appraisalId}/village-models/{modelId}
 */
export const useGetVillageModelById = (appraisalId: string, modelId?: string) => {
  return useQuery({
    queryKey: villageModelKeys.detail(appraisalId, modelId!),
    queryFn: async (): Promise<VillageModel> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/village-models/${modelId}`);
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
 * Create a new village model
 * POST /appraisals/{appraisalId}/village-models
 */
export const useCreateVillageModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: CreateVillageModelRequest;
    }): Promise<{ id: string }> => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/village-models`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: villageModelKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Update an existing village model
 * PUT /appraisals/{appraisalId}/village-models/{modelId}
 */
export const useUpdateVillageModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      modelId: string;
      data: UpdateVillageModelRequest;
    }): Promise<void> => {
      await axios.put(
        `/appraisals/${params.appraisalId}/village-models/${params.modelId}`,
        params.data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: villageModelKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: villageModelKeys.detail(variables.appraisalId, variables.modelId),
      });
    },
  });
};

/**
 * Delete a village model
 * DELETE /appraisals/{appraisalId}/village-models/{modelId}
 */
export const useDeleteVillageModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      modelId: string;
    }): Promise<void> => {
      await axios.delete(`/appraisals/${params.appraisalId}/village-models/${params.modelId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: villageModelKeys.all(variables.appraisalId),
      });
    },
  });
};
