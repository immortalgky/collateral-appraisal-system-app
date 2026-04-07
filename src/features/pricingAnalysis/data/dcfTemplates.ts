import type { DCFTemplateType } from '../types/dcf';

export const dcfTestTemplate: DCFTemplateType = {
  id: 'dcf-000',
  templateCode: 'dcf-test',
  templateName: 'dcf-test',
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
          categoryType: 'income',
          categoryName: 'Operating Income',
          identifier: 'income',
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
                methodType: '02',
                detail: { seasonCount: 3 },
              },
            },
            {
              assumptionType: 'I05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 2,
              method: {
                methodType: '03',
              },
            },
            {
              assumptionType: 'I05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 2,
              method: {
                methodType: '04',
              },
            },
            {
              assumptionType: 'I05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 2,
              method: {
                methodType: '05',
              },
            },
            {
              assumptionType: 'I05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 2,
              method: {
                methodType: '06',
              },
            },
            {
              assumptionType: 'I05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 2,
              method: {
                methodType: '13',
              },
            },
            {
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
      sectionType: 'expenses',
      sectionName: 'Expenses / Costs',
      identifier: 'negative',
      displaySeq: 1,
      categories: [
        {
          categoryType: 'expenses',
          categoryName: 'Direct Operating Expenses',
          identifier: 'expenses',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E17',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '07',
              },
            },
            {
              assumptionType: 'E09',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '08',
              },
            },
            {
              assumptionType: 'E12',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '09',
              },
            },
          ],
        },
        {
          categoryType: 'expenses',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'expenses',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E11',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '10',
              },
            },
            {
              assumptionType: 'E19',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '11',
              },
            },
            {
              assumptionType: 'E15',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '12',
              },
            },
          ],
        },
        {
          categoryType: 'gop',
          categoryName: 'Gross Operating Profit (GOP)',
          identifier: 'gop',
        },
        {
          categoryType: 'expenses',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'fixedExps',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E11',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '10',
              },
            },
            {
              assumptionType: 'E19',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '11',
              },
            },
            {
              assumptionType: 'E15',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '12',
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

export const dcfHotelTemplate: DCFTemplateType = {
  id: 'dcf-001',
  templateCode: 'dcf-hotel',
  templateName: 'dcf-hotel',
  totalNumberOfYears: 30,
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
          categoryType: 'income',
          categoryName: 'Operating Income',
          identifier: 'income',
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
          categoryType: 'expenses',
          categoryName: 'Direct Operating Expenses',
          identifier: 'expenses',
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
          categoryType: 'expenses',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'expenses',
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
          categoryType: 'gop',
          categoryName: 'Gross Operating Profit (GOP)',
          identifier: 'gop',
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

export const dcfApartmentTemplate: DCFTemplateType = {
  id: 'dcf-002',
  templateCode: 'dcf-apartment',
  templateName: 'dcf-apartment',
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
          identifier: 'income',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'I00',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '05',
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
                detail: { proportionPct: 10, refTarget: {} },
              },
            },
            {
              assumptionType: 'I05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 2,
              method: {
                methodType: '14',
                detail: { increaseRatePct: 10, increaseRateYrs: 3 },
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
          identifier: 'expenses',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E17',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 15,
                  refTargetId: 'I00',
                },
              },
            },
            {
              assumptionType: 'E09',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTargetId: 'I00',
                },
              },
            },
          ],
        },
        {
          categoryType: 'c4',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'expenses',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E18',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '09',
                detail: {
                  increaseRatePct: 5,
                  increaseRateYrs: 3,
                },
              },
            },
            {
              assumptionType: 'E10',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
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
              assumptionType: 'E21',
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
          ],
        },
        {
          categoryType: 'c5',
          categoryName: 'Gross Operating Profit (GOP)',
          identifier: 'gop',
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
        {
          categoryType: 'c6',
          categoryName: 'Fixed Expenses',
          identifier: 'fixedExps',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E16',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                },
              },
            },
            {
              assumptionType: 'E08',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '12',
                detail: {
                  proportionPct: 0.1,
                },
              },
            },
            {
              assumptionType: 'E18',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 5,
                },
              },
            },
            {
              assumptionType: 'E08',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 5,
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
  id: 'dcf-001',
  templateCode: 'dcf-office',
  templateName: 'dcf-office',
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
          identifier: 'income',
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
          identifier: 'expenses',
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
          identifier: 'expenses',
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
          identifier: 'gop',
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
      sectionType: 'summaryDCF',
      sectionName: 'Summary',
      identifier: 'empty',
      displaySeq: 2,
    },
  ],
};

