import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';
import { projectModelKeys } from './projectModel';
import { pricingAnalysisKeys } from '@features/pricingAnalysis/api/queryKeys';

// ==================== Query Keys ====================

export const projectModelPricingAnalysisKeys = {
  byModel: (modelId: string) => ['projectModel', modelId, 'pricing-analysis'] as const,
};

// ==================== Hooks ====================

/**
 * Create a pricing analysis for a project model.
 * POST /models/{modelId}/pricing-analysis
 *
 * Returns 409 if an analysis already exists for this model.
 * On 409, the model DTO already carries pricingAnalysisId — the caller should
 * use that directly rather than calling this mutation.
 */
export const useCreateProjectModelPricingAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      modelId: string;
    }): Promise<{ id: string; status: string }> => {
      const { data } = await axios.post(`/models/${params.modelId}/pricing-analysis`);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the model detail and list so pricingAnalysisId/status hydrate
      queryClient.invalidateQueries({
        queryKey: projectModelKeys.detail(variables.appraisalId, variables.modelId),
      });
      queryClient.invalidateQueries({
        queryKey: projectModelKeys.all(variables.appraisalId),
      });
      // Prime the analysis detail cache so the redirect renders immediately
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: pricingAnalysisKeys.detail(data.id),
        });
      }
    },
    onError: (error, variables) => {
      // On 409 the analysis already exists — re-fetch the model so the caller
      // gets the pricingAnalysisId that's already on the DTO.
      if (isAxiosError(error) && error.response?.status === 409) {
        queryClient.invalidateQueries({
          queryKey: projectModelKeys.detail(variables.appraisalId, variables.modelId),
        });
      }
    },
  });
};
