import type { DCFTemplateType } from '../types/dcf';

export const dcfTestTemplate: DCFTemplateType = {
  id: 'dcf-000',
  collateralType: 'L',
  templateCode: 'dcf-test',
  templateName: 'dcf-test',
  totalNumberOfYears: 6,
  totalNumberOfDayInYear: 365,
  capitalizeRate: 3,
  discountedRate: 5,
  sections: [
    {
      dbId: '0f3a7b21-6d44-4b7c-8c11-91a4f7d23001',
      sectionType: 'income',
      sectionName: 'Income',
      identifier: 'positive',
      displaySeq: 0,
      categories: [
        {
          dbId: '1a4b8c32-7e55-4c8d-9d22-a2b5c8e34102',
          categoryType: 'income',
          categoryName: 'Operating Income',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              dbId: '2b5c9d43-8f66-4d9e-ae33-b3c6d9f45203',
              assumptionType: 'I00',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '06',
                detail: { increaseRatePct: 10, increaseRateYrs: 3 },
              },
            },
            {
              dbId: '3c6dae54-9077-4eaf-bf44-c4d7ea056304',
              assumptionType: 'I01',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '01',
                detail: { increaseRatePct: 10, increaseRateYrs: 3 },
              },
            },
            {
              dbId: '4d7ebf65-a188-4fb0-c055-d5e8fb167405',
              assumptionType: 'I01',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '02',
                detail: { increaseRatePct: 10, increaseRateYrs: 3 },
              },
            },
            {
              dbId: '5e8fc076-b299-40c1-d166-e6f90c278506',
              assumptionType: 'I01',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '03',
                detail: { increaseRatePct: 10, increaseRateYrs: 3 },
              },
            },
            {
              dbId: '6f90d187-c3aa-41d2-e277-f70a1d389607',
              assumptionType: 'I01',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '05',
                detail: { increaseRatePct: 10, increaseRateYrs: 3 },
              },
            },
            {
              dbId: '70a1e298-d4bb-42e3-f388-081b2e49a708',
              assumptionType: 'I02',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '06',
                detail: { increaseRatePct: 10, increaseRateYrs: 3 },
              },
            },
            {
              dbId: '81b2f3a9-e5cc-43f4-8499-192c3f5ab809',
              assumptionType: 'I03',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: { proportionPct: 5, refTarget: {} },
              },
            },
            {
              dbId: '92c304ba-f6dd-4405-95aa-2a3d406bc90a',
              assumptionType: 'I04',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: { proportionPct: 5, refTarget: {} },
              },
            },
            {
              dbId: 'a3d415cb-07ee-4516-a6bb-3b4e517cda0b',
              assumptionType: 'I04',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '14',
                detail: { seasonCount: 3 },
              },
            },
          ],
        },
      ],
    },
    {
      dbId: 'b4e526dc-18ff-4627-b7cc-4c5f628deb0c',
      sectionType: 'expenses',
      sectionName: 'Expenses / Costs',
      identifier: 'negative',
      displaySeq: 1,
      categories: [
        {
          dbId: 'c5f637ed-2900-4738-c8dd-5d60739efc0d',
          categoryType: 'expenses',
          categoryName: 'Direct Operating Expenses',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              dbId: 'd60748fe-3a11-4849-d9ee-6e7184affd0e',
              assumptionType: 'E00',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: { proportionPct: 5, refTarget: {} },
              },
            },
            {
              dbId: 'e718590f-4b22-495a-eaff-7f8295b10e0f',
              assumptionType: 'E00',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '14',
              },
            },
            {
              dbId: 'f8296a10-5c33-4a6b-8b10-8093a6c21f10',
              assumptionType: 'E05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '11',
              },
            },
            {
              dbId: '093a7b21-6d44-4b7c-9c21-91a4f7d23011',
              assumptionType: 'E06',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '12',
              },
            },
            {
              dbId: '1a4b8c32-7e55-4c8d-ad32-a2b5c8e34112',
              assumptionType: 'E06',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '14',
              },
            },
            {
              dbId: '2b5c9d43-8f66-4d9e-be43-b3c6d9f45213',
              assumptionType: 'E07',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '08',
              },
            },
            {
              dbId: '3c6dae54-9077-4eaf-cf54-c4d7ea056314',
              assumptionType: 'E07',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: { proportionPct: 5, refTarget: {} },
              },
            },
            {
              dbId: '4d7ebf65-a188-4fb0-d065-d5e8fb167415',
              assumptionType: 'E09',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '09',
              },
            },
          ],
        },
        {
          dbId: '5e8fc076-b299-40c1-e176-e6f90c278516',
          categoryType: 'expenses',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'negative',
          displaySeq: 0,
          assumptions: [
            {
              dbId: '6f90d187-c3aa-41d2-f287-f70a1d389617',
              assumptionType: 'E15',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '07',
              },
            },
            {
              dbId: '70a1e298-d4bb-42e3-8398-081b2e49a718',
              assumptionType: 'E12',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '10',
              },
            },
          ],
        },
        {
          dbId: '81b2f3a9-e5cc-43f4-94a9-192c3f5ab819',
          categoryType: 'gop',
          categoryName: 'Gross Operating Profit (GOP)',
          identifier: 'empty',
        },
        {
          dbId: '92c304ba-f6dd-4405-a5ba-2a3d406bc91a',
          categoryType: 'expenses',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'negative',
          displaySeq: 0,
          assumptions: [
            {
              dbId: 'a3d415cb-07ee-4516-b6cb-3b4e517cda1b',
              assumptionType: 'E17',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: { proportionPct: 5, refTarget: {} },
              },
            },
            {
              dbId: 'b4e526dc-18ff-4627-c7dc-4c5f628deb1c',
              assumptionType: 'E18',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '14',
              },
            },
            {
              dbId: 'c5f637ed-2900-4738-d8ed-5d60739efc1d',
              assumptionType: 'E19',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: { proportionPct: 5, refTarget: {} },
              },
            },
          ],
        },
      ],
    },
    {
      dbId: 'd60748fe-3a11-4849-e9fe-6e7184affd1e',
      sectionType: 'summaryDCF',
      sectionName: 'Summary',
      identifier: 'empty',
      displaySeq: 2,
    },
  ],
};

