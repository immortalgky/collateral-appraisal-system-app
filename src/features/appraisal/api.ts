import {
  type CreateMarketComparableRequestType,
  type CreateMarketComparableResponseType,
  type DeleteMarketComparableResponseType,
  type GetMarketComparableByIdResponseType,
  type GetMarketComparablesResponseType,
  type GetMarketComparableTemplateByIdResponseType,
  type GetMarketComparableTemplatesResponseType,
  type UpdateMarketComparableRequestType,
  type UpdateMarketComparableResponseType,
} from '@/shared/schemas/v1';
import type {
  CreateBuildingRequestType,
  CreateBuildingResponseType,
} from '@/shared/forms/typeBuilding';
import type { CreateLandRequestType, CreateLandResponseType } from '@/shared/forms/v2';
import type {
  CreateLandBuildingRequestType,
  CreateLandBuildingResponseType,
} from '../../shared/forms/typeLandBuilding';
import type { CreateCondoRequestType, CreateCondoResponseType } from '../../shared/forms/typeCondo';
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { AppraisalData } from './context/AppraisalContext';

// ==================== Collateral Appraisal APIs ====================

export const useCreateLandRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateLandRequestType): Promise<CreateLandResponseType> => {
      console.log(request);
      const { data } = await axios.post('/land-detail', request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useCreateBuildingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateBuildingRequestType): Promise<CreateBuildingResponseType> => {
      console.log(request);
      const { data } = await axios.post('/building-detail', request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useCreateLandBuildingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateLandBuildingRequestType,
    ): Promise<CreateLandBuildingResponseType> => {
      console.log(request);
      const { data } = await axios.post('/land-building-detail', request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useCreateCondoRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateCondoRequestType): Promise<CreateCondoResponseType> => {
      console.log(request);
      const { data } = await axios.post('/condo-detail', request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

// ==================== Market Survey APIs ====================

export const useCreateMarketSurveyRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateMarketComparableRequestType,
    ): Promise<CreateMarketComparableResponseType> => {
      console.log(request);
      const { data } = await axios.post('/market-comparables', request);
      await axios.put(`/market-comparables/${data.id}/factor-data`, request);
      return data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['market-comparables'] });
      console.log(data);
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useUpdateMarketSurveyRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateMarketComparableRequestType,
    ): Promise<UpdateMarketComparableResponseType> => {
      console.log(request);
      const { data } = await axios.put(`/market-comparables/${request.id}`, request);
      await axios.put(`/market-comparables/${request.id}/factor-data`, request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['market-comparables'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useGetMarketSurveyTemplateByPropertyType = (propertyType?: string) => {
  return useQuery({
    queryKey: ['market-comparable-template', propertyType],
    enabled: !!propertyType,
    queryFn: async (): Promise<GetMarketComparableTemplatesResponseType> => {
      const { data } = await axios.get(`/market-comparable-templates?propertyType=${propertyType}`);
      return data;
    },
  });
};

export const useGetMarketSurveyTemplateById = (templateId?: string) => {
  return useQuery({
    queryKey: ['market-survey-template', templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<GetMarketComparableTemplateByIdResponseType> => {
      const { data } = await axios.get(`/market-comparable-templates/${templateId}`);
      return data;
    },
  });
};

export const useGetMarketSurvey = (appraisalId?: string) => {
  return useQuery({
    queryKey: ['market-survey', appraisalId],
    enabled: !!appraisalId,
    queryFn: async (): Promise<GetMarketComparablesResponseType> => {
      // const { data } = await axios.get(
      //   `/market-comparables/${appraisalId}`,
      // );
      return market;
    },
  });
};
const market = [
  {
    id: '512546f4-99af-47c6-9b6e-01db9bcf59b2',
    comparableNumber: 'MC-2026-004',
    surveyName: 'Townhouse',
    propertyType: 'Land',
    infoDateTime: '2026-02-03T17:00:00',
    sourceInfo: 'Some Website',
    createdOn: '2026-02-03T11:38:06.1612285',
  },
  {
    id: '026d8f18-47ec-46ce-88fc-778097563091',
    comparableNumber: 'MC-2026-003',
    surveyName: 'Land Survey Co., Ltd.',
    propertyType: 'Land',
    infoDateTime: '2026-02-03T17:00:00',
    sourceInfo: 'Some Website',
    createdOn: '2026-02-03T11:38:06.1612285',
  },
  {
    id: 'a52ad9bf-48c9-4451-ac5c-0c1f4e1de57e',
    comparableNumber: 'MC-2026-002',
    surveyName: 'Urban Property Surveys',
    propertyType: 'Building',
    infoDateTime: '2026-02-03T17:00:00',
    sourceInfo: 'Some Website',
    createdOn: '2026-02-03T11:38:06.1612285',
  },
  {
    id: '7ab67bda-ddf0-4576-ac36-284979c33bcf',
    comparableNumber: 'MC-2026-001',
    surveyName: 'Land Survey Co., Ltd.',
    propertyType: 'Land',
    infoDateTime: '2026-02-03T17:00:00',
    sourceInfo: 'Some Website',
    notes: 'Verified through land office records',
    createdOn: '2026-02-03T11:38:06.1612285',
  },
];

export const useGetMarketSurveyById = (marketId?: string) => {
  return useQuery({
    queryKey: ['market-survey', marketId],
    enabled: !!marketId,
    queryFn: async (): Promise<GetMarketComparableByIdResponseType> => {
      const { data } = await axios.get(`/market-comparables/${marketId}`);
      return data;
    },
  });
};

export const useGetParameter = (parameterGroup?: string) => {
  return useQuery({
    queryKey: ['parameter', parameterGroup],
    queryFn: async () => {
      return parameters;
    },
  });
};

const parameters = [
  {
    parameterGroup: 'propertyType',
    values: [
      { code: 'Land', description: 'Land' },
      { code: 'Building', description: 'Building' },
      { code: 'LandAndBuilding', description: 'Land and Building' },
      { code: 'Condo', description: 'Condominium' },
      { code: 'Machine', description: 'Machinery' },
      { code: 'LS', description: 'Lease Agreement Lands' },
      { code: 'BS', description: 'Lease Agreement Building' },
      { code: 'LBS', description: 'Lease Agreement Land and Building' },
    ],
  },
  {
    parameterGroup: 'conditionType',
    values: [
      { code: 'L', description: 'Lands' },
      { code: 'B', description: 'Building' },
      { code: 'LB', description: 'Land and Building' },
      { code: 'U', description: 'Condominium' },
      { code: 'MC', description: 'Machinery' },
      { code: 'LS', description: 'Lease Agreement Lands' },
      { code: 'BS', description: 'Lease Agreement Building' },
      { code: 'LBS', description: 'Lease Agreement Land and Building' },
    ],
  },
];

export const useDeleteMarketSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (marketId: string): Promise<DeleteMarketComparableResponseType> => {
      const { data } = await axios.delete(`/market-comparable/${marketId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
  });
};

// ==================== Appraisal APIs ====================

/**
 * Hook for fetching appraisal data by ID
 * GET /appraisals/{appraisalId}
 */
export const useGetAppraisalById = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId],
    queryFn: async (): Promise<AppraisalData> => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        appraisalId: appraisalId ?? '',
        requestId: 'AE038AFF-FB7D-44F5-AA7E-09038B523E0F',
        appraisalReportNo: 'APR-2024-001234',
        status: 'in_progress',
        workflowStage: 'Field Inspection',
        purpose: 'New Loan',
        priority: 'high',
        requestor: {
          id: 'user-001',
          name: 'Somchai Jaidee',
          avatar: null,
        },
        appointmentDateTime: '2025-01-15T10:00:00',
        appointmentLocation: 'Bangkok, Sukhumvit 23',
        feePaymentType: 'Transfer',
        paymentStatus: 'Paid',
        totalAppraisalFee: 15000,
      };
    },
    enabled: !!appraisalId,
  });
};
