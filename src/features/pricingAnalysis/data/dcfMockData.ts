import type { DCFFormType } from '../schemas/dcfForm';
import type { DCF, DCFTemplateType } from '@features/pricingAnalysis/types/dcf.ts';

// ─── Mock Data ───
export const dcfMockData: DCF = {
  id: 'dcf-001',
  templateCode: 'dcf-hotel',
  templateName: 'dcf-hotel',
  totalNumberOfYears: 6,
  totalNumberOfDayInYear: 365,
  capitalizeRate: 3,
  discountedRate: 5,
  sections: [
    {
      dbId: 'h1f4c8a2-9d31-4e7b-a5c2-11d7b3e69401',
      sectionType: 'income',
      sectionName: 'Income',
      identifier: 'positive',
      displaySeq: 0,
      categories: [
        {
          dbId: 'h2a7d5c9-3e41-4b8f-b6d3-22e8c4f7a402',
          categoryType: 'income',
          categoryName: 'Operating Income',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
              assumptionType: 'I01',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '01',
                detail: {
                  increaseRatePct: 10,
                  increaseRateYrs: 3,
                  occupancyRateFirstYearPct: 80,
                  occupancyRatePct: 5,
                  occupancyRateYrs: 3,
                },
              },
            },
            {
              dbId: 'h4c9f7e2-5a63-4ad1-d8f5-44a0e6b9c404',
              assumptionType: 'I04',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'assumption',
                    dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              dbId: 'h5d0a8f3-6b74-4be2-e9a6-55b1f7cad405',
              assumptionType: 'I05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 2,
              method: {
                methodType: '14',
              },
            },
          ],
        },
      ],
    },
    {
      dbId: 'h6e1b9a4-7c85-4cf3-fa07-66c208dbe406',
      sectionType: 'expenses',
      sectionName: 'Expenses / Costs',
      identifier: 'negative',
      displaySeq: 1,
      categories: [
        {
          dbId: 'h7f2cab5-8d96-4d04-ab18-77d319ecf407',
          categoryType: 'expenses',
          categoryName: 'Direct Operating Expenses',
          identifier: 'expenses',
          displaySeq: 0,
          assumptions: [
            {
              dbId: 'h8a3dbc6-9ea7-4e15-bc29-88e42af0a408',
              assumptionType: 'E15',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 15,
                  refTarget: {
                    kind: 'assumption',
                    dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              dbId: 'h9b4ecd7-afb8-4f26-cd3a-99f53b01b409',
              assumptionType: 'E07',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '08',
                detail: {},
              },
            },
            {
              dbId: 'ha5f0de8-b0c9-4037-de4b-a0g64c12c410',
              assumptionType: 'E10',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'assumption',
                    dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
          ],
        },
        {
          dbId: 'hb6a1ef9-c1da-4148-ef5c-b1h75d23d411',
          categoryType: 'expenses',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              dbId: 'hc7b2f0a-d2eb-4259-f06d-c2i86e34e412',
              assumptionType: 'E09',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 12,
                  refTarget: {
                    kind: 'assumption',
                    dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              dbId: 'hd8c301b-e3fc-436a-a17e-d3j97f45f413',
              assumptionType: 'E17',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 3,
                  refTarget: {
                    kind: 'assumption',
                    dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              dbId: 'he9d412c-f40d-447b-b28f-e4k08g56g414',
              assumptionType: 'E13',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'assumption',
                    dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              dbId: 'h16f634e-162f-469d-d4a1-g6m20i78i416',
              assumptionType: 'E03',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'assumption',
                    dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              dbId: 'h27g745f-2730-47ae-e5b2-h7n31j89j417',
              assumptionType: 'E14',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'assumption',
                    dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              dbId: 'h27g745f-2230-47ae-e5b2-h7n31j89j418',
              assumptionType: 'E18',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'assumption',
                    dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
          ],
        },
        {
          dbId: 'h38h8560-3841-48bf-f6c3-i8o42k90k418',
          categoryType: 'gop',
          categoryName: 'Gross Operating Profit (GOP)',
          identifier: 'gop',
        },
        {
          dbId: 'h49i9671-4952-49c0-a7d4-j9p53l01l419',
          categoryType: 'fixedExps',
          categoryName: 'Fixed Charge',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              dbId: 'h5aj0782-5a63-4ad1-b8e5-k0q64m12m420',
              assumptionType: 'E20',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'assumption',
                    dbId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              dbId: 'h6bk1893-6b74-4be2-c9f6-l1r75n23n421',
              assumptionType: 'E06',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '12',
                detail: {
                  proportionPct: 0.1,
                  increaseRatePct: 2,
                  increaseRateYrs: 1,
                },
              },
            },
            {
              dbId: 'h7cl2904-7c85-4cf3-da07-m2s86o34o422',
              assumptionType: 'E12',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '10',
              },
            },
            {
              dbId: 'h8dm3015-8d96-4d04-eb18-n3t97p45p423',
              assumptionType: 'E00',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 5,
                  refTarget: {
                    kind: 'category',
                    dbId: 'h38h8560-3841-48bf-f6c3-i8o42k90k418',
                  },
                },
              },
            },
            {
              dbId: 'h9en4126-9ea7-4e15-fc29-o4u08q56q424',
              assumptionType: 'E11',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 5,
                  refTarget: {
                    kind: 'category',
                    dbId: 'h38h8560-3841-48bf-f6c3-i8o42k90k418',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      dbId: 'hafo5237-afb8-4f26-ad3a-p5v19r67r425',
      sectionType: 'summaryDCF',
      sectionName: 'Summary',
      identifier: 'empty',
      displaySeq: 2,
    },
  ],
};
