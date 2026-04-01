export const categoryParams = [
  { code: '01', description: 'Operating Income' },
  { code: '02', description: 'Gross Income' },
  { code: '03', description: 'Direct Operating Expenses' },
  { code: '04', description: 'Administrative and Management Expenses' },
  { code: '05', description: 'Fixed Charges' },
];

export const assumptionParams = [
  // income
  { code: 'I00', description: 'Room Income' },
  { code: 'I01', description: 'Room Rental Income' },
  { code: 'I02', description: 'Energy Income' },
  { code: 'I03', description: 'Utility Income' },
  { code: 'I04', description: 'Food and Beverage Income' },
  { code: 'I05', description: 'Other Income' },

  // expenses
  { code: 'E01', description: 'Administration Fee' },
  { code: 'E02', description: 'Average Rental Rate' },
  { code: 'E03', description: 'Advertising and Promotion Costs' },
  { code: 'E04', description: 'Common Utility Fees' },
  { code: 'E05', description: 'Contingency Expenses' },
  { code: 'E06', description: 'Cost of Income from Utilities' },
  { code: 'E07', description: 'Energy Cost' },
  { code: 'E08', description: 'Fire Insurance Premium' },
  { code: 'E09', description: 'Food and beverage expenses' },
  { code: 'E10', description: 'Marketing and Promotion Costs' },
  { code: 'E11', description: 'Operational and Administrative expenses' },
  { code: 'E12', description: 'Other Expenses' },
  { code: 'E13', description: 'Project Management Compensation' },
  { code: 'E14', description: 'Property Tax' },
  { code: 'E15', description: 'Repair and Maintenance Costs' },
  { code: 'E16', description: 'Reserve Funds for Building Improvements' },
  { code: 'E17', description: 'Room Cost' },
  { code: 'E18', description: 'Salary and Benefits' },
  { code: 'E19', description: 'Sales and Marketing Expenses' },
  { code: 'E20', description: 'Utility Expenses' },
  { code: 'E21', description: 'Other Costs' },

  // GOP
  { code: 'E22', description: 'Gross Operating Profit (GOP)' },

  // others
  { code: 'M99', description: 'Miscellaneous' },
];

export const mappingAssumptionMethodParams = [
  {
    assumptionCode: '23',
    methods: [{ code: '01' }, { code: '02' }, { code: '03' }, { code: '04' }],
  },
];

export const methodParams = [
  // income
  { code: '01', description: 'Specified Room Income Per Day' },
  { code: '02', description: 'Specified Room Income By Seasonal Rates' },
  { code: '03', description: 'Specified Room Income with Growth' },
  { code: '04', description: 'Specified Room Income with Growth by Occupancy Rate' },
  { code: '05', description: 'Specified Rental Income per Month' },
  { code: '06', description: 'Specified Rental Income per Square Meter' },
  // cost
  { code: '07', description: 'Room Costs based on Expenses per Room per Day' },
  { code: '08', description: 'Specified Food and Beverage Expenses per Room per Day' },
  { code: '09', description: 'Position-Based Salary Calculation' },
  { code: '10', description: 'Parameter based on Tier of Property Value' },
  { code: '11', description: 'Specified Energy Cost Index' },
  { code: '12', description: 'Proportion of the New Replacement Cost' },
  // general
  { code: '13', description: 'Proportional' },
  { code: '14', description: 'Specified Value with Growth' },
  // GOP
  { code: '15', description: 'Gross Operating Profit (GOP)' },
];
