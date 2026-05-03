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
 * Fetch pricing parameters catalog (assumption types, method matrix, room types, etc.)
 * GET /pricing-parameters
 */
export interface PricingAssumptionType {
  code: string;
  name: string;
  sectionType: 'income' | 'expenses' | 'any';
  displaySeq: number;
}

export interface PricingAssumptionMethodMatrix {
  assumptionType: string;
  allowedMethodCodes: string[];
}

export interface PricingParametersResponse {
  assumptionTypes: PricingAssumptionType[];
  assumptionMethodMatrix: PricingAssumptionMethodMatrix[];
}

interface PricingParametersRaw {
  assumptionTypes: { code: string; name: string; category: string; displaySeq: number }[];
  assumptionMethodMatrix: { assumptionType: string; allowedMethodCodes: string[] }[];
}

export function useGetPricingParameters() {
  return useQuery({
    queryKey: pricingAnalysisKeys.pricingParameters(),
    queryFn: async (): Promise<PricingParametersResponse> => {
      const { data } = await axios.get<PricingParametersRaw>('/pricing-parameters');
      // Backend Category uses 'income' | 'expenses' | 'other'; the form's
      // sectionType filter expects 'any' for cross-section types (e.g. M99).
      return {
        assumptionTypes: (data.assumptionTypes ?? []).map(a => ({
          code: a.code,
          name: a.name,
          sectionType: a.category === 'income' || a.category === 'expenses' ? a.category : 'any',
          displaySeq: a.displaySeq,
        })),
        assumptionMethodMatrix: data.assumptionMethodMatrix ?? [],
      };
    },
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
      const { data: response } = await axios.post(`/property-groups/${groupId}/pricing-analysis`);
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
export function useGetMachineCostItems(
  pricingAnalysisId: string | undefined,
  methodId: string | undefined,
) {
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
        queryKey: pricingAnalysisKeys.machineCostItems(
          variables.pricingAnalysisId,
          variables.methodId,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(variables.pricingAnalysisId),
        refetchType: 'none',
      });
    },
  });
}

// ==================== Leasehold Analysis Hooks ====================

import type {
  GetLeaseholdAnalysisResponse,
  SaveLeaseholdAnalysisRequest,
  SaveLeaseholdAnalysisResponse,
} from '../types/leasehold';

/**
 * Fetch leasehold analysis for a method
 * GET /pricing-analysis/{id}/methods/{methodId}/leasehold-analysis
 */
export function useGetLeaseholdAnalysis(
  pricingAnalysisId: string | undefined,
  methodId: string | undefined,
) {
  return useQuery({
    queryKey: pricingAnalysisKeys.leaseholdAnalysis(pricingAnalysisId ?? '', methodId ?? ''),
    queryFn: async (): Promise<GetLeaseholdAnalysisResponse> => {
      const { data } = await axios.get(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/leasehold-analysis`,
      );
      return data as GetLeaseholdAnalysisResponse;
    },
    enabled: !!pricingAnalysisId && !!methodId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Save leasehold analysis (create or update)
 * PUT /pricing-analysis/{id}/methods/{methodId}/leasehold-analysis
 */
export function useSaveLeaseholdAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      request,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      request: SaveLeaseholdAnalysisRequest;
    }): Promise<SaveLeaseholdAnalysisResponse> => {
      const { data: response } = await axios.put(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/leasehold-analysis`,
        request,
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.leaseholdAnalysis(
          variables.pricingAnalysisId,
          variables.methodId,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(variables.pricingAnalysisId),
        refetchType: 'none',
      });
    },
  });
}

// ==================== Profit Rent Analysis Hooks ====================

import type {
  GetProfitRentAnalysisResponse,
  SaveProfitRentAnalysisRequest,
  SaveProfitRentAnalysisResponse,
} from '../types/profitRent';

/**
 * Fetch profit rent analysis for a method
 * GET /pricing-analysis/{id}/methods/{methodId}/profit-rent-analysis
 */
