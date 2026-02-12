import type {
  CreateMarketSurveyRequestType,
  CreateMarketSurveyResponseType,
} from '@/shared/forms/marketSurvey';
import type {
  CreateBuildingPropertyRequestType,
  CreateBuildingPropertyResponseType,
  GetBuildingPropertyByIdResultType,
  GetSummaryDecisionResponseType,
  UpdateBuildingPropertyRequestType,
  UpdateBuildingPropertyResponseType,
  UpdateSummaryDecisionRequestType,
  UpdateSummaryDecisionResponseType,
} from '@/shared/schemas/v1';
import {
  schemas,
  type CreateLandPropertyRequestType,
  type CreateLandPropertyResponseType,
  type DeletePropertyResponseType,
} from '@/shared/schemas/v1';
import type {
  CreateLandAndBuildingPropertyRequestType,
  CreateLandAndBuildingPropertyResponseType,
  GetLandAndBuildingPropertyByIdResultType,
  UpdateLandAndBuildingPropertyRequestType,
  UpdateLandAndBuildingPropertyResponseType,
} from '../../shared/schemas/v1';
import type {
  CreateCondoPropertyRequestType,
  CreateCondoPropertyResponseType,
  GetCondoPropertyByIdResultType,
  UpdateCondoPropertyRequestType,
  UpdateCondoPropertyResponseType,
} from '../../shared/schemas/v1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { AppraisalData } from './context/AppraisalContext';
import type z from 'zod';
import { isAxiosError } from 'axios';

const { GetLandPropertyByIdResult, UpdateLandPropertyRequest, UpdateLandPropertyResponse } =
  schemas;

export type GetLandPropertyByIdResultType = z.infer<typeof GetLandPropertyByIdResult>;
export type UpdateLandPropertyRequestType = z.infer<typeof UpdateLandPropertyRequest>;
export type UpdateLandPropertyResponseType = z.infer<typeof UpdateLandPropertyResponse>;

// ==================== Collateral Appraisal APIs ====================

// ==================== Create Properties ============================

export const useCreateLandProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateLandPropertyRequestType,
    ): Promise<CreateLandPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.post(`/appraisals/${request.apprId}/land-properties`, request);
      return data;
    },
    onSuccess: data => {
      console.log('Properties land created successfully', data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useCreateBuildingProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateBuildingPropertyRequestType,
    ): Promise<CreateBuildingPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.post(
        `/appraisals/${request.apprId}/building-properties`,
        request,
      );
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

export const useCreateLandAndBuildingProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateLandAndBuildingPropertyRequestType,
    ): Promise<CreateLandAndBuildingPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.post(
        `/appraisals/${request.apprId}/land-and-building-properties`,
        request,
      );
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

export const useCreateCondoProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateCondoPropertyRequestType,
    ): Promise<CreateCondoPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.post(`/appraisals/${request.apprId}/condo-properties`, request);
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

// ==================== Update Properties ==========================