export const dcfDepartmentStoreTemplate: DCFTemplateType = {
  id: 'dcf-001',
  templateCode: 'dcf-department-store',
  templateName: 'dcf-department-store',
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
          identifier: 'income',
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
          identifier: 'expenses',
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
          identifier: 'expenses',
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
          identifier: 'gop',
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
      sectionType: 'summaryDCF',
      sectionName: 'Summary',
      identifier: 'empty',
      displaySeq: 2,
    },
  ],
};

export const directApartmentTemplate: DCFTemplateType = {
  id: 'dcf-005',
  templateCode: 'direct-apartment',
  templateName: 'direct-apartment',
  totalNumberOfYears: 1,
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
          identifier: 'income',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'I00',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '05',
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
                detail: { proportionPct: 10, refTarget: {} },
              },
            },
            {
              assumptionType: 'I05',
              assumptionName: '',
              identifier: 'positive',
              displaySeq: 2,
              method: {
                methodType: '14',
                detail: { increaseRatePct: 10, increaseRateYrs: 3 },
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
          identifier: 'expenses',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E17',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 15,
                  refTargetId: 'I00',
                },
              },
            },
            {
              assumptionType: 'E09',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 10,
                  refTargetId: 'I00',
                },
              },
            },
          ],
        },
        {
          categoryType: 'c4',
          categoryName: 'Administrative and Management Expenses',
          identifier: 'expenses',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E18',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '09',
                detail: {
                  increaseRatePct: 5,
                  increaseRateYrs: 3,
                },
              },
            },
            {
              assumptionType: 'E10',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
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
              assumptionType: 'E21',
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
          ],
        },
        {
          categoryType: 'c5',
          categoryName: 'Gross Operating Profit (GOP)',
          identifier: 'gop',
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
        {
          categoryType: 'c6',
          categoryName: 'Fixed Expenses',
          identifier: 'fixedExps',
          displaySeq: 0,
          assumptions: [
            {
              assumptionType: 'E16',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 2,
                },
              },
            },
            {
              assumptionType: 'E08',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '12',
                detail: {
                  proportionPct: 0.1,
                },
              },
            },
            {
              assumptionType: 'E18',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 5,
                },
              },
            },
            {
              assumptionType: 'E08',
              assumptionName: '',
              identifier: 'negative',
              displaySeq: 0,
              method: {
                methodType: '13',
                detail: {
                  proportionPct: 5,
                },
              },
            },
          ],
        },
      ],
    },
    {
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
  { id: 'dcf-005', data: directApartmentTemplate },
];

export const dcfTemplateList = [
  { templateCode: 'dcf-test', templateName: 'Test', id: 'dcf-000' },
  { templateCode: 'dcf-hotel', templateName: 'Hotel', id: 'dcf-001' },
  { templateCode: 'dcf-apartment', templateName: 'Apartment', id: 'dcf-002' },
  { templateCode: 'dcf-office', templateName: 'Office', id: 'dcf-003' },
  { templateCode: 'dcf-department-store', templateName: 'Department Store', id: 'dcf-004' },
  { templateCode: 'direct-apartment', templateName: 'Apartment', id: 'dcf-005' },
];
