import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { ProjectUnit, ProjectUnitUpload } from '../types';

// ==================== Query Keys ====================

export const projectUnitKeys = {
  /** ['appraisal', appraisalId, 'project', 'units'] */
  all: (appraisalId: string) => ['appraisal', appraisalId, 'project', 'units'] as const,
  /** ['appraisal', appraisalId, 'project', 'units', 'uploads'] */
  uploads: (appraisalId: string) =>
    ['appraisal', appraisalId, 'project', 'units', 'uploads'] as const,
};

// ==================== Response Types ====================

interface GetProjectUnitsResponse {
  units: ProjectUnit[];
  towers: string[];
  models: string[];
  totalCount: number;
}

// ==================== Hooks ====================

/**
 * List all units for a project.
 * GET /appraisals/{appraisalId}/project/units
 */
export const useGetProjectUnits = (appraisalId: string) => {
  return useQuery({
    queryKey: projectUnitKeys.all(appraisalId),
    queryFn: async (): Promise<GetProjectUnitsResponse> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/project/units`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * List all unit upload batches for a project.
 * GET /appraisals/{appraisalId}/project/units/uploads
 */
export const useGetProjectUnitUploads = (appraisalId: string) => {
  return useQuery({
    queryKey: projectUnitKeys.uploads(appraisalId),
    queryFn: async (): Promise<ProjectUnitUpload[]> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/project/units/uploads`,
      );
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Upload an Excel file to import project units.
 * POST /appraisals/{appraisalId}/project/units/upload
 *
 * Column layout differs by ProjectType (Condo vs LandAndBuilding).
 * Only .xlsx files up to 5 MB are accepted.
 */
export const useUploadProjectUnits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      file: File;
    }): Promise<{ uploadId: string; unitCount: number }> => {
      const formData = new FormData();
      formData.append('file', params.file);
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/project/units/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectUnitKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: projectUnitKeys.uploads(variables.appraisalId),
      });
    },
  });
};
