import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  CreateMarketComparableRequestType,
  GetMarketComparableTemplateByIdResponseType,
  GetMarketComparableTemplatesResponseType,
  MarketComparableDtoType,
  MarketComparableFactorDtoType,
  MarketComparableTemplateDtoType,
  UpdateMarketComparableRequestType,
  UpdateMarketComparableResponseType,
} from '@/shared/schemas/v1';

/**
 * Create a new market comparable
 * POST /market-comparables
 */
export const useCreateMarketComparable = () => {
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
export const useMarketComparableTemplateFactors = (templateId?: string) => {
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
export const useGetMarketComparables = (appraisalId?: string) => {
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
export const useGetMarketComparableById = (marketId?: string) => {
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
export const useGetMarketComparableTemplate = (propertyType?: string) => {
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

export const useGetMarketComparableTemplateById = (templateId?: string) => {
  return useQuery({
    queryKey: ['market-comparable-template', templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<GetMarketComparableTemplateByIdResponseType> => {
      const { data } = await axios.get(`/market-comparable-templates/${templateId}`);
      return data;
    },
  });
};

export const useUpdateMarketComparable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateMarketComparableRequestType,
    ): Promise<UpdateMarketComparableResponseType> => {
      console.log(request);
      const { data } = await axios.put(`/market-comparables/${request.id}`, request);
      await axios.put(`/market-comparables/${request.id}/factor-data`, request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['market-comparables'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useGetMarketComparableTemplateByPropertyType = (propertyType?: string) => {
  return useQuery({
    queryKey: ['market-comparable-template', propertyType],
    enabled: !!propertyType,
    queryFn: async (): Promise<GetMarketComparableTemplatesResponseType> => {
      const { data } = await axios.get(`/market-comparable-templates?propertyType=${propertyType}`);
      return data;
    },
  });
};
