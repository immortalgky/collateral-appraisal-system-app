import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { PriceAnalysisApproachRequest } from '../type';
import { APPROACHES_QUERY_RESPONSE, MOC_SURVEY_DATA, PROPERTIES } from '../../../data/data';
import {
  GetPricingAnalysisResponse,
  type AddPriceAnalysisApproachRequestType,
  type AddPriceAnalysisApproachResponseType,
  type AddPriceAnalysisMethodRequestType,
  type AddPriceAnalysisMethodResponseType,
  type GetPricingAnalysisResponseType,
} from '../schemas/V1';

/**
 * Hook for fetching price analysis approach and method by group Id
 * GET /appraisal ...
 */
export const useGetPricingAnalysis = (id: string | undefined) => {
  return useQuery({
    queryKey: ['price-analysis', id],
    queryFn: async (): Promise<GetPricingAnalysisResponseType> => {
      // REAL:
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
};

/**
 * Hook for fetching a group of collateral by group Id
 * GET /appraisal/${groupId} ...
 * @param groupId
 * @returns
 */
export const useGetAppraisalGroupById = (groupId: string | undefined) => {
  // return useQuery({
  //   queryKey: [''],
  //   queryFn: async (): Promise<> => {
  //     const { data } = await axios.get(`/appraisal/${groupId}`);
  //     return data;
  //   },
  // });

  // console.log('GET /appraisal/${groupId}');
  return null;
};

/**
 * Hook for adding approaches to price analysis
 * POST /appraisal/ ...
 * @returns
 */
export const useAddPriceAnalysisApproach = () => {
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
};

/**
 * Hook for adding methods to price analysis
 * POST /appraisal/ ...
 * @returns
 */
export const useAddPriceAnalysisMethod = () => {
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
};

/**
 * Hook for adding group appraisal value
 * POST /appraisal/ ...
 * @returns
 */
export const useSelectPriceAnalysisApproachMethod = () => {
  return useMutation({
    mutationFn: async ({
      groupId,
      data,
    }: {
      groupdId: string;
      data: PriceAnalysisApproachRequest;
    }) => {
      const { data: response } = await axios.post(`/appraisal/${groupId}/`, data);
      return response;
    },
  });
};

/**
 *
 * @param groupId
 * @returns
 */
export const useGetProperty = (groupId: string = '') => {
  const queryKey = [];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<any> => {
      await new Promise(resolve => setTimeout(resolve, 300));

      const properties = [...getMockProperties()];

      // filter property to under this group

      return {
        result: {
          items: properties,
        },
      };
    },
    staleTime: 30 * 1000, // Cache later
  });
};

const getMockProperties = () => {
  return PROPERTIES;
};

export const useGetMarketSurvey = (groupId: string = '') => {
  const queryKey = ['marketSurvey'];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<any> => {
      await new Promise(resolve => setTimeout(resolve, 300));

      const marketSurveys = [...getMockMarketSurveys()];

      // filter property to under this group

      return {
        result: {
          items: marketSurveys,
        },
      };
    },
    staleTime: 30 * 1000, // Cache later
  });
};

const getMockMarketSurveys = () => {
  return MOC_SURVEY_DATA;
};