export const dcfHotelTemplate: DCFTemplateType = {
  id: 'dcf-001',
  collateralType: 'L',
  templateCode: 'dcf-hotel',
  templateName: 'dcf-hotel',
  totalNumberOfYears: 6,
  totalNumberOfDayInYear: 365,
  capitalizeRate: 3,
  discountedRate: 5,
  sections: [
    {
      templateId: 'h1f4c8a2-9d31-4e7b-a5c2-11d7b3e69401',
      sectionType: 'income',
      sectionName: 'Income',
      identifier: 'positive',
      displaySeq: 0,
      categories: [
        {
          templateId: 'h2a7d5c9-3e41-4b8f-b6d3-22e8c4f7a402',
          categoryType: 'income',
          categoryName: 'Operating Income',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
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
              templateId: 'h4c9f7e2-5a63-4ad1-d8f5-44a0e6b9c404',
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
                    templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              templateId: 'h5d0a8f3-6b74-4be2-e9a6-55b1f7cad405',
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
      templateId: 'h6e1b9a4-7c85-4cf3-fa07-66c208dbe406',
      sectionType: 'expenses',
      sectionName: 'Expenses / Costs',
      identifier: 'negative',
      displaySeq: 1,
      categories: [
        {
          templateId: 'h7f2cab5-8d96-4d04-ab18-77d319ecf407',
          categoryType: 'expenses',
          categoryName: 'Direct Operating Expenses',
          identifier: 'expenses',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'h8a3dbc6-9ea7-4e15-bc29-88e42af0a408',
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
                    templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              templateId: 'h9b4ecd7-afb8-4f26-cd3a-99f53b01b409',
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
              templateId: 'ha5f0de8-b0c9-4037-de4b-a0g64c12c410',
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
                    templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
          ],
        },
        {
          templateId: 'hb6a1ef9-c1da-4148-ef5c-b1h75d23d411',
          categoryType: 'expenses',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'hc7b2f0a-d2eb-4259-f06d-c2i86e34e412',
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
                    templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              templateId: 'hd8c301b-e3fc-436a-a17e-d3j97f45f413',
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
                    templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              templateId: 'he9d412c-f40d-447b-b28f-e4k08g56g414',
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
                    templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              templateId: 'h16f634e-162f-469d-d4a1-g6m20i78i416',
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
                    templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              templateId: 'h27g745f-2730-47ae-e5b2-h7n31j89j417',
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
                    templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              templateId: 'h27g745f-2230-47ae-e5b2-h7n31j89j418',
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
                    templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
          ],
        },
        {
          templateId: 'h38h8560-3841-48bf-f6c3-i8o42k90k418',
          categoryType: 'gop',
          categoryName: 'Gross Operating Profit (GOP)',
          identifier: 'gop',
        },
        {
          templateId: 'h49i9671-4952-49c0-a7d4-j9p53l01l419',
          categoryType: 'fixedExps',
          categoryName: 'Fixed Charge',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'h5aj0782-5a63-4ad1-b8e5-k0q64m12m420',
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
                    templateId: 'h3b8e6d1-4f52-49c0-c7e4-33f9d5a8b403',
                  },
                },
              },
            },
            {
              templateId: 'h6bk1893-6b74-4be2-c9f6-l1r75n23n421',
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
              templateId: 'h7cl2904-7c85-4cf3-da07-m2s86o34o422',
              assumptionType: 'E12',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '10',
              },
            },
            {
              templateId: 'h8dm3015-8d96-4d04-eb18-n3t97p45p423',
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
                    templateId: 'h38h8560-3841-48bf-f6c3-i8o42k90k418',
                  },
                },
              },
            },
            {
              templateId: 'h9en4126-9ea7-4e15-fc29-o4u08q56q424',
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
                    templateId: 'h38h8560-3841-48bf-f6c3-i8o42k90k418',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      templateId: 'hafo5237-afb8-4f26-ad3a-p5v19r67r425',
      sectionType: 'summaryDCF',
      sectionName: 'Summary',
      identifier: 'empty',
      displaySeq: 2,
    },
  ],
};

