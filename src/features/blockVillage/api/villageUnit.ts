import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { VillageUnit, VillageUnitUpload } from '../types';

// ==================== Query Keys ====================

export const villageUnitKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'village-units'] as const,
  uploads: (appraisalId: string) => ['appraisal', appraisalId, 'village-unit-uploads'] as const,
};

// ==================== Hooks ====================

/**
 * Upload a spreadsheet to import village units
 * POST /appraisals/{appraisalId}/village-units/upload
 */
export const useUploadVillageUnits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      file: File;
    }): Promise<{ uploadId: string; unitCount: number }> => {
      const formData = new FormData();
      formData.append('file', params.file);
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/village-units/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: villageUnitKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: villageUnitKeys.uploads(variables.appraisalId),
      });
    },
  });
};

/**
 * List all village units for an appraisal
 * GET /appraisals/{appraisalId}/village-units
 */
export const useGetVillageUnits = (appraisalId: string) => {
  return useQuery({
    queryKey: villageUnitKeys.all(appraisalId),
    queryFn: async (): Promise<{ units: VillageUnit[]; modelNames: string[]; totalCount: number }> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/village-units`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * List all village unit upload records for an appraisal
 * GET /appraisals/{appraisalId}/village-unit-uploads
 */
export const useGetVillageUnitUploads = (appraisalId: string) => {
  return useQuery({
    queryKey: villageUnitKeys.uploads(appraisalId),
    queryFn: async (): Promise<{ uploads: VillageUnitUpload[] }> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/village-unit-uploads`);
      return data;
    },
    enabled: !!appraisalId,
  });
};