export function useGetProfitRentAnalysis(
  pricingAnalysisId: string | undefined,
  methodId: string | undefined,
) {
  return useQuery({
    queryKey: pricingAnalysisKeys.profitRentAnalysis(pricingAnalysisId ?? '', methodId ?? ''),
    queryFn: async (): Promise<GetProfitRentAnalysisResponse> => {
      const { data } = await axios.get(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/profit-rent-analysis`,
      );
      return data as GetProfitRentAnalysisResponse;
    },
    enabled: !!pricingAnalysisId && !!methodId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Save profit rent analysis (create or update)
 * PUT /pricing-analysis/{id}/methods/{methodId}/profit-rent-analysis
 */
export function useSaveProfitRentAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      request,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      request: SaveProfitRentAnalysisRequest;
    }): Promise<SaveProfitRentAnalysisResponse> => {
      const { data: response } = await axios.put(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/profit-rent-analysis`,
        request,
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.profitRentAnalysis(
          variables.pricingAnalysisId,
          variables.methodId,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(variables.pricingAnalysisId),
        refetchType: 'none',
      });
    },
  });
}

// ==================== Income Analysis Hooks ====================

import type {
  IncomeAnalysisDto,
  PricingTemplateSummaryDto,
  PricingTemplateDto,
  SaveIncomeAnalysisRequest,
} from '../types/income';

/**
 * List pricing templates (income approach)
 * GET /pricing-templates?activeOnly={bool}
 */
