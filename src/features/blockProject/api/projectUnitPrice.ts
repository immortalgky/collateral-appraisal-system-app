import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { ProjectUnitPrice, ProjectUnitPriceFlagData } from '../types';

// ==================== Query Keys ====================

export const projectUnitPriceKeys = {
  /** ['appraisal', appraisalId, 'project', 'unit-prices'] */
  all: (appraisalId: string) =>
    ['appraisal', appraisalId, 'project', 'unit-prices'] as const,
};

// ==================== Hooks ====================

/**
 * Get all unit prices for a project (LEFT JOIN — includes units without prices).
 * GET /appraisals/{appraisalId}/project/unit-prices
 *
 * Works for both Condo and LandAndBuilding project types.
 */
export const useGetProjectUnitPrices = (appraisalId: string) => {
  return useQuery({
    queryKey: projectUnitPriceKeys.all(appraisalId),
    queryFn: async (): Promise<ProjectUnitPrice[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/project/unit-prices`);
      return data;
    },
    enabled: !!appraisalId,
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
    mutationFn: async (params: { appraisalId: string }): Promise<void> => {
      await axios.post(
        `/appraisals/${params.appraisalId}/project/unit-prices/calculate`,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectUnitPriceKeys.all(variables.appraisalId),
      });
    },
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
      await axios.put(
        `/appraisals/${params.appraisalId}/project/unit-prices`,
        { unitPriceFlags: params.flags },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectUnitPriceKeys.all(variables.appraisalId),
      });
    },
  });
};
