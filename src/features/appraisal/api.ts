import {
  type CreateMarketSurveyRequestType,
  type CreateMarketSurveyResponseType,
} from '@/shared/forms/marketSurvey';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { AppraisalData } from './context/AppraisalContext';
import { schema } from '@/shared/forms/marketSurvey.ts';
import type z from 'zod';

const { DeleteMarketSurveyResponse } = schema;

export type DeleteMarketSurveyResponseType = z.infer<typeof DeleteMarketSurveyResponse>;

// ==================== Collateral Appraisal APIs ====================

export const useCreateLandRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateLandRequestType): Promise<CreateLandResponseType> => {
      console.log(request);
      const { data } = await axios.post('https://localhost:7111/land-detail', request);
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
      const { data } = await axios.post('https://localhost:7111/building-detail', request);
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
      const { data } = await axios.post('https://localhost:7111/land-building-detail', request);
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
      const { data } = await axios.post('https://localhost:7111/condo-detail', request);
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
      request: CreateMarketSurveyRequestType,
    ): Promise<CreateMarketSurveyResponseType> => {
      console.log(request);
      const { data } = await axios.post('https://localhost:7111/market-survey', request);
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['market-survey'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useSurveyTemplateFactors = (code?: string) => {
  return useQuery({
    queryKey: ['survey-template-factor', code],
    enabled: !!code,
    queryFn: async () => {
      return factor;
    },
  });
};

const factor = [
  {
    factorCode: 'F007',
    factorDesc: 'Building Type',
    fieldName: 'buildingType',
    dataType: 'radio-group',
    fieldLength: null,
    fieldDecimal: null,
    parameterGroup: 'BuildingType',
    active: 'Y',
  },
  {
    factorCode: 'F002',
    factorDesc: 'Land Area',
    fieldName: 'landArea',
    dataType: 'number-input',
    fieldLength: 3,
    fieldDecimal: 2,
    parameterGroup: '',
  },

  {
    factorCode: 'F005',
    factorDesc: 'Building Condition',
    fieldName: 'buildingCondition',
    dataType: 'dropdown',
    fieldLength: null,
    fieldDecimal: null,
    parameterGroup: 'BuildingCondition',
  },
  {
    factorCode: 'F009',
    factorDesc: 'Plot Location',
    fieldName: 'plotLocation',
    dataType: 'checkbox-group',
    fieldLength: null,
    fieldDecimal: null,
    parameterGroup: 'BuildingCondition',
  },
];

export const useGetMarketSurvey = (appraisalId?: string) => {
  return useQuery({
    queryKey: ['market-survey', appraisalId],
    enabled: !!appraisalId,
    queryFn: async () => {
      return market;
    },
  });
};
const market = [
  {
    id: 1,
    surveyNumber: 1,
    surveyName: 'Townhouse',
    templateCode: 'LD1',
    templateDesc: 'Survey Template for Townhouse',
    collateralCode: 'LB',
    collateralDesc: 'LB-Land & Building',
  },
  {
    id: 2,
    surveyNumber: 2,
    surveyName: 'Condo',
    templateCode: 'LD3',
    templateDesc: 'Survey Template for Luxury Condominium',
    collateralCode: 'U',
    collateralDesc: 'CD-Condominium',
  },
  {
    id: 3,
    surveyNumber: 3,
    surveyName: 'Baan',
    templateCode: 'LD1',
    templateDesc: 'Survey Template for Townhouse',
    collateralCode: 'LB',
    collateralDesc: 'LB-Land & Building',
  },
];

export const useGetMarketSurveyById = (marketId: string) => {
  return useQuery({
    queryKey: ['market-survey', marketId],
    enabled: !!marketId,
    queryFn: async () => {
      return marketById;
    },
  });
};
const marketById = {
  id: 1,
  surveyNumber: 1,
  surveyName: 'Townhouse',
  templateCode: 'LD1',
  templateDesc: 'Survey Template for Townhouse',
  collateralCode: 'LB',
  collateralDesc: 'LB-Land & Building',
  marketSurveyData: [
    {
      marketSurveyId: 1,
      factorCode: 'F007',
      value: 'SGH',
      measurementUnit: '',
      otherRemark: '',
      factorDesc: 'Building Type',
      fieldName: 'buildingType',
      dataType: 'radio-group',
      fieldLength: null,
      fieldDecimal: null,
      parameterGroup: 'BuildingType',
    },

    {
      marketSurveyId: 1,
      factorCode: 'F002',
      value: 111.25,
      measurementUnit: '',
      otherRemark: '',
      factorDesc: 'Land Area',
      fieldName: 'landArea',
      dataType: 'number-input',
      fieldLength: 3,
      fieldDecimal: 2,
      parameterGroup: '',
    },
    {
      marketSurveyId: 1,
      factorCode: 'F003',
      value: 111,
      measurementUnit: '',
      otherRemark: '',
      factorDesc: 'Building Area',
      fieldName: 'buildingArea',
      dataType: 'number-input',
      fieldLength: 3,
      fieldDecimal: 2,
      parameterGroup: '',
    },
    {
      marketSurveyId: 1,
      factorCode: 'F005',
      value: 'NEW',
      measurementUnit: '',
      otherRemark: '',
      factorDesc: 'Building Condition',
      fieldName: 'buildingCondition',
      dataType: 'dropdown',
      fieldLength: null,
      fieldDecimal: null,
      parameterGroup: 'BuildingCondition',
    },
    {
      marketSurveyId: 1,
      factorCode: 'F009',
      value: ['NEW', 'MODERATE'],
      measurementUnit: '',
      otherRemark: '',
      factorDesc: 'Plot Location',
      fieldName: 'plotLocation',
      dataType: 'checkbox-group',
      fieldLength: null,
      fieldDecimal: null,
      parameterGroup: 'BuildingCondition',
    },
  ],
};

export const useGetMarketSurveyTemplate = (collateralType?: string) => {
  return useQuery({
    queryKey: ['market-survey-template', collateralType],
    enabled: !!collateralType,
    queryFn: async () => {
      return template;
    },
  });
};

const template = [
  {
    surveyTemplateId: 1,
    surveyTemplateCode: 'LD1',
    templateDesc: 'Survey Template for Commercial Land',
  },
  {
    surveyTemplateId: 2,
    surveyTemplateCode: 'LD2',
    templateDesc: 'Survey Template for Industrial Land',
  },
  {
    surveyTemplateId: 3,
    surveyTemplateCode: 'LD3',
    templateDesc: 'Survey Template for Agricultural Land',
  },
  {
    surveyTemplateId: 4,
    surveyTemplateCode: 'LB1',
    templateDesc: 'Survey Template for Residential Land',
  },
];

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
    parameterGroup: 'collateralType',
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
    mutationFn: async (marketId: string): Promise<DeleteMarketSurveyResponseType> => {
      const { data } = await axios.delete(`/market-survey/${marketId}`);
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
