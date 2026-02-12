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
      // const { data } = await axios.get(`/market-comparables/${appraisalId}`);
      const { data } = await axios.get(`/market-comparables`);
      return data;
    },
  });
};

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
