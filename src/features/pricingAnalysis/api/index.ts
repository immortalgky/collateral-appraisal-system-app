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
  type LinkComparableRequestType,
  type LinkComparableResponseType,
  type RecalculateFactorsResponseType,
  type ResetPricingMethodResultType,
  type SaveComparativeAnalysisRequestType,
  type SaveComparativeAnalysisResponseType,
  type SelectMethodResponseType,
  type SetFinalValueRequestType,
  type SetFinalValueResponseType,
  type UpdateFinalValueRequestType,
  type UpdateFinalValueResponseType,
} from '../schemas';
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
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.comparativeFactors(variables.id, variables.methodId),
      });
      // Mark detail as stale without refetching immediately
      // (immediate refetch triggers INIT which resets activeMethod and hides the form)
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(variables.id),
        refetchType: 'none',
      });
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

/**
 * Delete a pricing analysis method
 * DELETE /pricing-analysis/{id}/approaches/{approachId}/methods/{methodId}
 */
export function useDeletePricingAnalysisMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      approachId,
      methodId,
    }: {
      pricingAnalysisId: string;
      approachId: string;
      methodId: string;
    }): Promise<void> => {
      await axios.delete(
        `/pricing-analysis/${pricingAnalysisId}/approaches/${approachId}/methods/${methodId}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(variables.pricingAnalysisId),
      });
    },
  });
}

// ==================== Select Method Hook ====================

/**
 * Select a method as primary (sets others in the same approach to Alternative)
 * POST /pricing-analysis/{id}/methods/{methodId}/select
 */
export function useSelectMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
    }: {
      pricingAnalysisId: string;
      methodId: string;
    }): Promise<SelectMethodResponseType> => {
      const { data: response } = await axios.post(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/select`,
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

// ==================== Final Value Hooks ====================

/**
 * Set final value for a pricing method
 * POST /pricing-analysis/{id}/methods/{methodId}/final-value
 */
export function useSetFinalValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      request,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      request: SetFinalValueRequestType;
    }): Promise<SetFinalValueResponseType> => {
      const { data: response } = await axios.post(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/final-value`,
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
 * Update final value for a pricing method
 * PUT /pricing-analysis/{id}/final-values/{valueId}
 */
export function useUpdateFinalValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      valueId,
      request,
    }: {
      pricingAnalysisId: string;
      valueId: string;
      request: UpdateFinalValueRequestType;
    }): Promise<UpdateFinalValueResponseType> => {
      const { data: response } = await axios.put(
        `/pricing-analysis/${pricingAnalysisId}/final-values/${valueId}`,
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

// ==================== Recalculate & Reset Hooks ====================

/**
 * Recalculate factors for a pricing method
 * POST /pricing-analysis/{id}/methods/{methodId}/recalculate-factors
 */
export function useRecalculateFactors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
    }: {
      pricingAnalysisId: string;
      methodId: string;
    }): Promise<RecalculateFactorsResponseType> => {
      const { data: response } = await axios.post(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/recalculate-factors`,
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
 * Reset a pricing method's results
 * DELETE /pricing-analysis/{id}/methods/{methodId}/reset
 */
export function useResetMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
    }: {
      pricingAnalysisId: string;
      methodId: string;
    }): Promise<ResetPricingMethodResultType> => {
      const { data: response } = await axios.delete(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/reset`,
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
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(variables.pricingAnalysisId),
      });
    },
  });
}

// ==================== Machine Cost Hooks ====================

export interface MachineCostItemResponse {
  id: string;
  appraisalPropertyId: string;
  displaySequence: number;
  rcnReplacementCost: number | null;
  lifeSpanYears: number | null;
  conditionFactor: number;
  functionalObsolescence: number;
  economicObsolescence: number;
  fairMarketValue: number | null;
  marketDemandAvailable: boolean;
  notes: string | null;
}

export interface GetMachineCostItemsResponse {
  items: MachineCostItemResponse[];
  totalFmv: number;
  remark: string | null;
}

export interface SaveMachineCostItemInput {
  id: string | null;
  appraisalPropertyId: string;
  displaySequence: number;
  rcnReplacementCost: number | null;
  lifeSpanYears: number | null;
  conditionFactor: number;
  functionalObsolescence: number;
  economicObsolescence: number;
  fairMarketValue: number | null;
  marketDemandAvailable: boolean;
  notes: string | null;
}

export interface SaveMachineCostItemsResponse {
  pricingAnalysisId: string;
  methodId: string;
  itemCount: number;
  totalFmv: number;
}

/**
 * Fetch saved machine cost items for a method
 * GET /pricing-analysis/{id}/methods/{methodId}/machine-cost-items
 */
export function useGetMachineCostItems(pricingAnalysisId: string | undefined, methodId: string | undefined) {
  return useQuery({
    queryKey: pricingAnalysisKeys.machineCostItems(pricingAnalysisId ?? '', methodId ?? ''),
    queryFn: async (): Promise<GetMachineCostItemsResponse> => {
      const { data } = await axios.get(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/machine-cost-items`,
      );
      return data as GetMachineCostItemsResponse;
    },
    enabled: !!pricingAnalysisId && !!methodId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Save machine cost items (bulk create/update/delete)
 * PUT /pricing-analysis/{id}/methods/{methodId}/machine-cost-items
 */
export function useSaveMachineCostItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      items,
      groupDescription,
      remark,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      items: SaveMachineCostItemInput[];
      remark?: string | null;
    }): Promise<SaveMachineCostItemsResponse> => {
      const { data: response } = await axios.put(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/machine-cost-items`,
        { items, remark },
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.machineCostItems(variables.pricingAnalysisId, variables.methodId),
      });
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(variables.pricingAnalysisId),
        refetchType: 'none',
      });
    },
  });
}

// ==================== Template & Factor Hooks ====================

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