export const dcfApartmentTemplate: DCFTemplateType = {
  id: 'dcf-002',
  collateralType: 'L',
  templateCode: 'dcf-apartment',
  templateName: 'dcf-apartment',
  totalNumberOfYears: 6,
  totalNumberOfDayInYear: 365,
  capitalizeRate: 3,
  discountedRate: 5,
  sections: [
    {
      templateId: '8f3b7b0d-6c41-4c9e-9f6d-1b2a7c5e9001',
      sectionType: 'income',
      sectionName: 'Income',
      identifier: 'positive',
      displaySeq: 0,
      categories: [
        {
          templateId: '3a9d2c7e-5f14-4b88-a6d1-2c7f8e4b9002',
          categoryType: 'income',
          categoryName: 'Operating Income',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'b1e4f2a9-8d33-4e6a-91c7-4f2b6d8a9003',
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
              templateId: 'c6a8d1f4-2b57-4d93-b8a1-5d3e7f2c9004',
              assumptionType: 'I06',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'assumption',
                    templateId: 'b1e4f2a9-8d33-4e6a-91c7-4f2b6d8a9003',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      templateId: 'd2f7a4c1-9e65-4a20-8c3d-6e1f9b4a9005',
      sectionType: 'expenses',
      sectionName: 'Expenses / Costs',
      identifier: 'negative',
      displaySeq: 1,
      categories: [
        {
          id: '00000000-0000-0000-0001-000000000001',
          categoryType: 'expenses',
          categoryName: 'Direct Operating Expenses',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'e7c3b9a2-1d48-45f7-9a6e-7b2d4c8f9006',
              assumptionType: 'E15',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 15,
                  refTarget: {
                    kind: 'assumption',
                    templateId: 'b1e4f2a9-8d33-4e6a-91c7-4f2b6d8a9003',
                  },
                },
              },
            },
            {
              templateId: 'f4a1d8c7-3b92-4f5e-a1d9-8c6e2b7f9007',
              assumptionType: 'E10',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'assumption',
                    templateId: 'b1e4f2a9-8d33-4e6a-91c7-4f2b6d8a9003',
                  },
                },
              },
            },
          ],
        },
        {
          id: '00000000-0000-0000-0001-000000000002',
          categoryType: 'expenses',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'a9b6e3d1-7c24-4a8b-b2f6-9d1e5c7a9008',
              assumptionType: 'E09',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '09',
                detail: {},
              },
            },
            {
              templateId: '7d2c9f4a-6b31-4e85-90ad-1f7c3e6b9009',
              assumptionType: 'E17',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 3,
                  refTarget: {
                    kind: 'assumption',
                    templateId: 'b1e4f2a9-8d33-4e6a-91c7-4f2b6d8a9003',
                  },
                },
              },
            },
            {
              templateId: '2e8f4b7c-5d19-4c63-a8f1-2b6d9e4c9010',
              assumptionType: 'E13',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'assumption',
                    templateId: '8f3b7b0d-6c41-4c9e-9f6d-1b2a7c5e9001',
                  },
                },
              },
            },
            {
              templateId: '5c1a7e9d-4f28-4b71-93ce-3d8f2a6b9011',
              assumptionType: 'E18',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '14',
                detail: {
                  increaseRatePct: 10,
                  increaseRateYrs: 3,
                },
              },
            },
            {
              templateId: '9f4d2b6a-8c17-45e2-b7d3-4a1e6c8f9012',
              assumptionType: 'E03',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'assumption',
                    templateId: '8f3b7b0d-6c41-4c9e-9f6d-1b2a7c5e9001',
                  },
                },
              },
            },
            {
              templateId: '4b7e1c9f-2d35-4a84-8f61-5c2d7e9a9013',
              assumptionType: 'E14',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'assumption',
                    templateId: '8f3b7b0d-6c41-4c9e-9f6d-1b2a7c5e9001',
                  },
                },
              },
            },
          ],
        },
        {
          templateId: '6a2d8f1c-7b43-4d95-a2e7-6f3b1c4d9014',
          categoryType: 'gop',
          categoryName: 'Gross Operating Profit (GOP)',
          identifier: 'gop',
        },
        {
          id: '00000000-0000-0000-0001-000000000002',
          categoryType: 'fixedExps',
          categoryName: 'Fixed Charge',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: '1c9e4b7d-6f25-4a83-b1d6-7e2c5f8a9015',
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
                    templateId: '8f3b7b0d-6c41-4c9e-9f6d-1b2a7c5e9001',
                  },
                },
              },
            },
            {
              templateId: '8d3f1a6c-5b74-4e92-9c18-8a4d2e7f9016',
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
              templateId: '3f7a2d8e-1c64-4b90-a5e2-9b6c1d4f9017',
              assumptionType: 'E12',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '10',
              },
            },
            {
              templateId: '7b1e4c9a-2d58-4f73-8a6c-1d9e3b5f9018',
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
                    templateId: '6a2d8f1c-7b43-4d95-a2e7-6f3b1c4d9014',
                  },
                },
              },
            },
            {
              templateId: '2a6c9f1d-8b37-4e84-b3d1-2f7a5c9e9019',
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
                    templateId: '6a2d8f1c-7b43-4d95-a2e7-6f3b1c4d9014',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      sectionType: 'summaryDCF',
      sectionName: 'Summary',
      identifier: 'empty',
      displaySeq: 2,
    },
  ],
};

