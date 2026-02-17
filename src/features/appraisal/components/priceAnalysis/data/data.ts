import type {
  GetPricingAnalysisResponseType,
  GetPropertyGroupByIdResponseType,
} from '../schemas/v1';

/** approach and method query response */
export const APPROACHES_QUERY_RESPONSE: GetPricingAnalysisResponseType = {
  id: '00000000-0000-0000-0000-000000000001',
  propertyGroupId: 'D7AA433E-F36B-1410-8965-006F4F934FE1',
  status: '',
  finalMarketValue: 0,
  finalAppraisedValue: 0,
  finalForcedSaleValue: 0,
  valuationDate: '2025-01-15T10:00:00',
  approaches: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      approachType: 'MARAPPR',
      appraisalValue: 10000000,
      isCandidated: false,
      methods: [
        {
          id: '00000000-0000-0000-0000-000000000000',
          methodType: 'WQS_MARKET',
          isCandidated: false,
          appraisalValue: 10000000,
        },
        {
          id: '00000000-0000-0000-0000-000000000001',
          methodType: 'SAG_MARKET',
          isCandidated: false,
          appraisalValue: 15000000,
        },
      ],
    },
  ],
};

export const GET_MARKET_SURVEYS_QUERY: Record<string, unknown>[] = [
  {
    id: '00000000-0000-0000-0000-000000000000',
  },
  {
    id: '00000000-0000-0000-0000-000000000001',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
  },
];

/** GetPropertyGroupById */
export const GET_PROPERTY_GROUP_BY_ID_RESPONSE: GetPropertyGroupByIdResponseType = {
  id: '00000000-0000-0000-0000-000000000001',
  groupNumber: 1,
  groupName: 'Land group',
  description: '',
  useSystemCalc: true,
  properties: [{ propertyId: '019e2a6b-9c2d-7a44-b2d1-6d2b7f5c3a10', sequenceInGroup: 1 }],
};

export const COLLATERAL_TYPE = [
  {
    value: 'L',
    label: 'Land',
  },
  {
    value: 'B',
    label: 'Building',
  },
  {
    value: 'LB',
    label: 'Land and Building',
  },
  {
    value: 'C',
    label: 'Condo',
  },
];
