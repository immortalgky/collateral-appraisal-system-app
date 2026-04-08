import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { VillagePricingAssumption, VillageUnitPrice, VillageUnitPriceFlag } from '../types';

// ==================== Query Keys ====================

export const villageUnitPriceKeys = {
  pricingAssumption: (appraisalId: string) =>
    ['appraisal', appraisalId, 'village-pricing-assumptions'] as const,
  unitPrices: (appraisalId: string) =>
    ['appraisal', appraisalId, 'village-unit-prices'] as const,
};

// ==================== Request Types ====================

type SaveVillagePricingAssumptionRequest = Omit<VillagePricingAssumption, 'id' | 'appraisalId'>;

// ==================== Hooks ====================

/**
 * Get pricing assumptions for an appraisal
 * GET /appraisals/{appraisalId}/village-pricing-assumptions
 */
export const useGetVillagePricingAssumption = (appraisalId: string) => {
  return useQuery({
    queryKey: villageUnitPriceKeys.pricingAssumption(appraisalId),
    queryFn: async (): Promise<VillagePricingAssumption | null> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/village-pricing-assumptions`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Save (upsert) pricing assumptions for an appraisal
 * PUT /appraisals/{appraisalId}/village-pricing-assumptions
 */
export const useSaveVillagePricingAssumption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: SaveVillagePricingAssumptionRequest;
    }): Promise<void> => {
      await axios.put(
        `/appraisals/${params.appraisalId}/village-pricing-assumptions`,
        params.data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: villageUnitPriceKeys.pricingAssumption(variables.appraisalId),
      });
    },
  });
};

/**
 * Save location flags for units (corner, edge, near garden, other)
 * PUT /appraisals/{appraisalId}/village-unit-prices
 */
export const useSaveVillageUnitPriceFlags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      unitPriceFlags: VillageUnitPriceFlag[];
    }): Promise<void> => {
      await axios.put(`/appraisals/${params.appraisalId}/village-unit-prices`, {
        unitPriceFlags: params.unitPriceFlags,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: villageUnitPriceKeys.unitPrices(variables.appraisalId),
      });
    },
  });
};

/**
 * Trigger unit price calculation
 * POST /appraisals/{appraisalId}/village-unit-prices/calculate
 */
export const useCalculateVillageUnitPrices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { appraisalId: string }): Promise<void> => {
      await axios.post(`/appraisals/${params.appraisalId}/village-unit-prices/calculate`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: villageUnitPriceKeys.unitPrices(variables.appraisalId),
      });
    },
  });
};

/**
 * Get all calculated unit prices for an appraisal
 * GET /appraisals/{appraisalId}/village-unit-prices
 */
export const useGetVillageUnitPrices = (appraisalId: string) => {
  return useQuery({
    queryKey: villageUnitPriceKeys.unitPrices(appraisalId),
    queryFn: async (): Promise<{ unitPrices: VillageUnitPrice[] }> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/village-unit-prices`);
      return data;
    },
    enabled: !!appraisalId,
  });
};
