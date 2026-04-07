import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { CondoPricingAssumption, CondoUnitPrice } from '../types';

// ==================== Query Keys ====================

export const condoUnitPriceKeys = {
  pricingAssumption: (appraisalId: string) =>
    ['appraisal', appraisalId, 'condo-pricing-assumptions'] as const,
  unitPrices: (appraisalId: string) =>
    ['appraisal', appraisalId, 'condo-unit-prices'] as const,
};

// ==================== Request Types ====================

type SaveCondoPricingAssumptionRequest = Omit<CondoPricingAssumption, 'id' | 'appraisalId'>;

// ==================== Hooks ====================

/**
 * Get pricing assumptions for an appraisal
 * GET /appraisals/{appraisalId}/condo-pricing-assumptions
 */
export const useGetCondoPricingAssumption = (appraisalId: string) => {
  return useQuery({
    queryKey: condoUnitPriceKeys.pricingAssumption(appraisalId),
    queryFn: async (): Promise<CondoPricingAssumption> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/condo-pricing-assumptions`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Save (upsert) pricing assumptions for an appraisal
 * PUT /appraisals/{appraisalId}/condo-pricing-assumptions
 */
export const useSaveCondoPricingAssumption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: SaveCondoPricingAssumptionRequest;
    }): Promise<void> => {
      await axios.put(
        `/appraisals/${params.appraisalId}/condo-pricing-assumptions`,
        params.data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: condoUnitPriceKeys.pricingAssumption(variables.appraisalId),
      });
    },
  });
};

/**
 * Trigger unit price calculation
 * POST /appraisals/{appraisalId}/condo-unit-prices/calculate
 */
export const useCalculateCondoUnitPrices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
    }): Promise<CondoUnitPrice[]> => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/condo-unit-prices/calculate`,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: condoUnitPriceKeys.unitPrices(variables.appraisalId),
      });
    },
  });
};

/**
 * Get all calculated unit prices for an appraisal
 * GET /appraisals/{appraisalId}/condo-unit-prices
 */
export const useGetCondoUnitPrices = (appraisalId: string) => {
  return useQuery({
    queryKey: condoUnitPriceKeys.unitPrices(appraisalId),
    queryFn: async (): Promise<CondoUnitPrice[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/condo-unit-prices`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Save manual overrides for unit prices
 * PUT /appraisals/{appraisalId}/condo-unit-prices
 */
export const useSaveCondoUnitPrices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: CondoUnitPrice[];
    }): Promise<void> => {
      await axios.put(`/appraisals/${params.appraisalId}/condo-unit-prices`, params.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: condoUnitPriceKeys.unitPrices(variables.appraisalId),
      });
    },
  });
};