export const dcfOfficeTemplate: DCFTemplateType = {
  id: 'dcf-003',
  collateralType: 'L',
  templateCode: 'dcf-office',
  templateName: 'dcf-office',
  totalNumberOfYears: 6,
  totalNumberOfDayInYear: 365,
  capitalizeRate: 3,
  discountedRate: 5,
  sections: [
    {
      templateId: '91b6f2d4-3c57-4e8a-9d21-1f6b3a7c9201',
      sectionType: 'income',
      sectionName: 'Income',
      identifier: 'positive',
      displaySeq: 0,
      categories: [
        {
          templateId: '2e7c4a91-5d83-4b6f-a2c8-3d9e1f7b9202',
          categoryType: 'income',
          categoryName: 'Gross Income',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: '7a3d1e8c-4f62-49b7-8c15-2e6f4a9d9203',
              assumptionType: 'I02',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '06',
                detail: {
                  increaseRatePct: 10,
                  increaseRateYrs: 3,
                  occupancyRateFirstYearPct: 80,
                  occupancyRatePct: 5,
                  occupancyRateYrs: 3,
                },
              },
            },
          ],
        },
        {
          templateId: '4c8f2b7a-1d59-43e6-9a24-5b7d3e1f9204',
          categoryType: 'income',
          categoryName: 'Other Income',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: '8d1a4c7e-6b35-4f92-a1d7-6c2e5b8f9205',
              assumptionType: 'I03',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'category',
                    templateId: '2e7c4a91-5d83-4b6f-a2c8-3d9e1f7b9202',
                  },
                },
              },
            },
            {
              templateId: '1f6b3d9a-8c24-45e7-b2d1-7a4c6e2f9206',
              assumptionType: 'I06',
              assumptionName: 'Other Income',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'category',
                    templateId: '2e7c4a91-5d83-4b6f-a2c8-3d9e1f7b9202',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      templateId: '5b9e2f6c-7a41-4d83-8c2f-8d1a4b7e9207',
      sectionType: 'expenses',
      sectionName: 'Expenses / Costs',
      identifier: 'negative',
      displaySeq: 1,
      categories: [
        {
          templateId: '3a7d5c1e-9b42-4f86-a3d1-9e2c6b4f9208',
          categoryType: 'expenses',
          categoryName: 'Direct Operating Expenses',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: '6e2c8a4f-1d73-45b9-9c24-af3d7e1b9209',
              assumptionType: 'E17',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 1,
                  refTarget: {
                    kind: 'category',
                    templateId: '2e7c4a91-5d83-4b6f-a2c8-3d9e1f7b9202',
                  },
                },
              },
            },
            {
              templateId: '9c4f1b7e-2d68-4a95-b1e3-b4d8c2f69210',
              assumptionType: 'E05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '11',
                detail: {
                  energyCostIndex: 30,
                  increaseRatePct: 3,
                  increaseRateYrs: 3,
                },
              },
            },
            {
              templateId: '2b8e6d1c-5f34-47a8-8d21-c5e9a3f79211',
              assumptionType: 'E10',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 1,
                  refTarget: {
                    kind: 'category',
                    templateId: '2e7c4a91-5d83-4b6f-a2c8-3d9e1f7b9202',
                  },
                },
              },
            },
            {
              templateId: '7f3c1a9e-4d52-46b7-a8c1-d6f2b4e89212',
              assumptionType: 'M99',
              assumptionName: 'Sales and Marketing Expenses',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 1,
                  refTarget: {
                    kind: 'category',
                    templateId: '2e7c4a91-5d83-4b6f-a2c8-3d9e1f7b9202',
                  },
                },
              },
            },
          ],
        },
        {
          templateId: '4e1b7d9c-6a25-43f8-b2d4-e7c1a5f39213',
          categoryType: 'fixedExps',
          categoryName: 'Fixed Charge',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: '8a5d2f7c-3b61-4e94-9a27-f8d3c6b49214',
              assumptionType: 'E06',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
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
              templateId: '1d7c4e8a-9b53-42f6-a1d8-a9e4b7c59215',
              assumptionType: 'E12',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '10',
              },
            },
            {
              templateId: '5f2a9c1e-7d48-4b83-8e21-b1c5d8f69216',
              assumptionType: 'E14',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'section',
                    templateId: '91b6f2d4-3c57-4e8a-9d21-1f6b3a7c9201',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      templateId: '0c6e3a8f-2d74-4b91-b3e2-c2f6a9d79217',
      sectionType: 'summaryDCF',
      sectionName: 'Summary',
      identifier: 'empty',
      displaySeq: 2,
    },
  ],
};

