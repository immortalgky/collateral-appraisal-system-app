import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Hook for add market survey which selected in pricing market comparison section
 * POST /appraisal/ ...
 * @returns
 */
export const useAddPricingMarketComparison = () => {
  // const queryClient = useQueryClient();

  /**
   * Data:
   * (1) survey data which selected in pricing market comparison section. 'PricingMarketComparisonSurvey' table
   * (2) factors which selected in pricing market comparison section. 'PricingMarketComparisonFactor' table
   */
  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: any }) => {
      const { data: response } = await axios.post(`/appraisal/${groupId}/`, data);
      return response;
    },
  });
};

/**
 * Hook for add WQS scores
 * POST /appraisal/ ...
 * @returns
 */
export const useAddPricingWQSScore = () => {
  // const queryClient = useQueryClient();

  /**
   * Data:
   * (1) factors, weight, intensity, collateral's score
   * (2) factors, weight, intensity, survey's score
   */
  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: any }) => {
      const { data: response } = await axios.post(`/appraisal/${groupId}/`, data);
      return response;
    },
  });
};

/**
 * Hook for add WQS calculation
 * POST /appraisal/ ...
 * @returns
 */
export const useAddPricingWQSCalculation = () => {
  // const queryClient = useQueryClient();

  /**
   * Data:
   * (1) calculation value for each surveys
   */
  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: any }) => {
      const { data: response } = await axios.post(`/appraisal/${groupId}/`, data);
      return response;
    },
  });
};

/**
 * Hook for add WQS final value
 * POST /appraisal/ ...
 * @returns
 */
export const useAddPricingWQSFinalValue = () => {
  // const queryClient = useQueryClient();

  /**
   * Data:
   * (1) final adjust value of methods
   */
  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: any }) => {
      const { data: response } = await axios.post(`/appraisal/${groupId}/`, data);
      return response;
    },
  });
};
