export const MOC_SELECTED_COMPARATIVE_DATA_LAND = [
  {
    id: 'SURVEY_01',
    offeringPrice: 22750,
    offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
    offeringPriceAdjustmentAmt: undefined,
    sellingPrice: undefined,
    sellingPriceMeasurementUnit: undefined,
    sellingDate: undefined,
    sellingPriceAdjustmentYear: undefined,
    numberOfYears: undefined,
  },
  {
    id: 'SURVEY_02',
    offeringPrice: 22500,
    offeringPriceMeasurementUnit: 'Baht/ Sq.Wa',
    offeringPriceAdjustmentAmt: undefined,
    sellingPrice: undefined,
    sellingPriceMeasurementUnit: undefined,
    sellingDate: undefined,
    sellingPriceAdjustmentYear: undefined,
    numberOfYears: undefined,
  },
  {
    id: 'SURVEY_03',
    offeringPrice: undefined,
    offeringPriceMeasurementUnit: undefined,
    offeringPriceAdjustmentAmt: undefined,
    sellingPrice: 21500,
    sellingPriceMeasurementUnit: 'Baht/ Sq.Wa',
    sellingDate: undefined,
    sellingPriceAdjustmentYear: undefined,
    numberOfYears: 8,
  },
];

export const MOC_COMPARATIVE_DATA_LAND: Record<string, any>[] = [
  {
    factor: 'Environment',
    collateral: 'ที่อยู่อาศัย และอุตสาหกรรม',
    surveys: [
      { id: 'survey1', data: 'ที่อยู่อาศัย และอุตสาหกรรม' },
      { id: 'survey2', data: 'ที่อยู่อาศัย และอุตสาหกรรม' },
      { id: 'survey3', data: 'ที่อยู่อาศัย และอุตสาหกรรม' },
    ],
  },
  {
    factor: 'Plot Location',
    collateral: 'แปลงกลาง',
    surveys: [
      { id: 'survey1', data: 'แปลงมุม' },
      { id: 'survey2', data: 'แปลงกลาง' },
      { id: 'survey3', data: 'แปลงกลาง' },
    ],
  },
  {
    factor: 'Land Shape',
    collateral: 'รูปหลายเหลี่ยม',
    surveys: [
      { id: 'survey1', data: 'รูปหลายเหลี่ยม' },
      { id: 'survey2', data: 'รูปหลายเหลี่ยม' },
      { id: 'survey3', data: 'รูปหลายเหลี่ยม' },
    ],
  },
  {
    factor: 'Land Condition',
    collateral: 'ถมแล้ว',
    surveys: [
      { id: 'survey1', data: 'ถมแล้ว' },
      { id: 'survey2', data: 'ถมแล้ว' },
      { id: 'survey3', data: 'ถมแล้ว' },
    ],
  },
  {
    factor: 'Land Area',
    collateral: 17518.6,
    surveys: [
      { id: 'survey1', data: 6371.5 },
      { id: 'survey2', data: 2200 },
      { id: 'survey3', data: 3328.2 },
    ],
  },
  {
    factor: 'Wide frontage of land adjacent to the road',
    collateral: 284,
    surveys: [
      { id: 'survey1', data: 90 },
      { id: 'survey2', data: 148 },
      { id: 'survey3', data: 175 },
    ],
  },
  {
    factor: 'Offering Price',
    collateral: '',
    surveys: [
      { id: 'survey1', data: '22,750' },
      { id: 'survey2', data: '22,500' },
      { id: 'survey3', data: '' },
    ],
  },
  {
    factor: 'Selling Price',
    collateral: '',
    surveys: [
      { id: 'survey1', data: '' },
      { id: 'survey2', data: '' },
      { id: 'survey3', data: '21,500' },
    ],
  },
];