export const useUpdateLandProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateLandPropertyRequestType,
    ): Promise<UpdateLandPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.put(
        `/appraisals/${request.apprId}/properties/${request.propertyId}/land-detail`,
        request,
      );
      return data;
    },
    onSuccess: data => {
      console.log('Properties land updated successfully', data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useUpdateBuildingProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateBuildingPropertyRequestType,
    ): Promise<UpdateBuildingPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.put(
        `/appraisals/${request.apprId}/properties/${request.propertyId}/building-detail`,
        request,
      );
      return data;
    },
    onSuccess: data => {
      console.log('Properties building updated successfully', data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

export const useUpdateCondoProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateCondoPropertyRequestType,
    ): Promise<UpdateCondoPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.put(
        `/appraisals/${request.apprId}/properties/${request.propertyId}/condo-detail`,
        request,
      );
      return data;
    },
    onSuccess: data => {
      console.log('Properties condo updated successfully', data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

// export const useUpdateCondoPMAProperty = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async (request: UpdateCondoPMARequestType): Promise<UpdateCondoPMAResponseType> => {
//       console.log(request);
//       const { data } = await axios.put(
//         `/appraisals/${request.apprId}/properties/${request.propertyId}/condo-detail`,
//         request,
//       );
//       return data;
//     },
//     onSuccess: data => {
//       console.log('Properties condo updated successfully', data);
//       queryClient.invalidateQueries({ queryKey: ['appraisal'] });
//     },
//     onError: (error: any) => {
//       console.log(error);
//     },
//   });
// };

export const useUpdateLandAndBuildingProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateLandAndBuildingPropertyRequestType,
    ): Promise<UpdateLandAndBuildingPropertyResponseType> => {
      console.log(request);
      const { data } = await axios.put(
        `/appraisals/${request.apprId}/properties/${request.propertyId}/land-and-building-detail`,
        request,
      );
      return data;
    },
    onSuccess: data => {
      console.log('Properties land and building updated successfully', data);
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};
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

// export const useUpdateLandAndBuildingPMAProperty = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async (
//       request: UpdateLandAndBuildingPMARequestType,
//     ): Promise<UpdateLandAndBuildingPMAResponseType> => {
//       console.log(request);
//       const { data } = await axios.put(
//         `/appraisals/${request.apprId}/properties/${request.propertyId}/land-and-building-detail`,
//         request,
//       );
//       return data;
//     },
//     onSuccess: data => {
//       console.log('Properties land and building updated successfully', data);
//       queryClient.invalidateQueries({ queryKey: ['appraisal'] });
//     },
//     onError: (error: any) => {
//       console.log(error);
//     },
//   });
// };

// ==================== Get Properties ============================

export const useGetLandPropertyById = (appraisalId: string, propertyId: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'land-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetLandPropertyByIdResultType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/land-detail`,
      );
      return data;
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

export const useGetBuildingPropertyById = (appraisalId: string, propertyId: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'building-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetBuildingPropertyByIdResultType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/building-detail`,
      );
      return data;
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

export const useGetCondoPropertyById = (appraisalId: string, propertyId: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'condo-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetCondoPropertyByIdResultType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/condo-detail`,
      );
      return data;
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

// export const useGetCondoPMAPropertyById = (appraisalId: string, propertyId: string) => {
//   return useQuery({
//     queryKey: ['appraisals', appraisalId, 'condo-properties-pma', propertyId],
//     enabled: !!appraisalId && !!propertyId,
//     queryFn: async (): Promise<GetCondoPMAPropertyByIdResultType> => {
//       const { data } = await axios.get(
//         `/appraisals/${appraisalId}/properties/${propertyId}/condo-detail`,
//       );
//       return data;
//     },
//     retry: (failureCount, error) => {
//       // Don't retry 404 errors - they're not recoverable
//       if (isAxiosError(error) && error.response?.status === 404) {
//         return false;
//       }
//       // Default: retry up to 3 times for other errors
//       return failureCount < 3;
//     },
//   });
// };

export const useGetLandAndBuildingPropertyById = (appraisalId: string, propertyId: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId, 'land-and-building-properties', propertyId],
    enabled: !!appraisalId && !!propertyId,
    queryFn: async (): Promise<GetLandAndBuildingPropertyByIdResultType> => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/land-and-building-detail`,
      );
      return data;
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

export const useGetSummaryDecision = (appraisalId: string) => {
  return useQuery({
    queryKey: ['appraisals', appraisalId],
    enabled: !!appraisalId,
    queryFn: async (): Promise<GetSummaryDecisionResponseType> => {
      // const { data } = await axios.get(`/appraisals/${appraisalId}/summart-decision/`);
      return summaryDecision;
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
  activityLog: [],
};

// export const useGetLandAndBuildingPMAPropertyById = (appraisalId: string, propertyId: string) => {
//   return useQuery({
//     queryKey: ['appraisals', appraisalId, 'land-and-building-properties-pma', propertyId],
//     enabled: !!appraisalId && !!propertyId,
//     queryFn: async (): Promise<GetLandAndBuildingPMAPropertyByIdResultType> => {
//       const { data } = await axios.get(
//         `/appraisals/${appraisalId}/properties/${propertyId}/land-and-building-detail/pma`,
//       );
//       return data;
//     },
//     retry: (failureCount, error) => {
//       // Don't retry 404 errors - they're not recoverable
//       if (isAxiosError(error) && error.response?.status === 404) {
//         return false;
//       }
//       // Default: retry up to 3 times for other errors
//       return failureCount < 3;
//     },
//   });
// };

//===================== Delete Property ==========================
export const useDeleteProperty = (appraisalId: string, propertyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<DeletePropertyResponseType> => {
      const { data } = await axios.delete(`/appraisal/${appraisalId}/${propertyId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal'] });
    },
  });
};

//================================================================
// ==================== Market Survey APIs ====================

export const useCreateMarketSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateMarketSurveyRequestType,
    ): Promise<CreateMarketSurveyResponseType> => {
      console.log(request);
      const { data } = await axios.post('/market-survey', request);
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
    marketSurveyId: 1,
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
    marketSurveyId: 1,
    factorCode: 'F002',
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
    factorDesc: 'Building Condition',
    fieldName: 'buildingCondition',
    dataType: 'dropdown',
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
    templateDesc: 'Survey Template for Townhouse',
    collateralType: 'LB-Land & Building',
  },
  {
    id: 2,
    surveyNumber: 2,
    surveyName: 'Condo',
    templateDesc: 'Survey Template for Luxury Condominium',
    collateralType: 'CD-Condominium',
  },
  {
    id: 3,
    surveyNumber: 3,
    surveyName: 'Baan',
    templateDesc: 'Survey Template for Village',
    collateralType: 'LB-Land & Building',
  },
  {
    id: 4,
    surveyNumber: 4,
    surveyName: 'Baan',
    templateDesc: 'Survey Template for Village',
    collateralType: 'LB-Land & Building',
  },
  {
    id: 5,
    surveyNumber: 5,
    surveyName: 'Baan',
    templateDesc: 'Survey Template for Village',
    collateralType: 'LB-Land & Building',
  },
];

export const useGetMarketSurveyById = (marketId?: string) => {
  return useQuery({
    queryKey: ['market-survey', marketId],
    enabled: !!marketId,
    queryFn: async () => {
      return market;
    },
  });
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
    enabled: !!parameterGroup,
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
];

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
