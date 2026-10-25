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
 * The stored `projectType` is the source of truth, not the route: `block-village` serves both LB
 * and L, so a route-vs-stored mismatch must not blank the project. BlockProjectPage reads the type
 * off the result and hands it to every tab.
 */
export const useGetProject = (appraisalId: string) => {
  return useQuery({
    queryKey: projectKeys.detail(appraisalId),
    queryFn: async (): Promise<Project | null> => {
      const { data } = await axios.get<Project | null>(`/appraisals/${appraisalId}/project`);
      return data ?? null;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Change the project type for an appraisal.
 * POST /appraisals/{appraisalId}/project:change-type
 *
 * Destroys type-specific fields and all children, preserving shared fields.
 * Returns the new project (same shape as GET /project) so the caller can
 * hydrate without a follow-up GET.
 * - 404 if no project exists.
 * - 400 if newProjectType equals the current type.
 */
export const useChangeProjectType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      newProjectType: ProjectType;
    }): Promise<Project> => {
      const { data } = await axios.post<Project>(
        `/appraisals/${params.appraisalId}/project:change-type`,
        { newProjectType: params.newProjectType },
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

/**
 * Save (upsert) the project for an appraisal.
 *
 * - Final save:  PUT /appraisals/{appraisalId}/project        (strict validation)
 * - Draft save:  PUT /appraisals/{appraisalId}/project/draft  (lenient validation)
 *
 * Pass `isDraft: true` to target the draft endpoint.
 * Invalidates everything under ['appraisal', appraisalId, 'project'] on success.
 */
export const useSaveProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: SaveProjectRequest;
      isDraft?: boolean;
    }): Promise<{ id: string }> => {
      const url = params.isDraft
        ? `/appraisals/${params.appraisalId}/project/draft`
        : `/appraisals/${params.appraisalId}/project`;
      const { data } = await axios.put(url, params.data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.appraisalId),
      });
    },
  });
};
