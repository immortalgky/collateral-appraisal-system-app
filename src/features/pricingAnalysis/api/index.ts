import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import {
  type AddPricingAnalysisApproachRequestType,
  type AddPricingAnalysisApproachResponseType,
  type AddPricingAnalysisMethodRequestType,
  type AddPricingAnalysisMethodResponseType,
  type FactorDataType,
  type GetComparativeFactorsResponseType,
  type GetPricingAnalysisResponseType,
  GetPricingTemplateByMethodResponse,
  type GetPricingTemplatesByMethodResponseType,
  type LinkComparableRequestType,
  type LinkComparableResponseType,
  type SaveComparativeAnalysisRequestType,
  type SaveComparativeAnalysisResponseType,
} from '../schemas';
import {
  DIRECT_COMPARISON_TEMPLATES,
  SALE_GRID_TEMPLATES,
  WQS_TEMPLATES,
} from '../data/templatesData';
import { pricingAnalysisKeys } from './queryKeys';

// ==================== Real API Hooks ====================

/**
 * Fetch price analysis approaches & methods
 * GET /pricing-analysis/{id}
 */
export function useGetPricingAnalysis(id: string) {
  return useQuery({
    queryKey: pricingAnalysisKeys.detail(id),
    queryFn: async (): Promise<GetPricingAnalysisResponseType> => {
      const { data } = await axios.get(`/pricing-analysis/${id}`);
      return data as GetPricingAnalysisResponseType;
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    retry: 1,
  });
}

/**
 * Fetch comparative factors by method id
 * GET /pricing-analysis/{id}/methods/{methodId}/comparative-factors
 */
export function useGetComparativeFactors(id: string | undefined, methodId: string | undefined) {
  return useQuery({
    queryKey: pricingAnalysisKeys.comparativeFactors(id ?? '', methodId ?? ''),
    queryFn: async (): Promise<GetComparativeFactorsResponseType> => {
      const { data } = await axios.get(
        `/pricing-analysis/${id}/methods/${methodId}/comparative-factors`,
      );
      return data as GetComparativeFactorsResponseType;
    },
    enabled: !!id && !!methodId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Create a new pricing analysis for a property group
 * POST /property-groups/{groupId}/pricing-analysis
 */
export function useCreatePricingAnalysis() {
  return useMutation({
    mutationFn: async ({
      groupId,
    }: {
      groupId: string;
    }): Promise<{ id: string; status: string }> => {
      const { data: response } = await axios.post(
        `/property-groups/${groupId}/pricing-analysis`,
      );
      return response;
    },
  });
}

/**
 * Add approach to price analysis
 * POST /pricing-analysis/{id}/approaches
 */
export function useAddPricingAnalysisApproach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      request,
    }: {
      pricingAnalysisId: string;
      request: AddPricingAnalysisApproachRequestType;
    }): Promise<AddPricingAnalysisApproachResponseType> => {
      const { data: response } = await axios.post(
        `/pricing-analysis/${pricingAnalysisId}/approaches`,
        request,
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(variables.pricingAnalysisId),
      });
    },
  });
}

/**
 * Add method to price analysis approach
 * POST /pricing-analysis/{id}/approaches/{approachId}/methods
 */
export function useAddPricingAnalysisMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      approachId,
      request,
    }: {
      pricingAnalysisId: string;
      approachId: string;
      request: AddPricingAnalysisMethodRequestType;
    }): Promise<AddPricingAnalysisMethodResponseType> => {
      const { data: response } = await axios.post(
        `/pricing-analysis/${pricingAnalysisId}/approaches/${approachId}/methods`,
        request,
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(variables.pricingAnalysisId),
      });
    },
  });
}

/**
 * Save comparative analysis (factors, scores, calculations)
 * PUT /pricing-analysis/{id}/methods/{methodId}/comparative-analysis
 */
export function useSaveComparativeAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      methodId,
      request,
    }: {
      id: string;
      methodId: string;
      request: SaveComparativeAnalysisRequestType;
    }): Promise<SaveComparativeAnalysisResponseType> => {
      const { data: response } = await axios.put(
        `/pricing-analysis/${id}/methods/${methodId}/comparative-analysis`,
        request,
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: pricingAnalysisKeys.detail(variables.id) });
    },
  });
}

/**
 * Link a market comparable to a pricing method
 * POST /pricing-analysis/{id}/methods/{methodId}/comparables
 */
export function useLinkComparable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      request,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      request: LinkComparableRequestType;
    }): Promise<LinkComparableResponseType> => {
      const { data: response } = await axios.post(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/comparables`,
        request,
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.comparativeFactors(
          variables.pricingAnalysisId,
          variables.methodId,
        ),
      });
    },
  });
}

/**
 * Unlink a market comparable from a pricing method
 * DELETE /pricing-analysis/{id}/methods/{methodId}/comparables/{linkId}
 */
export function useUnlinkComparable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      linkId,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      linkId: string;
    }): Promise<void> => {
      await axios.delete(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/comparables/${linkId}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.comparativeFactors(
          variables.pricingAnalysisId,
          variables.methodId,
        ),
      });
    },
  });
}

// ==================== Mocked Hooks (Backend endpoints missing) ====================

/**
 * TODO: Connect to real API when GET /pricing-analysis-templates?methodType={type} is available
 * Currently mocked with static data — no backend endpoint exists yet.
 */
export function useGetPricingTemplate(methodType: string) {
  return useQuery({
    queryKey: pricingAnalysisKeys.template(methodType),
    queryFn: async (): Promise<GetPricingTemplatesByMethodResponseType> => {
      await new Promise(resolve => setTimeout(resolve, 500));

      let parse;
      switch (methodType) {
        case 'DC_MARKET':
          parse = GetPricingTemplateByMethodResponse.safeParse(DIRECT_COMPARISON_TEMPLATES);
          break;
        case 'SAG_MARKET':
          parse = GetPricingTemplateByMethodResponse.safeParse(SALE_GRID_TEMPLATES);
          break;
        case 'WQS_MARKET':
          parse = GetPricingTemplateByMethodResponse.safeParse(WQS_TEMPLATES);
          break;
        default:
          parse = GetPricingTemplateByMethodResponse.safeParse(null);
      }

      if (!parse.success) throw parse.error;
      return parse.data;
    },
    enabled: !!methodType,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    retry: 1,
  });
}

/**
 * Fetch all market comparable factors
 * GET /market-comparable-factors
 */
export function useGetAllFactors() {
  return useQuery({
    queryKey: pricingAnalysisKeys.allFactors,
    queryFn: async (): Promise<FactorDataType[]> => {
      const { data } = await axios.get('/market-comparable-factors');
      return (data?.factors ?? []) as FactorDataType[];
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    retry: 1,
  });
}
