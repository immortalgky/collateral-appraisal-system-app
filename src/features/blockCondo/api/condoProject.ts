import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { CondoProject } from '../types';

// ==================== Query Keys ====================

export const condoProjectKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'condo-project'] as const,
};

// ==================== Request Types ====================

type SaveCondoProjectRequest = Omit<CondoProject, 'id' | 'appraisalId'>;

// ==================== Hooks ====================

/**
 * Get the condo project for an appraisal
 * GET /appraisals/{appraisalId}/condo-project
 */
export const useGetCondoProject = (appraisalId: string) => {
  return useQuery({
    queryKey: condoProjectKeys.all(appraisalId),
    queryFn: async (): Promise<CondoProject> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/condo-project`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Save (upsert) the condo project for an appraisal
 * PUT /appraisals/{appraisalId}/condo-project
 */
export const useSaveCondoProject = (appraisalId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveCondoProjectRequest): Promise<void> => {
      await axios.put(`/appraisals/${appraisalId}/condo-project`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: condoProjectKeys.all(appraisalId),
      });
    },
  });
};
