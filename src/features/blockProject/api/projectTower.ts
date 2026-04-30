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

// ==================== Image Hooks ====================

/**
 * Link a gallery photo to a project tower.
 * POST /appraisals/{appraisalId}/project/towers/{towerId}/images
 */
export const useAddProjectTowerImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityId,
      appraisalId,
      galleryPhotoId,
      title,
      description,
    }: {
      entityId: string;
      appraisalId: string;
      galleryPhotoId: string;
      title?: string | null;
      description?: string | null;
    }): Promise<{ id: string }> => {
      const { data } = await axios.post(
        `/appraisals/${appraisalId}/project/towers/${entityId}/images`,
        { galleryPhotoId, title, description },
      );
      return { id: data.id ?? data.imageId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.detail(variables.appraisalId, variables.entityId),
      });
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'gallery'],
      });
    },
  });
};

/**
 * Remove a linked image from a project tower.
 * DELETE /appraisals/{appraisalId}/project/towers/{towerId}/images/{imageId}
 */
export const useRemoveProjectTowerImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityId,
      imageId,
      appraisalId,
    }: {
      entityId: string;
      imageId: string;
      appraisalId: string;
    }): Promise<void> => {
      await axios.delete(
        `/appraisals/${appraisalId}/project/towers/${entityId}/images/${imageId}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.detail(variables.appraisalId, variables.entityId),
      });
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Set a tower image as the cover/thumbnail.
 * PUT /appraisals/{appraisalId}/project/towers/{towerId}/images/{imageId}/set-thumbnail
 */
export const useSetProjectTowerImageThumbnail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityId,
      imageId,
      appraisalId,
    }: {
      entityId: string;
      imageId: string;
      appraisalId: string;
    }): Promise<void> => {
      await axios.put(
        `/appraisals/${appraisalId}/project/towers/${entityId}/images/${imageId}/set-thumbnail`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.detail(variables.appraisalId, variables.entityId),
      });
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Remove the cover/thumbnail designation from a tower image.
 * PUT /appraisals/{appraisalId}/project/towers/{towerId}/images/{imageId}/unset-thumbnail
 */
export const useUnsetProjectTowerImageThumbnail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityId,
      imageId,
      appraisalId,
    }: {
      entityId: string;
      imageId: string;
      appraisalId: string;
    }): Promise<void> => {
      await axios.put(
        `/appraisals/${appraisalId}/project/towers/${entityId}/images/${imageId}/unset-thumbnail`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.detail(variables.appraisalId, variables.entityId),
      });
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.all(variables.appraisalId),
      });
    },
  });
};
