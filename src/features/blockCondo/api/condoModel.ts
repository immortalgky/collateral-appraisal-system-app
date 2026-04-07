import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';
import type { CondoModel } from '../types';

// ==================== Query Keys ====================

export const condoModelKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'condo-models'] as const,
  detail: (appraisalId: string, modelId: string) =>
    ['appraisal', appraisalId, 'condo-models', modelId] as const,
};

// ==================== Request Types ====================

type CreateCondoModelRequest = Omit<CondoModel, 'id' | 'appraisalId'>;
type UpdateCondoModelRequest = Omit<CondoModel, 'id' | 'appraisalId'>;

// ==================== Hooks ====================

/**
 * List all condo models for an appraisal
 * GET /appraisals/{appraisalId}/condo-models
 */
export const useGetCondoModels = (appraisalId: string) => {
  return useQuery({
    queryKey: condoModelKeys.all(appraisalId),
    queryFn: async (): Promise<CondoModel[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/condo-models`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Get a single condo model by ID
 * GET /appraisals/{appraisalId}/condo-models/{modelId}
 */
export const useGetCondoModelById = (appraisalId: string, modelId?: string) => {
  return useQuery({
    queryKey: condoModelKeys.detail(appraisalId, modelId!),
    queryFn: async (): Promise<CondoModel> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/condo-models/${modelId}`);
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
 * Create a new condo model
 * POST /appraisals/{appraisalId}/condo-models
 */
export const useCreateCondoModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: CreateCondoModelRequest;
    }): Promise<{ id: string }> => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/condo-models`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: condoModelKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Update an existing condo model
 * PUT /appraisals/{appraisalId}/condo-models/{modelId}
 */
export const useUpdateCondoModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      modelId: string;
      data: UpdateCondoModelRequest;
    }): Promise<void> => {
      await axios.put(
        `/appraisals/${params.appraisalId}/condo-models/${params.modelId}`,
        params.data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: condoModelKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: condoModelKeys.detail(variables.appraisalId, variables.modelId),
      });
    },
  });
};

/**
 * Delete a condo model
 * DELETE /appraisals/{appraisalId}/condo-models/{modelId}
 */
export const useDeleteCondoModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      modelId: string;
    }): Promise<void> => {
      await axios.delete(`/appraisals/${params.appraisalId}/condo-models/${params.modelId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: condoModelKeys.all(variables.appraisalId),
      });
    },
  });
};
