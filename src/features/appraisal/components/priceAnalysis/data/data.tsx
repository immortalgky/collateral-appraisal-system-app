/* Collateral type in group, Initial on loading price analysis page*/
export const PROPERTIES = [
  {
    collateralType: 'L',
    environment: 'ที่อยู่อาศัย และอุตสาหกรรม',
    plotLocation: 'แปลงกลาง',
    landShape: 'รูปหลายเหลี่ยม',
    landCondition: 'ถมแล้ว',
    landArea: 17518.6,
    roadFrontage: 284,
    maximunUtilization: 'อุตสาหกรรม',
    laws: 'ที่ดินประเภทอุตสาหกรรม และคลังสินค้า',
  },
  {
    collateralType: 'LB',
    addressLocation: 'ถนนภายในโครงการ',
    plotLocation: 'แปลงกลาง',
    buildingCondition: 'ปานกลาง',
    facility: 'คลับเฮ้าส์ สวนสาธารณะ',
    landArea: 65,
    usableArea: 206,
    developerReputation: 'บจก ดีๆ ที่มีชื่อเสียงนิดหน่อย',
  },
  {
    collateralType: 'C',
    condoName: 'พลัส 38 คอนโดมีเนียม',
    facility: 'สระว่ายน้ำ ห้องฟิตเนส',
    roomCondition: 'ปานกลาง',
    roomFloor: '5',
    usableArea: 73.63,
  },
];

export const MAPPING_FACTORS_PROPERTIES_FIELDS = [
  { id: '01', value: 'environment' },
  { id: '02', value: 'plotLocation' },
  { id: '03', value: 'landShape' },
  { id: '04', value: 'landCondition' },
  { id: '05', value: 'landArea' },
  { id: '06', value: 'roadFrontage' },
  { id: '07', value: 'maximunUtilization' },
  { id: '08', value: 'laws' },
  { id: '09', value: 'addressLocation' },
  { id: '10', value: 'buildingCondition' },
  { id: '11', value: 'facility' },
  { id: '12', value: 'usableArea' },
  { id: '13', value: 'developerReputation' },
  { id: '14', value: 'roomCondition' },
  { id: '15', value: 'roomFloor' },
  { id: '16', value: 'projectName' },
  { id: '17', value: 'offeringPrice' },
  { id: '18', value: 'offeringPriceAdjustmentPct' },
  { id: '19', value: 'offeringPriceAdjustmentAmt' },
  { id: '20', value: 'measurementUnit' },
  { id: '21', value: 'sellingPrice' },
  { id: '22', value: 'sellingDate' },
  { id: '23', value: 'sellingPeriodAdjustmentPct' },
];

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

export const ALL_FACTORS = [
  { value: '01', description: 'Environment' },
  { value: '02', description: 'Plot Location' },
  { value: '03', description: 'Land Shape' },
  { value: '04', description: 'Land Condition' },
  { value: '05', description: 'Land Area' },
  { value: '06', description: 'Wide frontage of land adjacent to the road' },
  { value: '07', description: 'Maximum Utilization' },
  { value: '08', description: 'Rule/ Law' },
  { value: '09', description: 'Address/ Location' },

  { value: '10', description: 'Building condition' },
  { value: '11', description: 'Facility' },
  { value: '12', description: 'Usable area' },
  { value: '13', description: 'Developer reputation' },

  { value: '14', description: 'Room condition' },
  { value: '15', description: 'Room floor' },
  { value: '16', description: 'Project Name/ Village Name' },

  { value: '17', description: 'Offering Price' },
  { value: '18', description: 'Adjustment of Offer Price (Pct)' },
  { value: '19', description: 'Adjustment of Offer Price (Amt)' },
  { value: '20', description: 'Measurement Unit' },
  { value: '21', description: 'Selling Price' },
  { value: '22', description: 'Selling Date' },
  { value: '23', description: 'Adjustment of Period (Pct)' },
];

