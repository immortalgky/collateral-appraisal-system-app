import type { DCFTemplateType } from '../types/dcf';

export const dcfHotelTemplate: DCFTemplateType = {
  id: 'dcf-001',
  templateCode: 'dcf-hotel',
  templateName: 'dcf-hotel',
  totalNumberOfYears: 6,
  totalNumberOfDayInYear: 365,
  capitalizeRate: 3,
  discountedRate: 5,
  sections: [
    {
      sectionType: 'income',
      sectionName: 'Income',
      identifier: 'positive',
      displaySeq: 0,
      categories: [
        {
          categoryType: '',
          categoryName: 'Operating Income',
          identifier: 'positive',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'I00',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '01',
                detail: { increaseRatePct: 10, increaseRateYrs: 3 },
              },
            },
            {
              assumptionType: 'I04',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: { proportionPct: 10, refTargetId: 'a1' },
              },
            },
            {
              assumptionType: 'I05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 2,
              method: {
                methodType: '14',
                detail: { proportionPct: 10, refTargetId: 'a1' },
              },
            },
          ],
        },
      ],
    },
    {
      sectionType: 'expenses',
      sectionName: 'Expenses / Costs',
      identifier: 'negative',
      displaySeq: 1,
      categories: [
        {
          categoryType: 'c3',
          categoryName: 'Direct Operating Expenses',
          identifier: 'negative',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E17',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 15,
                  refTargetId: 'a1',
                },
              },
            },
            {
              assumptionType: 'E09',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '08',
                detail: {
                  proportionPct: 10,
                  refTargetId: 'a1',
                },
              },
            },
            {
              assumptionType: 'E12',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTargetId: 'a1',
                },
              },
            },
          ],
        },
        {
          categoryType: 'c4',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'negative',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E11',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 12,
                  refTargetId: 'a1',
                },
              },
            },
            {
              assumptionType: 'E19',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 3,
                  refTargetId: 'a1',
                },
              },
            },
            {
              assumptionType: 'E15',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTargetId: 'a1',
                },
              },
            },
            {
              assumptionType: 'E05',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTargetId: 'a1',
                },
              },
            },
            {
              assumptionType: 'E16',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTargetId: 'a1',
                },
              },
            },
            {
              assumptionType: 'E20',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                  refTargetId: 'a1',
                },
              },
            },
          ],
        },
        {
          categoryType: 'E22',
          categoryName: 'Gross Operating Profit (GOP)',
          identifier: 'negative',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'a1',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '15',
                detail: {},
              },
            },
          ],
        },
      ],
    },
    {
      sectionType: 'summary',
      sectionName: 'Summary',
      identifier: 'empty',
      displaySeq: 2,
    },
  ],
};

export const dcfTemplateList = [{ templateCode: 'dcf-hotel', id: 'dcf-001' }];
