import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { Project, ProjectType } from '../types';

// ==================== Query Keys ====================

export const projectKeys = {
  /** ['appraisal', appraisalId, 'project'] */
  detail: (appraisalId: string) => ['appraisal', appraisalId, 'project'] as const,
};

// ==================== Request Types ====================

/** Fields the client sends when creating or updating a project. The backend
 *  computes/stores id and appraisalId, so we exclude them from the payload. */
type SaveProjectRequest = Omit<Project, 'id' | 'appraisalId'>;

// ==================== Hooks ====================

/**
 * Get the project for an appraisal.
 * GET /appraisals/{appraisalId}/project
 *
 * Returns 204 (null) if no project exists yet.
 *
 * When `expectedType` is provided, the hook returns `null` if the fetched
 * project's projectType does not match — this prevents a Condo page from
 * accidentally rendering LandAndBuilding data after a project-type switch.
 */
export const useGetProject = (appraisalId: string, expectedType?: ProjectType) => {
  return useQuery({
    queryKey: projectKeys.detail(appraisalId),
    queryFn: async (): Promise<Project | null> => {
      const { data } = await axios.get<Project | null>(`/appraisals/${appraisalId}/project`);
      if (!data) return null;
      if (expectedType && data.projectType !== expectedType) return null;
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Save (upsert) the project for an appraisal.
 * PUT /appraisals/{appraisalId}/project
 *
 * Invalidates everything under ['appraisal', appraisalId, 'project'] so that
 * towers, models, units etc. are re-fetched if the project type changed.
 */
export const useSaveProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: SaveProjectRequest;
    }): Promise<{ id: string }> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/project`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.appraisalId),
      });
    },
  });
};
