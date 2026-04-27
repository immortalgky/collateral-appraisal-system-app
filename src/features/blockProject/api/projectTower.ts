import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';
import type { ProjectTower } from '../types';

// ==================== Query Keys ====================

export const projectTowerKeys = {
  /** ['appraisal', appraisalId, 'project', 'towers'] */
  all: (appraisalId: string) => ['appraisal', appraisalId, 'project', 'towers'] as const,
  /** ['appraisal', appraisalId, 'project', 'towers', towerId] */
  detail: (appraisalId: string, towerId: string) =>
    ['appraisal', appraisalId, 'project', 'towers', towerId] as const,
};

// ==================== Request Types ====================

type CreateProjectTowerRequest = Omit<ProjectTower, 'id' | 'projectId'>;
type UpdateProjectTowerRequest = Omit<ProjectTower, 'id' | 'projectId'>;

// ==================== Hooks ====================

/**
 * List all towers for a project (Condo only — BE returns empty list for LandAndBuilding).
 * GET /appraisals/{appraisalId}/project/towers
 */
export const useGetProjectTowers = (appraisalId: string) => {
  return useQuery({
    queryKey: projectTowerKeys.all(appraisalId),
    queryFn: async (): Promise<ProjectTower[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/project/towers`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Get a single tower by ID.
 * GET /appraisals/{appraisalId}/project/towers/{towerId}
 */
export const useGetProjectTowerById = (appraisalId: string, towerId?: string) => {
  return useQuery({
    queryKey: projectTowerKeys.detail(appraisalId, towerId!),
    queryFn: async (): Promise<ProjectTower> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/project/towers/${towerId}`,
      );
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
 * Create a new tower within a Condo project.
 * POST /appraisals/{appraisalId}/project/towers
 *
 * Note: BE returns 400 if the project is LandAndBuilding — surface via error handling.
 */
export const useCreateProjectTower = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: CreateProjectTowerRequest;
    }): Promise<{ id: string }> => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/project/towers`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Update an existing tower.
 * PUT /appraisals/{appraisalId}/project/towers/{towerId}
 */
export const useUpdateProjectTower = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      towerId: string;
      data: UpdateProjectTowerRequest;
    }): Promise<void> => {
      await axios.put(
        `/appraisals/${params.appraisalId}/project/towers/${params.towerId}`,
        params.data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.detail(variables.appraisalId, variables.towerId),
      });
    },
  });
};

/**
 * Delete a tower.
 * DELETE /appraisals/{appraisalId}/project/towers/{towerId}
 */
export const useDeleteProjectTower = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      towerId: string;
    }): Promise<void> => {
      await axios.delete(
        `/appraisals/${params.appraisalId}/project/towers/${params.towerId}`,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.all(variables.appraisalId),
      });
    },
  });
};