export const dcfDepartmentStoreTemplate: DCFTemplateType = {
  id: 'dcf-004',
  collateralType: 'L',
  templateCode: 'dcf-department-store',
  templateName: 'dcf-department-store',
  totalNumberOfYears: 6,
  totalNumberOfDayInYear: 365,
  capitalizeRate: 3,
  discountedRate: 5,
  sections: [
    {
      templateId: 'ab4e2c91-6d73-4f85-9b21-13c7de5a9301',
      sectionType: 'income',
      sectionName: 'Income',
      identifier: 'positive',
      displaySeq: 0,
      categories: [
        {
          templateId: 'c19f7a42-8e35-4b6d-a2f1-24d8be6c9302',
          categoryType: 'income',
          categoryName: 'Gross Income',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'd26a8c53-1f47-4e9b-b3c2-35e9cf7d9303',
              assumptionType: 'I02',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '06',
                detail: {
                  increaseRatePct: 10,
                  increaseRateYrs: 3,
                  occupancyRateFirstYearPct: 80,
                  occupancyRatePct: 5,
                  occupancyRateYrs: 3,
                },
              },
            },
          ],
        },
        {
          templateId: 'e37b9d64-2a58-4f7c-c4d3-46fad08e9304',
          categoryType: 'income',
          categoryName: 'Other Income',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'f48cae75-3b69-409d-d5e4-57abf19f9305',
              assumptionType: 'I04',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 20,
                  refTarget: {
                    kind: 'category',
                    templateId: 'c19f7a42-8e35-4b6d-a2f1-24d8be6c9302',
                  },
                },
              },
            },
            {
              templateId: '0a59bf86-4c7a-41ae-e6f5-68bc02af9306',
              assumptionType: 'I06',
              assumptionName: 'Other Income',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 5,
                  refTarget: {
                    kind: 'category',
                    templateId: 'c19f7a42-8e35-4b6d-a2f1-24d8be6c9302',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      templateId: '1b6ad097-5d8b-42bf-f706-79cd13b09307',
      sectionType: 'expenses',
      sectionName: 'Expenses / Costs',
      identifier: 'negative',
      displaySeq: 1,
      categories: [
        {
          templateId: '2c7be1a8-6e9c-43c0-8707-8ade24c19308',
          categoryType: 'expenses',
          categoryName: 'Direct Operating Expenses',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: '3d8cf2b9-7fad-44d1-9818-9bef35d29309',
              assumptionType: 'E18',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 1,
                  refTarget: {
                    kind: 'category',
                    templateId: 'f48cae75-3b69-409d-d5e4-57abf19f9305',
                  },
                },
              },
            },
            {
              templateId: '4e9d03ca-80be-45e2-a929-acf046e39310',
              assumptionType: 'E15',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 15,
                  refTarget: {
                    kind: 'category',
                    templateId: 'ab4e2c91-6d73-4f85-9b21-13c7de5a9301',
                  },
                },
              },
            },
            {
              templateId: '5fad14db-91cf-46f3-ba3a-bd0157f49311',
              assumptionType: 'E02',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 15,
                  refTarget: {
                    kind: 'category',
                    templateId: 'ab4e2c91-6d73-4f85-9b21-13c7de5a9301',
                  },
                },
              },
            },
            {
              templateId: '60be25ec-a2d0-4704-cb4b-ce1268059312',
              assumptionType: 'E02',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'category',
                    templateId: 'ab4e2c91-6d73-4f85-9b21-13c7de5a9301',
                  },
                },
              },
            },
            {
              templateId: '71cf36fd-b3e1-4815-dc5c-df2379169313',
              assumptionType: 'E17',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 3,
                  refTarget: {
                    kind: 'category',
                    templateId: 'ab4e2c91-6d73-4f85-9b21-13c7de5a9301',
                  },
                },
              },
            },
            {
              templateId: '82d0470e-c4f2-4926-ed6d-e0348a279314',
              assumptionType: 'E10',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 20,
                  refTarget: {
                    kind: 'category',
                    templateId: '0a59bf86-4c7a-41ae-e6f5-68bc02af9306',
                  },
                },
              },
            },
          ],
        },
        {
          templateId: '93e1581f-d503-4a37-fe7e-f1459b389315',
          categoryType: 'fixedExps',
          categoryName: 'Fixed Charge',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'a4f26920-e614-4b48-8f8f-0256ac499316',
              assumptionType: 'E06',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
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
              templateId: 'b5037a31-f725-4c59-9090-1367bd5a9317',
              assumptionType: 'E12',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '10',
              },
            },
            {
              templateId: 'c6148b42-0836-4d6a-a1a1-2478ce6b9318',
              assumptionType: 'E14',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'section',
                    templateId: 'ab4e2c91-6d73-4f85-9b21-13c7de5a9301',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      templateId: 'd7259c53-1947-4e7b-b2b2-3589df7c9319',
      sectionType: 'summaryDCF',
      sectionName: 'Summary',
      identifier: 'empty',
      displaySeq: 2,
    },
  ],
};

