import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { PriceAnalysisApproachRequest } from './type';

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
 * Hook for fetching approach, method, link between approach and method
 * GET /params ...
 * parameter
 */
export const useGetApproachParams = () => {
  // return useQuery({
  //   queryKey: [''],
  //   queryFn: async (): Promise<> => {
  //     const { data } = await axios.get(`/params/`, { params: {} });
  //     return data;
  //   },
  // });
  // console.log(
  //   'GET /params { approachParams, methodParams, approachMethodLinkedParams, approachIcons, methodIcons }',
  // );
  // return { approachParams, methodParams, approachMethodLinkedParams, approachIcons, methodIcons };
};

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
    mutationFn: async ({ groupId, data }: { groupdId: string; data: any }) => {
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