export type WQSTemplate = {
  templateCode: string;
  templateName: string;
  collateralTypeId: string;
  comparativeFactors: { factorId: string }[];
  calculationFactors: { factorId: string; weight: number; intensity: number }[];
};
export const WQS_TEMPLATES: WQSTemplate[] = [
  {
    templateCode: 'L01',
    templateName: 'LAND_01',
    collateralTypeId: 'L',
    comparativeFactors: [
      { factorId: '01' },
      { factorId: '02' },
      { factorId: '03' },
      { factorId: '04' },
      { factorId: '05' },
      { factorId: '06' },
      { factorId: '20' },
      { factorId: '17' },
      { factorId: '21' },
    ],
    calculationFactors: [
      { factorId: '01', weight: 1, intensity: 10 },
      { factorId: '02', weight: 2, intensity: 10 },
      { factorId: '03', weight: 1, intensity: 10 },
      { factorId: '04', weight: 1, intensity: 10 },
      { factorId: '05', weight: 1, intensity: 10 },
      { factorId: '06', weight: 1, intensity: 10 },
    ],
  },
  {
    templateCode: 'LB01',
    templateName: 'LB_01',
    collateralTypeId: 'LB',
    comparativeFactors: [
      { factorId: '02' },
      { factorId: '05' },
      { factorId: '08' },
      { factorId: '09' },
      { factorId: '10' },
      { factorId: '11' },
      { factorId: '12' },
      { factorId: '13' },
    ],
    calculationFactors: [
      { factorId: '02', weight: 1, intensity: 10 },
      { factorId: '05', weight: 1, intensity: 10 },
      { factorId: '08', weight: 2, intensity: 10 },
      { factorId: '09', weight: 2, intensity: 10 },
      { factorId: '10', weight: 1, intensity: 10 },
      { factorId: '11', weight: 1, intensity: 10 },
    ],
  },
  {
    templateCode: 'C01',
    templateName: 'CONDO_01',
    collateralTypeId: 'C',
    comparativeFactors: [
      { factorId: '15' },
      { factorId: '10' },
      { factorId: '03' },
      { factorId: '14' },
      { factorId: '10' },
      { factorId: '11' },
    ],
    calculationFactors: [
      { factorId: '15', weight: 1, intensity: 10 },
      { factorId: '10', weight: 1, intensity: 10 },
      { factorId: '03', weight: 2, intensity: 10 },
      { factorId: '14', weight: 2, intensity: 10 },
      { factorId: '10', weight: 1, intensity: 10 },
      { factorId: '11', weight: 1, intensity: 10 },
    ],
  },
];

export type SaleAdjustmentGridTemplate = {
  templateCode: string;
  templateName: string;
  collateralTypeId: string;
  comparativeFactors: { factorId: string }[];
  qualitativeFactors: { factorId: string }[];
};
export const SALE_GRID_TEMPLATES: SaleAdjustmentGridTemplate[] = [
  {
    templateCode: 'L01',
    templateName: 'LAND_01',
    collateralTypeId: 'L',
    comparativeFactors: [
      { factorId: '01' },
      { factorId: '02' },
      { factorId: '03' },
      { factorId: '04' },
      { factorId: '05' },
      { factorId: '06' },
      { factorId: '20' },
      { factorId: '17' },
      { factorId: '21' },
    ],
    qualitativeFactors: [
      { factorId: '01' },
      { factorId: '02' },
      { factorId: '03' },
      { factorId: '04' },
      { factorId: '05' },
      { factorId: '06' },
    ],
  },
  {
    templateCode: 'LB01',
    templateName: 'LB_01',
    collateralTypeId: 'LB',
    comparativeFactors: [
      { factorId: '02' },
      { factorId: '05' },
      { factorId: '08' },
      { factorId: '09' },
      { factorId: '10' },
      { factorId: '11' },
      { factorId: '12' },
      { factorId: '13' },
    ],
    qualitativeFactors: [
      { factorId: '02' },
      { factorId: '05' },
      { factorId: '08' },
      { factorId: '09' },
      { factorId: '10' },
      { factorId: '11' },
    ],
  },
  {
    templateCode: 'C01',
    templateName: 'CONDO_01',
    collateralTypeId: 'C',
    comparativeFactors: [
      { factorId: '15' },
      { factorId: '10' },
      { factorId: '03' },
      { factorId: '14' },
      { factorId: '10' },
      { factorId: '11' },
    ],
    qualitativeFactors: [
      { factorId: '15' },
      { factorId: '10' },
      { factorId: '03' },
      { factorId: '14' },
      { factorId: '10' },
      { factorId: '11' },
    ],
  },
];

