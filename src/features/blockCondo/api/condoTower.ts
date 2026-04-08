import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';
import type { CondoTower } from '../types';

// ==================== Query Keys ====================

export const condoTowerKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'condo-towers'] as const,
  detail: (appraisalId: string, towerId: string) =>
    ['appraisal', appraisalId, 'condo-towers', towerId] as const,
};

// ==================== Request Types ====================

type CreateCondoTowerRequest = Omit<CondoTower, 'id' | 'appraisalId'>;
type UpdateCondoTowerRequest = Omit<CondoTower, 'id' | 'appraisalId'>;

// ==================== Hooks ====================

/**
 * List all condo towers for an appraisal
 * GET /appraisals/{appraisalId}/condo-towers
 */
export const useGetCondoTowers = (appraisalId: string) => {
  return useQuery({
    queryKey: condoTowerKeys.all(appraisalId),
    queryFn: async (): Promise<CondoTower[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/condo-towers`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Get a single condo tower by ID
 * GET /appraisals/{appraisalId}/condo-towers/{towerId}
 */
export const useGetCondoTowerById = (appraisalId: string, towerId?: string) => {
  return useQuery({
    queryKey: condoTowerKeys.detail(appraisalId, towerId!),
    queryFn: async (): Promise<CondoTower> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/condo-towers/${towerId}`);
      return data;
    },
    enabled: !!appraisalId && !!towerId,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

/**
 * Create a new condo tower
 * POST /appraisals/{appraisalId}/condo-towers
 */
export const useCreateCondoTower = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: CreateCondoTowerRequest;
    }): Promise<{ id: string }> => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/condo-towers`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: condoTowerKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Update an existing condo tower
 * PUT /appraisals/{appraisalId}/condo-towers/{towerId}
 */
export const useUpdateCondoTower = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      towerId: string;
      data: UpdateCondoTowerRequest;
    }): Promise<void> => {
      await axios.put(
        `/appraisals/${params.appraisalId}/condo-towers/${params.towerId}`,
        params.data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: condoTowerKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: condoTowerKeys.detail(variables.appraisalId, variables.towerId),
      });
    },
  });
};

/**
 * Delete a condo tower
 * DELETE /appraisals/{appraisalId}/condo-towers/{towerId}
 */
export const useDeleteCondoTower = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      towerId: string;
    }): Promise<void> => {
      await axios.delete(`/appraisals/${params.appraisalId}/condo-towers/${params.towerId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: condoTowerKeys.all(variables.appraisalId),
      });
    },
  });
};
