import type {
  GetPricingAnalysisResponseType,
  GetPropertyGroupByIdResponseType,
} from '../schemas/v1';

/** approach and method query response */
export const APPROACHES_QUERY_RESPONSE: GetPricingAnalysisResponseType = {
  id: '019c6ccf-013b-7f92-956e-0ed0ace1df15',
  propertyGroupId: 'ec87433e-f36b-1410-8bff-00c20893b8c7',
  status: '',
  finalMarketValue: 0,
  finalAppraisedValue: 0,
  finalForcedSaleValue: 0,
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
          appraisalValue: 0,
        },
        {
          id: '00000000-0000-0000-0000-000000000001',
          methodType: 'SAG_MARKET',
          isCandidated: false,
          appraisalValue: 0,
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          methodType: 'DC_MARKET',
          isCandidated: false,
          appraisalValue: 0,
        },
      ],
    },
  ],
};

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
