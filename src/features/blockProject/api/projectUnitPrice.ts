import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { downloadBlob, uploadForm } from '@shared/api/blobTransfer';
import { parseFileName } from '@/shared/utils/contentDisposition';
import { saveBlob } from '@/shared/utils/saveBlob';
import { decisionSummaryKeys } from '@/features/appraisal/api/decisionSummary';
import type {
  ProjectUnitPrice,
  ProjectUnitPriceFlagData,
  UnitPriceImportPreview,
  UnitPriceSourceInfo,
} from '../types';

// ==================== Query Keys ====================

export const projectUnitPriceKeys = {
  /** ['appraisal', appraisalId, 'project', 'unit-prices'] */
  all: (appraisalId: string) => ['appraisal', appraisalId, 'project', 'unit-prices'] as const,
  /** ['appraisal', appraisalId, 'project', 'unit-prices-source'] (sibling of `all`, not under it) */
  source: (appraisalId: string) =>
    ['appraisal', appraisalId, 'project', 'unit-prices-source'] as const,
};

/**
 * Calculate and import both rewrite every unit price, flip the price source and recompute the
 * appraisal-level totals on the server (block totals = sum of unit prices).
 */
const CALCULATE_TIMEOUT_MS = 120_000;

/** Lets the project header tell that new figures arrive from a recalculation, not from a plain load. */
export const CALCULATE_MUTATION_KEY = ['project-unit-prices', 'calculate'] as const;

// Returned (not fire-and-forget) so a mutation whose onSuccess returns it stays pending until the
// refetches have landed: the page is then busy for the whole write, not just the request.
const invalidateAfterPriceWrite = (queryClient: QueryClient, appraisalId: string) => {
  // The appraised total picks the approval tier, so the approval lists (keyed by workflow instance,
  // not by appraisal) are stale too: ['workflow', instanceId, 'activity', activityId,
  // 'approval-list']. Not awaited: lists that belong to other screens must not hold the save busy.
  void queryClient.invalidateQueries({
    predicate: q => q.queryKey[0] === 'workflow' && q.queryKey[4] === 'approval-list',
  });
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: projectUnitPriceKeys.all(appraisalId) }),
    queryClient.invalidateQueries({ queryKey: projectUnitPriceKeys.source(appraisalId) }),
    queryClient.invalidateQueries({ queryKey: decisionSummaryKeys.detail(appraisalId) }),
    queryClient.invalidateQueries({ queryKey: ['appraisal', appraisalId], exact: true }),
  ]);
};

// ==================== Hooks ====================

/**
 * Get all unit prices for a project (LEFT JOIN — includes units without prices).
 * GET /appraisals/{appraisalId}/project/unit-prices
 *
 * Works for both Condo and LandAndBuilding project types.
 */
export const useGetProjectUnitPrices = (
  appraisalId: string,
  options: { alwaysRefetch?: boolean } = {},
) => {
  return useQuery({
    queryKey: projectUnitPriceKeys.all(appraisalId),
    queryFn: async (): Promise<ProjectUnitPrice[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/project/unit-prices`);
      return data;
    },
    enabled: !!appraisalId,
    // The Unit Price tab shows these as the current stored prices: take them fresh on mount.
    ...(options.alwaysRefetch && { staleTime: 0 }),
  });
};

/**
 * Trigger unit-price calculation for all units in a project.
 * POST /appraisals/{appraisalId}/project/unit-prices/calculate
 *
 * Returns 204 on success. Works for both Condo and LandAndBuilding.
 */
export const useCalculateProjectUnitPrices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: CALCULATE_MUTATION_KEY,
    mutationFn: async (params: { appraisalId: string }): Promise<void> => {
      // Recalculating a large block outlasts the shared 10 s cap; give this one call longer, so the
      // refetch in onSettled does not run before the server has committed.
      await axios.post(
        `/appraisals/${params.appraisalId}/project/unit-prices/calculate`,
        undefined,
        { timeout: CALCULATE_TIMEOUT_MS },
      );
    },
    // onSettled, not onSuccess: a write the server committed but the client saw fail (a dropped
    // connection) must not leave the tab on a stale source and stale prices.
    onSettled: (_data, _error, variables) =>
      invalidateAfterPriceWrite(queryClient, variables.appraisalId),
  });
};

/**
 * Save location flags (corner/edge/pool-view/south/near-garden/other) for units.
 * PUT /appraisals/{appraisalId}/project/unit-prices
 *
 * Works for both Condo and LandAndBuilding — supply only the flags relevant to
 * the project type; the BE ignores inapplicable flags.
 */
export const useSaveProjectUnitPrices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      flags: ProjectUnitPriceFlagData[];
    }): Promise<void> => {
      await axios.put(`/appraisals/${params.appraisalId}/project/unit-prices`, {
        unitPriceFlags: params.flags,
      });
    },
    // Returned: the mutation stays pending until the refetched prices have landed.
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: projectUnitPriceKeys.all(variables.appraisalId),
      }),
  });
};

// ==================== Excel import ====================

/**
 * Where the unit prices came from (calculated in the system, or imported from Excel).
 * GET /appraisals/{appraisalId}/project/unit-prices/source
 */
export const useGetUnitPriceSource = (
  appraisalId: string,
  options: { enabled?: boolean; alwaysRefetch?: boolean } = {},
) => {
  return useQuery({
    queryKey: projectUnitPriceKeys.source(appraisalId),
    queryFn: async (): Promise<UnitPriceSourceInfo> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/project/unit-prices/source`);
      return data;
    },
    enabled: !!appraisalId && (options.enabled ?? true),
    // A cached count must not decide a warning about destroying the prices: ask again.
    ...(options.alwaysRefetch && { staleTime: 0 }),
  });
};

/** The multipart POST the preview and the import share; only the URL suffix differs. */
const postPriceFile = async (
  appraisalId: string,
  file: File,
  suffix: '/import' | '/import/preview',
): Promise<UnitPriceImportPreview> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await uploadForm<UnitPriceImportPreview>(
    `/appraisals/${appraisalId}/project/unit-prices${suffix}`,
    formData,
    { label: file.name },
  );
  return data;
};

/**
 * Dry run of a price-list import: parses and matches the file, writes nothing.
 * POST /appraisals/{appraisalId}/project/unit-prices/import/preview (multipart `file`)
 */
export const usePreviewUnitPriceImport = () => {
  return useMutation({
    mutationFn: (params: { appraisalId: string; file: File }) =>
      postPriceFile(params.appraisalId, params.file, '/import/preview'),
  });
};

export const useImportUnitPrices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { appraisalId: string; file: File }) =>
      postPriceFile(params.appraisalId, params.file, '/import'),
    // onSettled, not onSuccess: a write the server committed but the client saw fail (a dropped
    // connection) must not leave the tab on a stale source and stale prices.
    onSettled: (_data, _error, variables) =>
      invalidateAfterPriceWrite(queryClient, variables.appraisalId),
  });
};

/**
 * Downloads the template xlsx (current units + stored prices) and saves it to disk.
 * GET /appraisals/{appraisalId}/project/unit-prices/template
 */
export const useDownloadUnitPriceTemplate = () => {
  return useMutation({
    mutationFn: async (params: { appraisalId: string }): Promise<void> => {
      const response = await downloadBlob(
        `/appraisals/${params.appraisalId}/project/unit-prices/template`,
      );
      const disposition = response.headers['content-disposition'] as string | undefined;
      const filename = parseFileName(disposition) ?? 'unit-prices.xlsx';

      saveBlob(response.data, filename);
    },
  });
};
