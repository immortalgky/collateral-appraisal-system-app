import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AppraisalComparableDtoType,
  CreateMarketComparableRequestType,
  GetMarketComparableTemplateByIdResponseType,
  LinkAppraisalComparableRequestType,
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
 * Get market comparables (general pool listing)
 * GET /market-comparables
 */
export const useGetMarketComparables = () => {
  return useQuery({
    queryKey: ['market-comparables'],
    queryFn: async (): Promise<MarketComparableDtoType[]> => {
      const { data } = await axios.get('/market-comparables', {
        params: { PageNumber: 0, PageSize: 100 },
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
      request: UpdateMarketComparableRequestType & { id: string; factorData?: any[] },
    ): Promise<UpdateMarketComparableResponseType> => {
      const { id, factorData, ...body } = request;
      const { data } = await axios.put(`/market-comparables/${id}`, body);
      if (factorData) {
        await axios.put(`/market-comparables/${id}/factor-data`, { factorData });
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-comparables'] });
    },
  });
};

/**
 * Delete a market comparable from the general pool
 * DELETE /market-comparables/{id}
 */
export const useDeleteMarketComparable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/market-comparables/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-comparables'] });
    },
  });
};

// ========================
// Appraisal-linked comparables
// ========================

/**
 * Get comparables linked to an appraisal
 * GET /appraisals/{id}/comparables
 */
export const useGetAppraisalComparables = (appraisalId?: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'comparables'],
    enabled: !!appraisalId,
    queryFn: async (): Promise<AppraisalComparableDtoType[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/comparables`);
      return data.comparables ?? [];
    },
  });
};

/**
 * Link a market comparable to an appraisal
 * POST /appraisals/{id}/comparables
 */
export const useLinkAppraisalComparable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      ...body
    }: LinkAppraisalComparableRequestType & { appraisalId: string }) => {
      const { data } = await axios.post(`/appraisals/${appraisalId}/comparables`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisals', variables.appraisalId, 'comparables'],
      });
    },
  });
};

/**
 * Unlink a comparable from an appraisal
 * DELETE /appraisals/{id}/comparables/{comparableId}
 */
export const useUnlinkAppraisalComparable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      comparableId,
    }: {
      appraisalId: string;
      comparableId: string;
    }) => {
      const { data } = await axios.delete(
        `/appraisals/${appraisalId}/comparables/${comparableId}`,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisals', variables.appraisalId, 'comparables'],
      });
    },
  });
};