export const MOC_SURVEY_DATA = [
  // survey for land
  {
    id: 'SURVEY_01',
    factors: [
      { id: '01', value: 'ที่อยู่อาศัย และอุตสาหกรรม' },
      { id: '02', value: 'แปลงมุม' },
      { id: '03', value: 'รูปหลายเหลี่ยม' },
      { id: '04', value: 'ถมแล้ว' },
      { id: '05', value: 71 },
      { id: '06', value: 90 },
      { id: '17', value: 22750 },
      { id: '20', value: 'Baht/ Sq.Wa' },
      { id: '07', value: 'เยี่ยม' },
    ],
  },
  {
    id: 'SURVEY_02',
    factors: [
      { id: '01', value: 'ที่อยู่อาศัย และอุตสาหกรรม' },
      { id: '02', value: 'แปลงกลาง' },
      { id: '03', value: 'รูปหลายเหลี่ยม' },
      { id: '04', value: 'ถมแล้ว' },
      { id: '05', value: 65 },
      { id: '06', value: 148 },
      { id: '17', value: 22500 },
      { id: '20', value: 'Baht/ Sq.Wa' },
    ],
  },
  {
    id: 'SURVEY_03',
    factors: [
      { id: '01', value: 'ที่อยู่อาศัย และอุตสาหกรรม' },
      { id: '02', value: 'แปลงกลาง' },
      { id: '03', value: 'รูปหลายเหลี่ยม' },
      { id: '04', value: 'ถมแล้ว' },
      { id: '05', value: 73 },
      { id: '06', value: 175 },
      { id: '21', value: 21500 },
      { id: '22', value: '2000-01-01' },
      { id: '20', value: 'Baht/ Sq.Wa' },
    ],
  },

  // survey for land and building
  {
    id: 'SURVEY_04',
    factors: [
      { id: '02', value: 'แปลงกลาง' },
      { id: '03', value: 'รูปหลายเหลี่ยม' },
      { id: '10', value: 'ดี' },
      { id: '05', value: 71 }, // land area
      { id: '09', value: 'ถนนภายในโครงการ' },
      { id: '12', value: 206 }, // usable area
      { id: '17', value: 4900000 }, // offering price
      { id: '22', value: '2000-01-01' },
      { id: '20', value: 'Baht/ Sq.Wa' },
    ],
  },
  {
    id: 'SURVEY_05',
    factors: [
      { id: '02', value: 'แปลงมุม' },
      { id: '03', value: 'รูปหลายเหลี่ยม' },
      { id: '10', value: 'แย่' },
      { id: '05', value: 65 }, // land area
      { id: '09', value: 'ถนนภายในโครงการ' },
      { id: '12', value: 207 }, // usable area
      { id: '17', value: 4700000 }, // offering price
      { id: '22', value: '2000-01-01' },
      { id: '20', value: 'Baht/ Sq.Wa' },
    ],
  },
  {
    id: 'SURVEY_06',
    factors: [
      { id: '02', value: 'แปลงกลาง' },
      { id: '03', value: 'รูปหลายเหลี่ยม' },
      { id: '10', value: 'ปานกลาง' },
      { id: '05', value: 73 }, // land area
      { id: '09', value: 'ถนนภายในโครงการ' },
      { id: '12', value: 206 }, // usable area
      { id: '21', value: 4900000 }, // selling price
      { id: '22', value: '2000-01-01' },
      { id: '20', value: 'Baht/ Sq.Wa' },
    ],
  },
];
