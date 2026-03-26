import type { DCFFormType } from '../schemas/dcfForm';
import type { DCFTemplateType } from '@features/pricingAnalysis/types/dcf.ts';

// ─── Mock Data ───
export const dcfMockData: DCFFormType = {
  id: 'cf-001',
  collateralType: '',
  templateName: '',
  totalNumberOfYears: 6,
  totalNumberOfDayInYear: 365,
  capitalizeRate: 3,
  discountedRate: 5,
  finalValue: 0,
  finalValueRounded: 0,
  sections: [
    {
      id: 's1',
      sectionType: 'income',
      sectionName: 'Income',
      identifier: 'positive',
      totalSectionValues: [
        { year: 1, value: 0 },
        { year: 2, value: 0 },
        { year: 3, value: 0 },
        { year: 4, value: 0 },
        { year: 5, value: 0 },
        { year: 6, value: 0 },
      ],
      categories: [
        {
          id: 'c1',
          categoryType: '',
          categoryName: 'Revenue from Sales',
          identifier: '',
          totalCategoryValues: [
            { year: 1, value: 0 },
            { year: 2, value: 0 },
            { year: 3, value: 0 },
            { year: 4, value: 0 },
            { year: 5, value: 0 },
            { year: 6, value: 0 },
          ],
          assumptions: [
            {
              id: 'a1',
              assumptionType: 'a1',
              assumptionName: 'Product Sales',
              totalAssumptionValues: [
                { year: 1, value: 1250000 },
                { year: 2, value: 1437500 },
                { year: 3, value: 1653125 },
                { year: 4, value: 1901093 },
                { year: 5, value: 2186257 },
                { year: 6, value: 2514196 },
              ],
              method: {
                id: 'm1',
                methodType: 'proportion',
              },
            },
            {
              id: 'a2',
              assumptionType: 'a2',
              assumptionName: 'Service Revenue',
              totalAssumptionValues: [
                { year: 1, value: 480000 },
                { year: 2, value: 528000 },
                { year: 3, value: 580800 },
                { year: 4, value: 638880 },
                { year: 5, value: 702768 },
                { year: 6, value: 773045 },
              ],
              method: {
                id: 'm2',
                methodType: 'm2',
              },
            },
            {
              id: 'a3',
              assumptionType: 'a3',
              assumptionName: 'Subscription Income',
              totalAssumptionValues: [
                { year: 1, value: 120000 },
                { year: 2, value: 180000 },
                { year: 3, value: 270000 },
                { year: 4, value: 405000 },
                { year: 5, value: 607500 },
                { year: 6, value: 911250 },
              ],
              method: {
                id: 'm3',
                methodType: 'm3',
              },
            },
          ],
        },
        {
          id: 'c2',
          categoryType: 'a4',
          categoryName: 'Other Income',
          identifier: '',
          totalCategoryValues: [
            { year: 1, value: 0 },
            { year: 2, value: 0 },
            { year: 3, value: 0 },
            { year: 4, value: 0 },
            { year: 5, value: 0 },
            { year: 6, value: 0 },
          ],
          assumptions: [
            {
              id: 'a4',
              assumptionType: 'a4',
              assumptionName: 'Interest Income',
              // hasModal: true,
              // modalRows: 2,
              totalAssumptionValues: [
                { year: 1, value: 15000 },
                { year: 2, value: 18000 },
                { year: 3, value: 21600 },
                { year: 4, value: 25920 },
                { year: 5, value: 31104 },
                { year: 6, value: 37325 },
              ],
              // growthRate: 15,
              method: {
                id: 'm5',
                methodType: 'm5',
              },
            },
            {
              id: 'a5',
              assumptionType: 'a5',
              assumptionName: 'Rental Income',
              // hasModal: true,
              // modalRows: 1,
              totalAssumptionValues: [
                { year: 1, value: 60000 },
                { year: 2, value: 63000 },
                { year: 3, value: 66150 },
                { year: 4, value: 69457 },
                { year: 5, value: 72930 },
                { year: 6, value: 76577 },
              ],
              // growthRate: 10,
              method: {
                id: 'm5',
                methodType: 'm5',
              },
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      sectionType: 'expenses',
      sectionName: 'Expenses / Costs',
      identifier: 'negative',
      totalSectionValues: [
        { year: 1, value: 0 },
        { year: 2, value: 0 },
        { year: 3, value: 0 },
        { year: 4, value: 0 },
        { year: 5, value: 0 },
        { year: 6, value: 0 },
      ],
      categories: [
        {
          id: 'c3',
          totalCategoryValues: [
            { year: 1, value: 0 },
            { year: 2, value: 0 },
            { year: 3, value: 0 },
            { year: 4, value: 0 },
            { year: 5, value: 0 },
            { year: 6, value: 0 },
          ],
          categoryType: 'c3',
          categoryName: 'Operating Costs',
          identifier: '',
          assumptions: [
            {
              id: 'a6',
              assumptionType: 'a6',
              assumptionName: 'Raw Materials',
              totalAssumptionValues: [
                { year: 1, value: 375000 },
                { year: 2, value: 431250 },
                { year: 3, value: 495937 },
                { year: 4, value: 570328 },
                { year: 5, value: 655877 },
                { year: 6, value: 754259 },
              ],
              method: {
                id: 'm6',
                methodType: 'm6',
              },
            },
            {
              id: 'a7',
              assumptionType: 'a7',
              assumptionName: 'Direct Labor',
              totalAssumptionValues: [
                { year: 1, value: 240000 },
                { year: 2, value: 264000 },
                { year: 3, value: 290400 },
                { year: 4, value: 319440 },
                { year: 5, value: 351384 },
                { year: 6, value: 386522 },
              ],
              method: {
                id: 'm2',
                methodType: 'm2',
              },
            },
            {
              id: 'a8',
              assumptionType: 'a8',
              assumptionName: 'Manufacturing Overhead',
              totalAssumptionValues: [
                { year: 1, value: 96000 },
                { year: 2, value: 100800 },
                { year: 3, value: 105840 },
                { year: 4, value: 111132 },
                { year: 5, value: 116689 },
                { year: 6, value: 122523 },
              ],
              method: {
                id: 'm3',
                methodType: 'm3',
              },
            },
          ],
        },
      ],
    },
    // {
    //   id: 's3',
    //   type: 'other',
    //   name: 'Capital Expenditure',
    //   fixedRows: [
    //     {
    //       id: 'f1',
    //       name: 'Equipment Purchase',
    //       yearlyValues: [500000, 50000, 50000, 200000, 50000, 50000],
    //     },
    //     { id: 'f2', name: 'Leasehold Improvements', yearlyValues: [200000, 0, 0, 0, 150000, 0] },
    //     {
    //       id: 'f3',
    //       name: 'Technology & Software',
    //       yearlyValues: [80000, 40000, 40000, 60000, 40000, 40000],
    //     },
    //     { id: 'f4', name: 'Vehicle', yearlyValues: [350000, 0, 0, 0, 350000, 0] },
    //   ],
    // },
    // {
    //   id: 's4',
    //   type: 'financing',
    //   name: 'Financing Activities',
    //   fixedRows: [
    //     { id: 'f5', name: 'Loan Proceeds', yearlyValues: [2000000, 0, 0, 0, 0, 0] },
    //     {
    //       id: 'f6',
    //       name: 'Loan Repayment',
    //       yearlyValues: [-240000, -240000, -240000, -240000, -240000, -240000],
    //     },
    //     {
    //       id: 'f7',
    //       name: 'Interest Payment',
    //       yearlyValues: [-140000, -126000, -112000, -98000, -84000, -70000],
    //     },
    //     { id: 'f8', name: 'Owner Investment', yearlyValues: [500000, 0, 0, 0, 0, 0] },
    //     {
    //       id: 'f9',
    //       name: 'Dividend / Drawing',
    //       yearlyValues: [0, -50000, -75000, -100000, -150000, -200000],
    //     },
    //   ],
    // },
  ],
};

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
              assumptionName: 'Room Income',
              identifier: 'positive',
              displaySeq: 0,
              method: {
                methodType: '01',
                detail: { increaseRatePct: 10, increaseRateYrs: 3 },
              },
            },
            {
              assumptionType: 'I04',
              assumptionName: 'Food and Beverage Income',
              identifier: 'positive',
              displaySeq: 1,
              method: {
                methodType: '13',
                detail: { proportionPct: 10, refTargetId: 'a1' },
              },
            },
            {
              assumptionType: 'I05',
              assumptionName: 'Other Income',
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
              assumptionName: 'Room Costs',
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
              assumptionName: 'Food and beverage expenses',
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
              assumptionName: 'Other Expenses',
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
              assumptionName: 'Operating and Administrative Expenses',
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
              assumptionName: 'Sales and Marketing Expenses',
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
              assumptionName: 'Repair and Maintenance Expenses',
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
              assumptionName: 'Contingency Expenses',
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
              assumptionName: 'Reserve Funds for Building Improvement',
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
              assumptionName: 'Utility Expenses',
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
              assumptionName: 'Gross Operating Profit (GOP)',
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
