import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  MarketComparableDtoType,
  MarketComparableTemplateDtoType,
  MarketComparableFactorDtoType,
  CreateMarketComparableRequestType,
} from '@/shared/schemas/v1';

/**
 * Create a new market comparable
 * POST /market-comparables
 */
export const useCreateMarketSurveyRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateMarketComparableRequestType): Promise<{ id: string }> => {
      const { data } = await axios.post('/market-comparables', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-comparables'] });
    },
  });
};

/**
 * Get market comparable factors
 * GET /market-comparable-factors
 */
export const useSurveyTemplateFactors = (templateId?: string) => {
  return useQuery({
    queryKey: ['market-comparable-factors', templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<MarketComparableFactorDtoType[]> => {
      const { data } = await axios.get('/market-comparable-factors', {
        params: templateId ? { TemplateId: templateId } : undefined,
      });
      return data.factors ?? [];
    },
  });
};

/**
 * Get market comparables for an appraisal
 * GET /market-comparables
 */
export const useGetMarketSurvey = (appraisalId?: string) => {
  return useQuery({
    queryKey: ['market-comparables', appraisalId],
    enabled: !!appraisalId,
    queryFn: async (): Promise<MarketComparableDtoType[]> => {
      const { data } = await axios.get('/market-comparables', {
        params: { AppraisalId: appraisalId, PageNumber: 0, PageSize: 100 },
      });
      const result = data.result ?? data;
      return result.items ?? [];
    },
  });
};

/**
 * Get a single market comparable by ID
 * GET /market-comparables/{id}
 */
export const useGetMarketSurveyById = (marketId?: string) => {
  return useQuery({
    queryKey: ['market-comparables', 'detail', marketId],
    enabled: !!marketId,
    queryFn: async () => {
      const { data } = await axios.get(`/market-comparables/${marketId}`);
      return data;
    },
  });
};

/**
 * Get market comparable templates
 * GET /market-comparable-templates
 */
export const useGetMarketSurveyTemplate = (propertyType?: string) => {
  return useQuery({
    queryKey: ['market-comparable-templates', propertyType],
    enabled: !!propertyType,
    queryFn: async (): Promise<MarketComparableTemplateDtoType[]> => {
      const { data } = await axios.get('/market-comparable-templates', {
        params: propertyType ? { PropertyType: propertyType } : undefined,
      });
      return data.templates ?? [];
    },
  });
};

