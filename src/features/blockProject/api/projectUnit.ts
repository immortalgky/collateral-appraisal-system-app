import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { ProjectUnit, ProjectUnitUpload } from '../types';
import { projectModelKeys } from './projectModel';
import { projectUnitPriceKeys } from './projectUnitPrice';
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
  /** Every unit of the project, sold ones included — each carries isSold. */
  units: ProjectUnit[];
  towers: string[];
  models: string[];
  totalCount: number;
  /** The subset still to be sold. */
  remainingCount: number;
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
  /** Field names that differ from the workbook, e.g. ['sellingPrice', 'landArea']. */
  diffFields: string[];
  /** The workbook's value for each field in diffFields. Empty unless status is MatchDifference. */
  incomingValues: Record<string, string | number | null>;
}

/**
 * A workbook row that matches nothing in the project — what applying the file would ADD.
 * It has no id or sequence number because it does not exist yet; both are assigned on apply.
 */
export interface ReappraisalAddedUnit {
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
}

export interface ReappraisalPreviewSummary {
  total: number;
  sold: number;
  newlySold: number;
  available: number;
  matchDifference: number;
  added: number;
}

export interface ReappraisalPreviewResult {
  summary: ReappraisalPreviewSummary;
  units: ReappraisalPreviewUnit[];
  addedUnits: ReappraisalAddedUnit[];
}

// ── Reappraisal result type ───────────────────────────────────────────────────

export interface ReappraisalUploadResult {
  matchedUnsold: number;
  autoSold: number;
  added: number;
  updated: number;
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
 * Matches rows to seeded units: present rows stay UNSOLD, missing unsold rows are
 * auto-marked SOLD. Attribute changes and new rows are applied too, but ONLY when
 * confirmUpdates is set — without it the server rejects the file with 400 so the user
 * reviews the preview first. Same FormData field name as useUploadProjectUnits.
 *
 * confirmUpdates travels in the QUERY STRING, not the multipart body: a bare bool? in a
 * minimal API binds from route and query only, so a form field would be silently ignored
 * and the request would still come back 400.
 */
export const useUploadReappraisalUnits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      file: File;
      confirmUpdates?: boolean;
    }): Promise<ReappraisalUploadResult> => {
      const formData = new FormData();
      formData.append('file', params.file);
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/project/units/reappraisal-upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: params.confirmUpdates ? { confirmUpdates: true } : undefined,
        },
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
      // A re-match appends units and rewrites sellingPrice / usableArea / landArea, which are the
      // inputs to unit prices. Without this the sibling Unit Price tab serves its cached list for
      // the next five minutes: new units missing, prices computed from the superseded figures.
      queryClient.invalidateQueries({
        queryKey: projectUnitPriceKeys.all(variables.appraisalId),
      });
      // The model list grows when an added or renamed unit names one the project has not seen.
      queryClient.invalidateQueries({
        queryKey: projectModelKeys.all(variables.appraisalId),
      });
    },
  });
};
