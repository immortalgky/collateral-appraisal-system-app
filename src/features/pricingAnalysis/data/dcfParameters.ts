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
  { code: 'I02', description: 'Average Rental Rate' },
  { code: 'I03', description: 'Energy Income' },
  { code: 'I04', description: 'Utility Income' },
  { code: 'I05', description: 'Food and Beverage Income' },
  { code: 'I06', description: 'Other Income' },

  // expenses
  { code: 'E00', description: 'Administration Fee' },
  { code: 'E01', description: 'Advertising and Promotion Costs' },
  { code: 'E02', description: 'Common Utility Fees' },
  { code: 'E03', description: 'Contingency Expenses' },
  { code: 'E04', description: 'Cost of Income from Utilities' },
  { code: 'E05', description: 'Energy Cost' },
  { code: 'E06', description: 'Fire Insurance Premium' },
  { code: 'E07', description: 'Food and beverage expenses' },
  { code: 'E08', description: 'Marketing and Promotion Costs' },
  { code: 'E09', description: 'Operational and Administrative expenses' },
  { code: 'E10', description: 'Other Expenses' },
  { code: 'E11', description: 'Project Management Compensation' },
  { code: 'E12', description: 'Property Tax' },
  { code: 'E13', description: 'Repair and Maintenance Costs' },
  { code: 'E14', description: 'Reserve Funds for Building Improvements' },
  { code: 'E15', description: 'Room Cost' },
  { code: 'E16', description: 'Salary and Benefits' },
  { code: 'E17', description: 'Sales and Marketing Expenses' },
  { code: 'E18', description: 'Utility Expenses' },
  { code: 'E19', description: 'Other Costs' },
  { code: 'E20', description: 'Reserve for Asset Maintenance (FF&E / Cap Ex)' },

  // others
  { code: 'M99', description: 'Miscellaneous' },
];

export const mappingAssumptionMethodParams = [
  {
    assumptionCode: 'I00',
    methods: ['06', '04'],
  },
  {
    assumptionCode: 'I01',
    methods: ['01', '02', '03', '04', '05'],
  },
  {
    assumptionCode: 'I02',
    methods: ['06'],
  },
  {
    assumptionCode: 'I03',
    methods: ['13'],
  },
  {
    assumptionCode: 'I04',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'I05',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'I06',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E00',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E01',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E02',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E03',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E04',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E05',
    methods: ['11'],
  },
  {
    assumptionCode: 'E06',
    methods: ['12', '14'],
  },
  {
    assumptionCode: 'E07',
    methods: ['08', '13'],
  },
  {
    assumptionCode: 'E08',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E09',
    methods: ['09', '13', '14'],
  },
  {
    assumptionCode: 'E10',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E11',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E12',
    methods: ['10', '14'],
  },
  {
    assumptionCode: 'E13',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E14',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E15',
    methods: ['07', '13'],
  },
  {
    assumptionCode: 'E16',
    methods: ['09', '14'],
  },
  {
    assumptionCode: 'E17',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E18',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E19',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'E20',
    methods: ['13', '14'],
  },
  {
    assumptionCode: 'M99',
    methods: ['13', '14'],
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
];

// Room type parameters
export const roomTypeParameters = [
  { code: '00', description: 'Standard Room' },
  { code: '01', description: 'Superior Room' },
  { code: '02', description: 'Deluxe Room' },
  { code: '03', description: 'Premier Room' },
  { code: '04', description: 'Executive Room' },
  { code: '05', description: 'Studio Room' },
  { code: '06', description: 'Suite' },
  { code: '07', description: 'Junior Suite' },
  { code: '08', description: 'Executive Suite' },
  { code: '09', description: 'Presidential Suite' },
  { code: '10', description: 'Family Room' },
  { code: '11', description: 'Connecting Room' },
  { code: '12', description: 'Adjoining Room' },
  { code: '13', description: 'Twin Room' },
  { code: '14', description: 'Double Room' },
  { code: '15', description: 'Single Room' },
  { code: '16', description: 'Triple Room' },
  { code: '17', description: 'Quad Room' },
  { code: '18', description: 'King Room' },
  { code: '19', description: 'Queen Room' },
  { code: '20', description: 'Accessible Room' },
  { code: '21', description: 'Ocean View Room' },
  { code: '22', description: 'City View Room' },
  { code: '23', description: 'Garden View Room' },
  { code: '24', description: 'Pool View Room' },
  { code: '25', description: 'Beachfront Room' },
  { code: '26', description: 'Villa' },
  { code: '27', description: 'Bungalow' },
  { code: '28', description: 'Penthouse' },
  { code: '29', description: 'Loft Room' },
  { code: '99', description: 'Others' },
];

export const jobPositionParameters = [
  { code: '00', description: 'General Manager' },
  { code: '01', description: 'Assistant Manager' },
  { code: '02', description: 'Front Office Manager' },
  { code: '03', description: 'Front Desk Agent' },
  { code: '04', description: 'Concierge' },
  { code: '05', description: 'Reservation Agent' },
  { code: '06', description: 'Bell Attendant' },
  { code: '07', description: 'Doorman' },
  { code: '08', description: 'Housekeeping Manager' },
  { code: '09', description: 'Room Attendant' },
  { code: '10', description: 'Laundry Attendant' },
  { code: '11', description: 'Maintenance Technician' },
  { code: '12', description: 'Security Officer' },
  { code: '13', description: 'Food and Beverage Manager' },
  { code: '14', description: 'Restaurant Manager' },
  { code: '15', description: 'Executive Chef' },
  { code: '16', description: 'Sous Chef' },
  { code: '17', description: 'Cook' },
  { code: '18', description: 'Kitchen Assistant' },
  { code: '19', description: 'Server' },
  { code: '20', description: 'Bartender' },
  { code: '21', description: 'Room Service Attendant' },
  { code: '22', description: 'Sales Manager' },
  { code: '23', description: 'Marketing Manager' },
  { code: '24', description: 'Human Resources Manager' },
  { code: '25', description: 'Accountant' },
  { code: '26', description: 'Purchasing Officer' },
  { code: '27', description: 'Spa Therapist' },
  { code: '28', description: 'Valet' },
  { code: '29', description: 'Night Auditor' },
  { code: '99', description: 'Other' },
];

export const propertyTaxRanges = [
  { taxRate: 0.02, maxValue: 50_000_000, minValue: 10_000_000 },
  { taxRate: 0.03, maxValue: 75_000_000, minValue: 50_000_001 },
  { taxRate: 0.05, maxValue: 100_000_000, minValue: 75_000_001 },
  { taxRate: 0.1, maxValue: null, minValue: 100_000_001 },
];
