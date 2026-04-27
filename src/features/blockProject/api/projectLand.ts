import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { ProjectLand } from '../types';

// ==================== Query Keys ====================

export const projectLandKeys = {
  /** ['appraisal', appraisalId, 'project', 'land'] */
  detail: (appraisalId: string) => ['appraisal', appraisalId, 'project', 'land'] as const,
};

// ==================== Request Types ====================

/**
 * id, projectId, and totalLandAreaInSqWa are server-owned/computed.
 * titles: optional array of land title objects to save.
 */
type SaveProjectLandRequest = Omit<
  ProjectLand,
  'id' | 'projectId' | 'totalLandAreaInSqWa' | 'titles'
> & {
  titles?: ProjectLand['titles'];
};

// ==================== Hooks ====================

/**
 * Get project land details (LandAndBuilding only).
 * GET /appraisals/{appraisalId}/project/land
 *
 * Returns 204 (null) if no land has been saved yet, or if the project is Condo.
 */
export const useGetProjectLand = (appraisalId: string) => {
  return useQuery({
    queryKey: projectLandKeys.detail(appraisalId),
    queryFn: async (): Promise<ProjectLand | null> => {
      const { data } = await axios.get<ProjectLand | null>(
        `/appraisals/${appraisalId}/project/land`,
      );
      return data ?? null;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Save (upsert) project land details (LandAndBuilding only).
 * PUT /appraisals/{appraisalId}/project/land
 *
 * Note: BE rejects if the project is Condo — surface via error handling.
 */
export const useSaveProjectLand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: SaveProjectLandRequest;
    }): Promise<void> => {
      await axios.put(`/appraisals/${params.appraisalId}/project/land`, params.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectLandKeys.detail(variables.appraisalId),
      });
    },
  });
};
