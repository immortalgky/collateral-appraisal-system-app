import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { VillageProject } from '../types';

// ==================== Query Keys ====================

export const villageProjectKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'village-project'] as const,
};

// ==================== Request Types ====================

type SaveVillageProjectRequest = Omit<VillageProject, 'id' | 'appraisalId'>;

// ==================== Hooks ====================

/**
 * Get the village project for an appraisal
 * GET /appraisals/{appraisalId}/village-project
 */
export const useGetVillageProject = (appraisalId: string) => {
  return useQuery({
    queryKey: villageProjectKeys.all(appraisalId),
    queryFn: async (): Promise<VillageProject | null> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/village-project`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Save (upsert) the village project for an appraisal
 * PUT /appraisals/{appraisalId}/village-project
 */
export const useSaveVillageProject = (appraisalId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveVillageProjectRequest): Promise<void> => {
      await axios.put(`/appraisals/${appraisalId}/village-project`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: villageProjectKeys.all(appraisalId),
      });
    },
  });
};
