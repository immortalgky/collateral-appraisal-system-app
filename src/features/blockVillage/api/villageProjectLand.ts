import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { VillageProjectLand } from '../types';

// ==================== Query Keys ====================

export const villageProjectLandKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'village-project-land'] as const,
};

// ==================== Request Types ====================

type SaveVillageProjectLandRequest = Omit<VillageProjectLand, 'id' | 'appraisalId'>;

// ==================== Hooks ====================

/**
 * Get the village project land for an appraisal
 * GET /appraisals/{appraisalId}/village-project-land
 */
export const useGetVillageProjectLand = (appraisalId: string) => {
  return useQuery({
    queryKey: villageProjectLandKeys.all(appraisalId),
    queryFn: async (): Promise<VillageProjectLand | null> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/village-project-land`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Save (upsert) the village project land for an appraisal
 * PUT /appraisals/{appraisalId}/village-project-land
 */
export const useSaveVillageProjectLand = (appraisalId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveVillageProjectLandRequest): Promise<void> => {
      await axios.put(`/appraisals/${appraisalId}/village-project-land`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: villageProjectLandKeys.all(appraisalId),
      });
    },
  });
};
