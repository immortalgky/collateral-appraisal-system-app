import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { CondoUnit, CondoUnitUpload } from '../types';

// ==================== Query Keys ====================

export const condoUnitKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'condo-units'] as const,
  uploads: (appraisalId: string) => ['appraisal', appraisalId, 'condo-unit-uploads'] as const,
};

// ==================== Hooks ====================

/**
 * Upload a spreadsheet to import condo units
 * POST /appraisals/{appraisalId}/condo-units/upload
 */
export const useUploadCondoUnits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      file: File;
    }): Promise<{ uploadId: string; units: CondoUnit[] }> => {
      const formData = new FormData();
      formData.append('file', params.file);
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/condo-units/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: condoUnitKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: condoUnitKeys.uploads(variables.appraisalId),
      });
    },
  });
};

/**
 * List all condo units for an appraisal
 * GET /appraisals/{appraisalId}/condo-units
 */
export const useGetCondoUnits = (appraisalId: string) => {
  return useQuery({
    queryKey: condoUnitKeys.all(appraisalId),
    queryFn: async (): Promise<CondoUnit[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/condo-units`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * List all condo unit upload records for an appraisal
 * GET /appraisals/{appraisalId}/condo-unit-uploads
 */
export const useGetCondoUnitUploads = (appraisalId: string) => {
  return useQuery({
    queryKey: condoUnitKeys.uploads(appraisalId),
    queryFn: async (): Promise<CondoUnitUpload[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/condo-unit-uploads`);
      return data;
    },
    enabled: !!appraisalId,
  });
};
