import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { ProjectUnit, ProjectUnitUpload } from '../types';
import { projectModelKeys } from './projectModel';
import { projectTowerKeys } from './projectTower';
import { projectPricingAssumptionKeys } from './projectPricingAssumption';

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
      const { data } = await axios.get(`/appraisals/${appraisalId}/project/units/uploads`);
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
      queryClient.invalidateQueries({
        queryKey: projectModelKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: projectTowerKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: projectPricingAssumptionKeys.detail(variables.appraisalId),
      });
    },
  });
};

// ── Reappraisal preview types ─────────────────────────────────────────────────

export type ReappraisalUnitStatus = 'Sold' | 'NewlySold' | 'Available' | 'MatchDifference';

export interface ReappraisalPreviewUnit {
  id: string;
  sequenceNumber: number;
  modelType: string | null;
  usableArea: number | null;
  sellingPrice: number | null;
  floor: number | null;
  towerName: string | null;
  condoRegistrationNumber: string | null;
  roomNumber: string | null;
  plotNumber: string | null;
  houseNumber: string | null;
  numberOfFloors: number | null;
  landArea: number | null;
  isSold: boolean;
  status: ReappraisalUnitStatus;
  diffFields: string[];
}

export interface ReappraisalPreviewSummary {
  total: number;
  sold: number;
  newlySold: number;
  available: number;
  matchDifference: number;
}

export interface ReappraisalPreviewResult {
  summary: ReappraisalPreviewSummary;
  units: ReappraisalPreviewUnit[];
}

// ── Reappraisal result type ───────────────────────────────────────────────────

export interface ReappraisalUploadResult {
  matchedUnsold: number;
  autoSold: number;
  added: number;
}

/**
 * Dry-run preview for a reappraisal Excel re-upload — no DB write.
 * POST /appraisals/{appraisalId}/project/units/reappraisal-preview
 */
export const useReappraisalPreview = () => {
  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      file: File;
    }): Promise<ReappraisalPreviewResult> => {
      const formData = new FormData();
      formData.append('file', params.file);
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/project/units/reappraisal-preview`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.result ?? data;
    },
  });
};

/**
 * Re-upload an Excel file for a REAPPRAISAL appraisal.
 * POST /appraisals/{appraisalId}/project/units/reappraisal-upload
 *
 * Matches rows to seeded unsold units: present rows stay UNSOLD, missing rows
 * are auto-marked SOLD, new rows are counted but NOT persisted (v1).
 * Same FormData field name as useUploadProjectUnits.
 */
export const useUploadReappraisalUnits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      file: File;
    }): Promise<ReappraisalUploadResult> => {
      const formData = new FormData();
      formData.append('file', params.file);
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/project/units/reappraisal-upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.result ?? data;
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

/**
 * Delete a unit upload batch and its associated units.
 * DELETE /appraisals/{appraisalId}/project/units/uploads/{uploadId}
 */
export const useDeleteProjectUnitUpload = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { appraisalId: string; uploadId: string }): Promise<void> => {
      await axios.delete(
        `/appraisals/${params.appraisalId}/project/units/uploads/${params.uploadId}`,
      );
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
