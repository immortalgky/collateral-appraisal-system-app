import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { PriceAnalysisApproachRequest } from './type';

/**
 * initialize approach and method choices
 * 1 api to fetch all approach and method choices
 */

// onload
const approachParams: Record<string, string>[] = [
  { id: '01', label: 'Market Approach' },
  { id: '02', label: 'Cost Approach' },
  { id: '03', label: 'Income Approach' },
  { id: '04', label: 'Residual Approach' },
];

const methodParams: Record<string, string>[] = [
  { id: '01', label: 'Weighted Quality Score (WQS)' },
  { id: '02', label: 'Sales Adjustment Grid' },
  { id: '03', label: 'Direct Comparison' },
  { id: '04', label: 'Building Cost' },
  { id: '05', label: 'Profit Rent' },
  { id: '06', label: 'Leasehold' },
  { id: '07', label: 'Machinery Cost' },
  { id: '08', label: 'Income' },
  { id: '09', label: 'Hypothesis' },
];

const approachMethodLinkedParams: ApproachMethodLink[] = [
  { apprId: '01', methodIds: ['01', '02', '03'] },
  { apprId: '02', methodIds: ['01', '02', '03', '04', '05', '06', '07'] },
  { apprId: '03', methodIds: ['08'] },
  { apprId: '04', methodIds: ['09'] },
];

const approachIcons: Record<string, string> = {
  '01': 'shop',
  '02': 'triangle-person-digging',
  '03': 'chart-line-up',
  '04': 'land-mine-on',
};

const methodIcons: Record<string, string> = {
  '01': 'scale-balanced',
  '02': 'table',
  '03': 'house-building',
  '04': 'person-digging',
  '05': 'file-signature',
  '06': 'file-contract',
  '07': 'gears',
  '08': 'chart-line',
  '09': 'flask-vial',
};

const APPROACHES_MOC: PriceAnalysisApproachRequest[] = [
  {
    id: 'MARAPPR',
    appraisalValue: 1000000000,
    isCandidated: true,
    methods: [
      { id: 'WQS', isCandidated: true, appraisalValue: 1000000000 },
      { id: 'SAG', isCandidated: false, appraisalValue: 1200000000 },
    ],
  },
  {
    id: 'COSTAPPR',
    appraisalValue: 1000000,
    isCandidated: false,
    methods: [{ id: 'SAG', isCandidated: true, appraisalValue: 1000000 }],
  },
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
  return { approachParams, methodParams, approachMethodLinkedParams, approachIcons, methodIcons };
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
