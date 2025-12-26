import type {
  CreateMarketSurveyRequestType,
  CreateMarketSurveyResponseType,
} from '@/shared/forms/marketSurvey';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useCreateMarketSurveyRequest = () => {
  return useMutation({
    mutationFn: async (
      request: CreateMarketSurveyRequestType,
    ): Promise<CreateMarketSurveyResponseType> => {
      console.log(request);
      const { data } = await axios.post('https://localhost:7111/market-survey', request);
      return data;
    },
    // TODO: Change to actual logic
    onSuccess: data => {
      console.log(data);
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
      // const { data } = await axios.get(`https://localhost:7111/market-survey/${code}`);
      // return data;
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
      // const { data } = await axios.get(`/market-survey?id=${appraisalId}`);
      // return data;
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
      // const { data } = await axios.get(`/market-survey?id=${marketId}`);
      // return data;
      return market;
    },
  });
};

export const useGetMarketSurveyTemplate = (collateralType?: string) => {
  return useQuery({
    queryKey: ['market-survey-template', collateralType],
    enabled: !!collateralType,
    queryFn: async () => {
      // const { data } = await axios.get(`/market-survey-template?collateralType=${collateralType}`);
      // return data;
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
      // const { data } = await axios.get(`/parameters?parameterGroup=${parameterGroup}`);
      // return data;
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
  // {
  //   parameterGroup: 'BuildingType',
  //   values: [
  //     { code: 'SGH', description: 'Single House' },
  //     { code: 'TWH', description: 'Twin House' },
  //     { code: 'TNH', description: 'Townhouse' },
  //     { code: 'CMB', description: 'Commercial Building' },
  //     { code: 'UNT', description: 'Condominium' },
  //     { code: 'PROJ', description: 'Project' },
  //     { code: 'OFC', description: 'Office' },
  //     { code: 'HTL', description: 'Hotel' },
  //     { code: 'DPS', description: 'Department Store' },
  //     { code: 'FAC', description: 'Factory' },
  //     { code: 'WH', description: 'Warehouse' },
  //     { code: 'APT', description: 'Apartment' },
  //     { code: 'RSB', description: 'Residential Building' },
  //     { code: 'L', description: 'Land' },
  //     { code: '99', description: 'Other' },
  //   ],
  // },
  // {
  //   parameterGroup: 'BuildingCondition',
  //   values: [
  //     { code: 'NEW', description: 'New' },
  //     { code: 'MODERATE', description: 'Moderate' },
  //     { code: 'OLD', description: 'Old' },
  //     { code: 'CONSTRUCTION', description: 'Construction' },
  //     { code: 'DILAPIDATED', description: 'Dilapidated' },
  //   ],
  // },
];
