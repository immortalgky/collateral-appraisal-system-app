import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { LAND_PROPERTY } from '@features/appraisal/components/priceAnalysis/data/propertyData.ts';
import {
  APPROACHES_QUERY_RESPONSE,
  GET_PROPERTY_GROUP_BY_ID_RESPONSE,
  MOC_SURVEY_DATA,
} from '@features/appraisal/components/priceAnalysis/data/data.ts';
import {
  type AddPriceAnalysisApproachRequestType,
  type AddPriceAnalysisApproachResponseType,
  type AddPriceAnalysisMethodRequestType,
  type AddPriceAnalysisMethodResponseType,
  GetComparativeFactorsResponse,
  type GetComparativeFactorsResponseType,
  type GetPricingAnalysisResponseType,
  type GetPropertyGroupByIdResponseType,
  type SaveComparativeAnalysisRequestType,
  type SaveComparativeAnalysisResponseType,
} from '@features/appraisal/components/priceAnalysis/schemas/v1.ts';

export function useGetPropertyGroupById(appraisalId: string, groupId: string) {
  return useQuery({
    queryKey: ['price-analysis', groupId, appraisalId],
    queryFn: async (): Promise<GetPropertyGroupByIdResponseType> => {
      // const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups/${groupId}`);
      // return GetPropertyGroupByIdResponse.parse(data);

      // MOCK delay:
      await new Promise(resolve => setTimeout(resolve, 3000));
      return GET_PROPERTY_GROUP_BY_ID_RESPONSE;
    },
    enabled: !!appraisalId && !!groupId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Hook for fetching price analysis approach and method by group Id
 * GET /appraisal ...
 */
export function useGetPricingAnalysis(id: string | undefined) {
  return useQuery({
    queryKey: ['price-analysis', id],
    queryFn: async (): Promise<GetPricingAnalysisResponseType> => {
      // const { data } = await axios.get(`/price-analysis/${id}`);
      // return GetPricingAnalysisResponse.parse(data);

      // MOCK delay:
      await new Promise(resolve => setTimeout(resolve, 3000));
      // validate mock matches schema:
      // return GetPricingAnalysisResponse.parse(APPROACHES_QUERY_RESPONSE);
      return APPROACHES_QUERY_RESPONSE;
    },
    enabled: !!id,
    refetchOnWindowFocus: false, // don't refetch when tab focuses
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Hook for fetching comparative factor bu method id
 * GET /appraisal ...
 */
export function useGetComparativeFactors(id: string | undefined, methodId: string | undefined) {
  return useQuery({
    queryKey: ['price-analysis', id, methodId],
    queryFn: async (): Promise<GetComparativeFactorsResponseType> => {
      const { data } = await axios.get(
        `/pricing-analysis/${id}/methods/${methodId}/comparative-factors`,
      );
      return GetComparativeFactorsResponse.parse(data);

      // MOCK delay:
      // await new Promise(resolve => setTimeout(resolve, 3000));
      // return; // return mock data
    },
    enabled: !!id && !!methodId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

/**
 * Hook for fetching a group of collateral by group Id
 * GET /appraisal/${groupId} ...
 * @param groupId
 * @returns
 */
export function useGetAppraisalGroupById(groupId: string | undefined) {
  // return useQuery({
  //   queryKey: [''],
  //   queryFn: async (): Promise<> => {
  //     const { data } = await axios.get(`/appraisal/${groupId}`);
  //     return data;
  //   },
  // });

  // console.log('GET /appraisal/${groupId}');
  return null;
}

/**
 * Hook for adding approaches to price analysis
 * POST /appraisal/ ...
 * @returns
 */
export function useAddPriceAnalysisApproach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: string;
      request: AddPriceAnalysisApproachRequestType;
    }): Promise<AddPriceAnalysisApproachResponseType> => {
      const { data: response } = await axios.post(`/pricing-analysis/${id}/approaches`, request);
      return response;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['priceAnalysis'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
}

/**
 * Hook for adding approaches to price analysis
 * POST /appraisal/ ...
 * @returns
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
      const { data: response } = await axios.post(
        `/pricing-analysis/${id}/methods/${methodId}/comparative-analysis`,
        request,
      );
      return response;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['priceAnalysis'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
}

/**
 * Hook for adding methods to price analysis
 * POST /appraisal/ ...
 * @returns
 */
export function useAddPriceAnalysisMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      approachId,
      request,
    }: {
      id: string;
      approachId: string;
      request: AddPriceAnalysisMethodRequestType;
    }): Promise<AddPriceAnalysisMethodResponseType> => {
      const { data: response } = await axios.post(
        `/pricing-analysis/${id}/approaches/${approachId}/methods`,
        request,
      );
      return response;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['priceAnalysis'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
}

/**
 * get property by property Id
 * @param appraisalId - appraisal Id
 * @param propertyId - property Id
 * @returns
 */
export function useGetPropertyById(
  appraisalId: string | undefined,
  propertyId: string | undefined,
): any {
  return useQuery({
    queryKey: ['appraisal', appraisalId, propertyId],
    queryFn: async (): Promise<unknown> => {
      // const { data } = await axios.get(`/appraisals/${appraisalId}/properties/${propertyId}/`);

      // MOCK delay:
      await new Promise(resolve => setTimeout(resolve, 3000));
      return LAND_PROPERTY;
    },
    enabled: !!appraisalId && !!propertyId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

export function useGetMarketSurveys() {
  const queryKey = ['marketSurvey'];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<any> => {
      // const { data } = await axios.get(`/market-comparable/`);

      // MOCK delay:
      await new Promise(resolve => setTimeout(resolve, 3000));
      return MOC_SURVEY_DATA;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
}

export function useGetPriceAnalysisTemplates() {
  const queryKey = ['priceAnalysis'];
  return useQuery({
    queryKey,
  });
}
