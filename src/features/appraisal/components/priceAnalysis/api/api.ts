import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { PriceAnalysisApproachRequest } from '../features/selection/type';
import { MOC_SURVEY_DATA, PROPERTIES } from '../data/data';

/**
 * initialize approach and method choices
 * 1 api to fetch all approach and method choices
 */

// onload

const APPROACHES_MOC: PriceAnalysisApproachRequest[] = [
  // {
  //   id: 'MARAPPR',
  //   appraisalValue: 1000000000,
  //   isCandidated: true,
  //   methods: [
  //     { id: 'WQS', isCandidated: true, appraisalValue: 1000000000 },
  //     { id: 'SAG', isCandidated: false, appraisalValue: 1200000000 },
  //   ],
  // },
  // {
  //   id: 'COSTAPPR',
  //   appraisalValue: 1000000,
  //   isCandidated: false,
  //   methods: [{ id: 'SAG', isCandidated: true, appraisalValue: 1000000 }],
  // },
];

/**
 * Hook for fetching price analysis approach and method by group Id
 * GET /appraisal ...
 * @param groupId
 */
export const useGetPriceAnalysisApproachMethodByGroupId = (groupId: string | undefined) => {
  // return useQuery({
  //   queryKey: ['group', groupId],
  //   queryFn: async (): Promise<PriceAnalysisApproachRequest> => {
  //     const { data } = await axios.get(`/appraisal/${groupId}`);
  //     return data;
  //   },
  // });

  // console.log('GET /appraisal/price-analysis/ { approach, method }');
  return APPROACHES_MOC;
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
 * Hook for adding approaches and methods to price analysis
 * POST /appraisal/ ...
 * @returns
 */
export const useAddPriceAnalysisApproachMethod = () => {
  // const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: any }) => {
      const { data: response } = await axios.post(`/appraisal/${groupId}/`, data);
      return response;
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
  const queryKey = [];

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