export const directApartmentTemplate: DCFTemplateType = {
  id: 'direct-000',
  collateralType: 'L',
  templateCode: 'direct-apartment',
  templateName: 'direct-apartment',
  totalNumberOfYears: 1,
  totalNumberOfDayInYear: 365,
  capitalizeRate: 3,
  sections: [
    {
      templateId: '8f3b7b0d-6c41-4c9e-9f6d-1b2a7c5e9001',
      sectionType: 'income',
      sectionName: 'Income',
      identifier: 'positive',
      displaySeq: 0,
      categories: [
        {
          templateId: '3a9d2c7e-5f14-4b88-a6d1-2c7f8e4b9002',
          categoryType: 'income',
          categoryName: 'Operating Income',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'b1e4f2a9-8d33-4e6a-91c7-4f2b6d8a9003',
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
              templateId: 'c6a8d1f4-2b57-4d93-b8a1-5d3e7f2c9004',
              assumptionType: 'I06',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'assumption',
                    templateId: 'b1e4f2a9-8d33-4e6a-91c7-4f2b6d8a9003',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      templateId: 'd2f7a4c1-9e65-4a20-8c3d-6e1f9b4a9005',
      sectionType: 'expenses',
      sectionName: 'Expenses / Costs',
      identifier: 'negative',
      displaySeq: 1,
      categories: [
        {
          id: '00000000-0000-0000-0001-000000000001',
          categoryType: 'expenses',
          categoryName: 'Direct Operating Expenses',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'e7c3b9a2-1d48-45f7-9a6e-7b2d4c8f9006',
              assumptionType: 'E15',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 15,
                  refTarget: {
                    kind: 'assumption',
                    templateId: 'b1e4f2a9-8d33-4e6a-91c7-4f2b6d8a9003',
                  },
                },
              },
            },
            {
              templateId: 'f4a1d8c7-3b92-4f5e-a1d9-8c6e2b7f9007',
              assumptionType: 'E10',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'assumption',
                    templateId: 'b1e4f2a9-8d33-4e6a-91c7-4f2b6d8a9003',
                  },
                },
              },
            },
          ],
        },
        {
          id: '00000000-0000-0000-0001-000000000002',
          categoryType: 'expenses',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: 'a9b6e3d1-7c24-4a8b-b2f6-9d1e5c7a9008',
              assumptionType: 'E09',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '09',
                detail: {},
              },
            },
            {
              templateId: '7d2c9f4a-6b31-4e85-90ad-1f7c3e6b9009',
              assumptionType: 'E17',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 3,
                  refTarget: {
                    kind: 'assumption',
                    templateId: 'b1e4f2a9-8d33-4e6a-91c7-4f2b6d8a9003',
                  },
                },
              },
            },
            {
              templateId: '2e8f4b7c-5d19-4c63-a8f1-2b6d9e4c9010',
              assumptionType: 'E13',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'assumption',
                    templateId: '8f3b7b0d-6c41-4c9e-9f6d-1b2a7c5e9001',
                  },
                },
              },
            },
            {
              templateId: '5c1a7e9d-4f28-4b71-93ce-3d8f2a6b9011',
              assumptionType: 'E18',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '14',
                detail: {
                  increaseRatePct: 10,
                  increaseRateYrs: 3,
                },
              },
            },
            {
              templateId: '9f4d2b6a-8c17-45e2-b7d3-4a1e6c8f9012',
              assumptionType: 'E03',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTarget: {
                    kind: 'assumption',
                    templateId: '8f3b7b0d-6c41-4c9e-9f6d-1b2a7c5e9001',
                  },
                },
              },
            },
            {
              templateId: '4b7e1c9f-2d35-4a84-8f61-5c2d7e9a9013',
              assumptionType: 'E14',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTarget: {
                    kind: 'assumption',
                    templateId: '8f3b7b0d-6c41-4c9e-9f6d-1b2a7c5e9001',
                  },
                },
              },
            },
          ],
        },
        {
          templateId: '6a2d8f1c-7b43-4d95-a2e7-6f3b1c4d9014',
          categoryType: 'gop',
          categoryName: 'Gross Operating Profit (GOP)',
          identifier: 'positive',
          displaySeq: 3,
        },
        {
          id: '00000000-0000-0000-0001-000000000002',
          categoryType: 'fixedExps',
          categoryName: 'Fixed Charge',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              templateId: '1c9e4b7d-6f25-4a83-b1d6-7e2c5f8a9015',
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
                    templateId: '8f3b7b0d-6c41-4c9e-9f6d-1b2a7c5e9001',
                  },
                },
              },
            },
            {
              templateId: '8d3f1a6c-5b74-4e92-9c18-8a4d2e7f9016',
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
              templateId: '3f7a2d8e-1c64-4b90-a5e2-9b6c1d4f9017',
              assumptionType: 'E12',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '10',
              },
            },
            {
              templateId: '7b1e4c9a-2d58-4f73-8a6c-1d9e3b5f9018',
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
                    templateId: '6a2d8f1c-7b43-4d95-a2e7-6f3b1c4d9014',
                  },
                },
              },
            },
            {
              templateId: '2a6c9f1d-8b37-4e84-b3d1-2f7a5c9e9019',
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
                    templateId: '6a2d8f1c-7b43-4d95-a2e7-6f3b1c4d9014',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    {
      clientId: '6e132f1c-7b43-4d95-a2e7-6f3b1c4d9014',
      sectionType: 'summaryDirect',
      sectionName: 'Summary',
      identifier: 'empty',
      displaySeq: 2,
    },
  ],
};