export function useGetPricingTemplates(activeOnly = true) {
  return useQuery({
    queryKey: pricingAnalysisKeys.pricingTemplates(activeOnly),
    queryFn: async (): Promise<PricingTemplateSummaryDto[]> => {
      const { data } = await axios.get(`/pricing-templates`, {
        params: { activeOnly },
      });
      return data as PricingTemplateSummaryDto[];
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Fetch full template tree by code
 * GET /pricing-templates/{code}
 */
export function useGetPricingTemplateByCode(code: string | undefined) {
  return useQuery({
    queryKey: pricingAnalysisKeys.pricingTemplateByCode(code ?? ''),
    queryFn: async (): Promise<PricingTemplateDto> => {
      const { data } = await axios.get(`/pricing-templates/${code}`);
      return data as PricingTemplateDto;
    },
    enabled: !!code,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Fetch saved income analysis for a method.
 * Returns undefined when no analysis has been saved yet (404 → undefined, not an error).
 * GET /pricing-analysis/{paId}/methods/{mid}/income-analysis
 */
export function useGetIncomeAnalysis(
  pricingAnalysisId: string | undefined,
  methodId: string | undefined,
) {
  return useQuery({
    queryKey: pricingAnalysisKeys.incomeAnalysis(pricingAnalysisId ?? '', methodId ?? ''),
    queryFn: async (): Promise<IncomeAnalysisDto | undefined> => {
      const response = await axios.get(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/income-analysis`,
        { validateStatus: status => status === 200 || status === 404 },
      );
      if (response.status === 404) return undefined;
      // The endpoint returns GetIncomeAnalysisResponse { analysis } — unwrap it
      const body = response.data;
      return (body.analysis ?? body) as IncomeAnalysisDto;
    },
    enabled: !!pricingAnalysisId && !!methodId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Save income analysis (full-replace upsert)
 * PUT /pricing-analysis/{paId}/methods/{mid}/income-analysis
 */
export function useSaveIncomeAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      appraisalId,
      propertyId,
      request,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      appraisalId: string;
      propertyId: string;
      request: SaveIncomeAnalysisRequest;
    }): Promise<IncomeAnalysisDto> => {
      request = { ...request, appraisalId, propertyId };
      const { data: response } = await axios.put(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/income-analysis`,
        request,
      );
      // SaveIncomeAnalysisResponse wraps the dto in { analysis }
      return (response.analysis ?? response) as IncomeAnalysisDto;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.incomeAnalysis(
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

/**
 * Preview income analysis — runs server calc without persisting.
 * POST /pricing-analysis/{paId}/methods/{mid}/income-analysis:preview
 */
export function usePreviewIncomeAnalysis() {
  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      appraisalId,
      propertyId,
      request,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      appraisalId: string;
      propertyId: string;
      request: SaveIncomeAnalysisRequest;
    }): Promise<IncomeAnalysisDto> => {
      request = { ...request, appraisalId, propertyId };
      const { data } = await axios.post(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/income-analysis:preview`,
        request,
      );
      return (data.analysis ?? data) as IncomeAnalysisDto;
    },
    // No cache invalidation — preview is stateless
  });
}

// ==================== Hypothesis Analysis Hooks ====================

import type {
  GetHypothesisAnalysisResult,
  SaveHypothesisAnalysisRequest,
  SaveHypothesisAnalysisResult,
  PreviewHypothesisAnalysisRequest,
  PreviewHypothesisAnalysisResult,
  GenerateHypothesisAnalysisRequest,
  GenerateHypothesisAnalysisResult,
  UploadHypothesisUnitDetailsResult,
} from '../types/hypothesis';

/**
 * GET /pricing-analysis/{paId}/methods/{mid}/hypothesis-analysis
 * Returns null body when no analysis generated yet (404 → undefined).
 */
export function useGetHypothesisAnalysis(
  pricingAnalysisId: string | undefined,
  methodId: string | undefined,
) {
  return useQuery({
    queryKey: pricingAnalysisKeys.hypothesisAnalysis(pricingAnalysisId ?? '', methodId ?? ''),
    queryFn: async (): Promise<GetHypothesisAnalysisResult | undefined> => {
      const response = await axios.get(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/hypothesis-analysis`,
        { validateStatus: status => status === 200 || status === 404 },
      );
      if (response.status === 404) return undefined;
      return response.data as GetHypothesisAnalysisResult;
    },
    enabled: !!pricingAnalysisId && !!methodId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * POST /pricing-analysis/{paId}/methods/{mid}/hypothesis-analysis
 * Creates the aggregate and seeds default cost rows.
 */
export function useGenerateHypothesisAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      request,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      request: GenerateHypothesisAnalysisRequest;
    }): Promise<GenerateHypothesisAnalysisResult> => {
      const { data } = await axios.post(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/hypothesis-analysis`,
        request,
      );
      return data as GenerateHypothesisAnalysisResult;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.hypothesisAnalysis(
          variables.pricingAnalysisId,
          variables.methodId,
        ),
      });
    },
  });
}

/**
 * PUT /pricing-analysis/{paId}/methods/{mid}/hypothesis-analysis
 * Persists user inputs; server recalculates all derived values.
 */
export function useSaveHypothesisAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      request,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      request: SaveHypothesisAnalysisRequest;
    }): Promise<SaveHypothesisAnalysisResult> => {
      const { data } = await axios.put(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/hypothesis-analysis`,
        request,
      );
      return data as SaveHypothesisAnalysisResult;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.hypothesisAnalysis(
          variables.pricingAnalysisId,
          variables.methodId,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.detail(variables.pricingAnalysisId),
        refetchType: 'none',
      });
    },
  });
}

/**
 * POST /pricing-analysis/{paId}/methods/{mid}/hypothesis-analysis/preview
 * Returns full computed snapshot without persisting.
 */
export function usePreviewHypothesisAnalysis() {
  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      request,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      request: PreviewHypothesisAnalysisRequest;
    }): Promise<PreviewHypothesisAnalysisResult> => {
      const { data } = await axios.post(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/hypothesis-analysis/preview`,
        request,
      );
      return data as PreviewHypothesisAnalysisResult;
    },
  });
}

/**
 * POST /pricing-analysis/{paId}/methods/{mid}/hypothesis-analysis/uploads
 * Upload an xlsx file; deactivates any previous upload.
 */
export function useUploadHypothesisUnitDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      file,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      file: File;
    }): Promise<UploadHypothesisUnitDetailsResult> => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axios.post(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/hypothesis-analysis/uploads`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data as UploadHypothesisUnitDetailsResult;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.hypothesisAnalysis(
          variables.pricingAnalysisId,
          variables.methodId,
        ),
      });
    },
  });
}

/**
 * DELETE /pricing-analysis/{paId}/methods/{mid}/hypothesis-analysis/uploads/{uploadId}
 */
export function useDeleteHypothesisUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
      uploadId,
    }: {
      pricingAnalysisId: string;
      methodId: string;
      uploadId: string;
    }): Promise<void> => {
      await axios.delete(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/hypothesis-analysis/uploads/${uploadId}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.hypothesisAnalysis(
          variables.pricingAnalysisId,
          variables.methodId,
        ),
      });
    },
  });
}

/**
 * DELETE /pricing-analysis/{paId}/methods/{mid}/hypothesis-analysis
 * Resets (deletes) the entire hypothesis analysis.
 */
export function useDeleteHypothesisAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
      methodId,
    }: {
      pricingAnalysisId: string;
      methodId: string;
    }): Promise<void> => {
      await axios.delete(
        `/pricing-analysis/${pricingAnalysisId}/methods/${methodId}/hypothesis-analysis`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.hypothesisAnalysis(
          variables.pricingAnalysisId,
          variables.methodId,
        ),
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
