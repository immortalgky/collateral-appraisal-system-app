import type {
  GetSummaryDecisionResponseType,
  UpdateSummaryDecisionRequestType,
  UpdateSummaryDecisionResponseType,
} from '@/shared/schemas/v1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';

export const useGetSummaryDecision = (appraisalId: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId],
    enabled: !!appraisalId,
    queryFn: async (): Promise<GetSummaryDecisionResponseType> => {
      // const { data } = await axios.get(`/appraisals/${appraisalId}/summart-decision/`);
      return summaryDecision;
    },
  });
};
export const useGetActivityTracking = (appraisalId: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'activity-tracking'],
    enabled: !!appraisalId,
    queryFn: async () => {
      // const { data } = await axios.get(`/appraisals/${appraisalId}/summart-decision/`);
      return activityTracking;
    },
    retry: (failureCount, error) => {
      // Don't retry 404 errors - they're not recoverable
      if (isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      // Default: retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
};

const activityTracking = [
  {
    role: 'Appraisal Staff',
    userName: 'Peter Parker',
    userId: '',
    remarkDecision: '',
    receiveDate: '',
    sendDate: '',
  },
  {
    role: 'Admin Staff',
    userName: 'Maria Gouse',
    userId: '',
    remarkDecision: '',
    receiveDate: '',
    sendDate: '',
  },
  {
    role: 'Request Checker',
    userName: 'Mary Jane',
    userId: '',
    remarkDecision: '',
    receiveDate: '',
    sendDate: '',
  },
  {
    role: 'Request maker',
    userName: 'Jane Deo',
    userId: '',
    remarkDecision: '',
    receiveDate: '',
    sendDate: '',
  },
];

export const useUpdateSummaryDecision = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateSummaryDecisionRequestType,
    ): Promise<UpdateSummaryDecisionResponseType> => {
      console.log(request);
      const { data } = await axios.put(`/appraisals/${request.apprId}/summary-decision`, request);
      return data;
    },
    onSuccess: data => {
      console.log('Summary decision updated successfully', data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

const summaryDecision = {
  dateTime: '',
  appraisalPrice: 1000000,
  buildingInsurancePrice: 500000,
  forcedSalePrice: 700000,
  groupValuations: [
    {
      groupNumber: 1,
      marketComparasionApproach: 1000000,
      useApproach: 'marketComparasionApproach',
    },
    { groupNumber: 2, costApproach: 1000000, incomeApproach: 1200000, useApproach: 'costApproach' },
  ],
  landTitle: [
    {
      titleDeedNumber: '1111',
      areaRai: 0,
      areaNgan: 0,
      areaSquareWa: 50,
      isMissingFromSurvey: false,
      governmentPricePerSqWa: 50000,
      governmentPrice: 2500000,
    },
    {
      titleDeedNumber: '1234',
      areaRai: 0,
      areaNgan: 0,
      areaSquareWa: 50,
      isMissingFromSurvey: false,
      governmentPricePerSqWa: 50000,
      governmentPrice: 2500000,
    },
    {
      titleDeedNumber: '1232',
      areaRai: 0,
      areaNgan: 0,
      areaSquareWa: 50,
      isMissingFromSurvey: true,
    },
  ],
  condition: '',
  remark: '',
  opinionAppraiser: '',
  opinionCommittee: '',
  specialAssumption: '',
};