export const dcfTemplateQueries = [
  { id: 'dcf-000', data: dcfTestTemplate },
  { id: 'dcf-001', data: dcfHotelTemplate },
  { id: 'dcf-002', data: dcfApartmentTemplate },
  { id: 'dcf-003', data: dcfOfficeTemplate },
  { id: 'dcf-004', data: dcfDepartmentStoreTemplate },
  { id: 'direct-000', data: directApartmentTemplate },
];

export const dcfTemplateList = [
  {
    id: 'dcf-000',
    templateCode: 'dcf-000',
    templateName: 'Test',
    propertyType: 'L',
    description: '',
    isActive: true,
  },
  {
    id: 'dcf-001',
    templateCode: 'dcf-001',
    templateName: 'DCF - Hotel',
    propertyType: 'L',
    description: '',
    isActive: true,
  },
  {
    id: 'dcf-002',
    templateCode: 'dcf-002',
    templateName: 'DCF - Apartment',
    propertyType: 'L',
    description: '',
    isActive: true,
  },
  {
    id: 'dcf-003',
    templateCode: 'dcf-003',
    templateName: 'DCF - Office',
    propertyType: 'L',
    description: '',
    isActive: true,
  },
  {
    id: 'dcf-004',
    templateCode: 'dcf-004',
    templateName: 'DCF - Department Store',
    propertyType: 'L',
    description: '',
    isActive: true,
  },
  {
    id: 'direct-000',
    templateCode: 'direct-000',
    templateName: 'Direct - Apartment',
    propertyType: 'L',
    description: '',
    isActive: true,
  },
];
