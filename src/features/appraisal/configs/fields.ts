import { createElement } from 'react';
import type { FormField } from '@/shared/components/form';
import {
  AERIAL_TITLE_TYPES,
  LAND_PARCEL_TITLE_TYPES,
  RAWANG_TITLE_TYPES,
  SURVEY_TITLE_TYPES,
} from '@/shared/constants/titleTypes';

/** ฿ left-adornment for currency number-inputs (Land + Condo PMA prices). */
const bahtPrefix = createElement('span', { className: 'text-sm text-gray-400' }, '฿');

/** Prefix all field names for schema building (short → full dotted path). */
export function prefixFields(fields: FormField[], prefix: string): FormField[] {
  return fields.map(f => ({ ...f, name: `${prefix}.${f.name}` }));
}

// =============================================================================
// Land fields (from LandDetailForm.tsx)
// =============================================================================

const ObligationDetail = ['02', '03', '04', '05', '99'];

export const landInfoField: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-12',
    maxLength: 150,
  },

  {
    type: 'number-input',
    label: 'Latitude',
    name: 'latitude',
    wrapperClassName: 'col-span-6',
    required: true,
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowNegative: true,
    allowZero: true,
    min: -90,
    max: 90,
  },

  {
    type: 'number-input',
    label: 'Longitude',
    name: 'longitude',
    wrapperClassName: 'col-span-6',
    required: true,
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowNegative: true,
    allowZero: true,
    min: -180,
    max: 180,
  },
];

export const landAddressFields: FormField[] = [
  // Location selector (sub-district autocomplete that populates district, province, postcode)
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'district',
    districtNameField: 'districtName',
    provinceField: 'province',
    provinceNameField: 'provinceName',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    addressSource: 'title',
    wrapperClassName: 'col-span-5',
    required: true,
  },
  // Display fields (autopopulated by location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    wrapperClassName: 'col-span-4',
  },

  {
    type: 'text-input',
    label: 'Province',
    name: 'provinceName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
];

export const landDopaAddressFields: FormField[] = [
  // Dopa Location selector (sub-district autocomplete that populates dopaDistrict, dopaProvince)
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'dopaSubDistrict',
    districtField: 'dopaDistrict',
    districtNameField: 'dopaDistrictName',
    provinceField: 'dopaProvince',
    provinceNameField: 'dopaProvinceName',
    postcodeField: 'dopaPostcode',
    subDistrictNameField: 'dopaSubDistrictName',
    addressSource: 'dopa',
    wrapperClassName: 'col-span-5',
    required: true,
  },
  // Display fields (autopopulated by dopa location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'dopaDistrictName',
    disabled: true,
    wrapperClassName: 'col-span-4',
  },

  {
    type: 'text-input',
    label: 'Province',
    name: 'dopaProvinceName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
];

export const landInfoFieldTail: FormField[] = [
  {
    type: 'parameter-search',
    label: 'Land Office',
    name: 'landOffice',
    group: 'LandOffice',
    wrapperClassName: 'col-span-12',
    required: true,
  },

  {
    type: 'textarea',
    label: 'Land Description',
    name: 'landDescription',
    wrapperClassName: 'col-span-12',
    required: true,
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'boolean-toggle',
    label: 'Check Owner',
    name: 'isOwnerVerifiedLand',
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerNameLand',
    wrapperClassName: 'col-span-12',
    disableWhen: { field: 'isOwnerVerifiedLand', is: false },
    requiredWhen: { field: 'isOwnerVerifiedLand', is: true },
    disabledValue: 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้',
    maxLength: 100,
  },

  {
    type: 'radio-group',
    label: 'Is Obligation',
    name: 'hasObligation',
    orientation: 'horizontal',
    variant: 'button',
    group: 'Obligation',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'text-input',
    label: 'Obligation',
    name: 'obligationDetails',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasObligation', is: ObligationDetail, operator: 'in' },
    requiredWhen: { field: 'hasObligation', is: ObligationDetail, operator: 'in' },
    maxLength: 100,
  },
];

export const landLocationField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Land Location Verified',
    name: 'isLandLocationVerified',
    options: ['In Correct', 'Correct'],
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'radio-group',
    label: 'Check By',
    name: 'landCheckMethodType',
    orientation: 'horizontal',
    group: 'CheckBy',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landCheckMethodTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landCheckMethodType', is: '99' },
    requiredWhen: { field: 'landCheckMethodType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'text-input',
    label: 'Street',
    name: 'street',
    wrapperClassName: 'col-span-6',
    required: true,
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Soi',
    name: 'soi',
    wrapperClassName: 'col-span-3',
    maxLength: 100,
  },

  {
    type: 'number-input',
    label: 'Distance',
    name: 'distanceFromMainRoad',
    wrapperClassName: 'col-span-3',
    maxIntegerDigits: 5,
    decimalPlaces: 2,
  },

  {
    type: 'text-input',
    label: 'Village',
    name: 'village',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    required: true,
  },

  {
    type: 'text-input',
    label: 'Address / Location',
    name: 'addressLocation',
    wrapperClassName: 'col-span-12',
    maxLength: 200,
  },

  {
    type: 'dropdown',
    label: 'Land Shape',
    name: 'landShapeType',
    wrapperClassName: 'col-span-12',
    group: 'LandShape',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landShapeTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landShapeType', is: '99' },
    requiredWhen: { field: 'landShapeType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'dropdown',
    label: 'Type of urban plan',
    name: 'urbanPlanningType',
    wrapperClassName: 'col-span-12',
    group: 'TypeOfUrbanPlanning',
  },

  {
    type: 'checkbox-group',
    label: 'Location',
    name: 'landZoneType',
    orientation: 'horizontal',
    group: 'Location',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landZoneTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landZoneType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'landZoneType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const plotLocationField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Plot Location',

    name: 'plotLocationType',
    orientation: 'horizontal',
    group: 'PlotLocation',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'plotLocationTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'plotLocationType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'plotLocationType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const landFillField: FormField[] = [
  {
    type: 'radio-group',
    label: 'Landfill',

    name: 'landFillType',
    orientation: 'horizontal',
    group: 'Landfill',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landFillTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landFillType', is: '99' },
    requiredWhen: { field: 'landFillType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'number-input',
    label: 'Landfill ( % )',
    name: 'landFillPercent',
    wrapperClassName: 'col-span-6',
    decimalPlaces: 2,
    maxIntegerDigits: 3,
    max: 100,
  },

  {
    type: 'number-input',
    label: 'Soil Level ( cm )',
    name: 'soilLevel',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
    decimalPlaces: 2,
    allowNegative: true,
  },
];

export const roadField: FormField[] = [
  {
    type: 'number-input',
    label: 'Road Width',
    name: 'accessRoadWidth',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 3,
    decimalPlaces: 0,
  },

  {
    type: 'number-input',
    label: 'Right of Way',
    name: 'rightOfWay',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 3,
    decimalPlaces: 0,
  },

  {
    type: 'number-input',
    label: 'Wide frontage of land adjacent to the road',
    name: 'roadFrontage',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 3,
  },

  {
    type: 'number-input',
    label: 'Number of sides facing the road',
    name: 'numberOfSidesFacingRoad',
    wrapperClassName: 'col-span-6',
    decimalPlaces: 0,
    maxIntegerDigits: 1,
  },

  {
    type: 'text-input',
    label: 'Road passing in front of the land',
    name: 'roadPassInFrontOfLand',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
  },

  {
    type: 'radio-group',
    label: 'Land Accessibility',
    name: 'landAccessibilityType',
    orientation: 'horizontal',
    group: 'LandAccessibility',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Land Accessibility Description',
    name: 'landAccessibilityRemark',
    wrapperClassName: 'col-span-12',
    maxLength: 200,
    showCharCount: true,
  },
];

export const roadSurfaceField: FormField[] = [
  {
    type: 'radio-group',
    label: 'Road Surface',
    name: 'roadSurfaceType',
    orientation: 'horizontal',
    group: 'RoadSurface',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'roadSurfaceTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roadSurfaceType', is: '99' },
    requiredWhen: { field: 'roadSurfaceType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const publicUtilityField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Public Utility',
    name: 'publicUtilityType',
    orientation: 'horizontal',
    group: 'PublicUtility',

    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'publicUtilityTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'publicUtilityType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'publicUtilityType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const landUseField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Land Use',
    name: 'landUseType',
    orientation: 'horizontal',
    group: 'LandUse',

    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landUseTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landUseType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'landUseType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const landEntranceField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Entrance-Exit',
    name: 'landEntranceExitType',
    orientation: 'horizontal',
    group: 'LandEntranceExit',

    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landEntranceExitTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landEntranceExitType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'landEntranceExitType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const transpotationField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Transportation',
    name: 'transportationAccessType',
    orientation: 'horizontal',
    group: 'Transportation',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'transportationAccessTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'transportationAccessType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'transportationAccessType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const anticipationProsperityField: FormField[] = [
  {
    type: 'radio-group',
    label: 'Anticipation of Prosperity',
    name: 'propertyAnticipationType',
    orientation: 'horizontal',
    group: 'AnticipationOfProsperity',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'propertyAnticipationTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'propertyAnticipationType', is: '99' },
    requiredWhen: { field: 'propertyAnticipationType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const expropriateField: FormField[] = [
  {
    type: 'checkbox',
    name: 'isExpropriated',
    label: 'Is Expropriate',
    wrapperClassName: 'col-span-3',
  },

  {
    type: 'checkbox',
    name: 'isInExpropriationLine',
    label: 'In Line Expropriate',
    wrapperClassName: 'col-span-3',
  },

  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'royalDecree',
    wrapperClassName: 'col-span-6',
    maxLength: 20,
  },

  {
    type: 'textarea',
    label: 'Is Expropriated',
    name: 'expropriationRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isExpropriated', is: true },
    requiredWhen: { field: 'isExpropriated', is: true },
    maxLength: 4000,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Is In Line Expropriate',
    name: 'expropriationLineRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isInExpropriationLine', is: true },
    requiredWhen: { field: 'isInExpropriationLine', is: true },
    maxLength: 4000,
    showCharCount: true,
  },
];

export const encroachedField: FormField[] = [
  {
    type: 'checkbox',
    name: 'isEncroached',
    label: 'Is Encroached',
    wrapperClassName: 'col-span-3',
  },

  {
    type: 'number-input',
    label: 'Encroached Area (Sq.Wa)',
    name: 'encroachmentArea',
    wrapperClassName: 'col-span-9',
    disableWhen: { field: 'isEncroached', is: false },
    maxIntegerDigits: 8,
  },

  {
    type: 'textarea',
    label: 'Is Encroached',
    name: 'encroachmentRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isEncroached', is: true },
    requiredWhen: { field: 'isEncroached', is: true },
    maxLength: 4000,
    showCharCount: true,
  },
];

export const electricityField: FormField[] = [
  {
    type: 'checkbox',
    name: 'hasElectricity',
    label: 'Has Electricity',
    wrapperClassName: 'col-span-3',
  },

  {
    type: 'number-input',
    label: 'Distance',
    name: 'electricityDistance',
    wrapperClassName: 'col-span-9',
    disableWhen: { field: 'hasElectricity', is: false },
    maxIntegerDigits: 3,
  },
];

export const landBoundaryField: FormField[] = [
  {
    type: 'checkbox',
    label: 'Is Landlocked',
    name: 'isLandlocked',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Is Landlocked Other',
    name: 'landlockedRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isLandlocked', is: true },
    requiredWhen: { field: 'isLandlocked', is: true },
    maxLength: 4000,
    showCharCount: true,
  },

  {
    type: 'checkbox',
    label: 'Is Forest Boundary',
    name: 'isForestBoundary',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Is Forest Boundary Other',
    name: 'forestBoundaryRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isForestBoundary', is: true },
    requiredWhen: { field: 'isForestBoundary', is: true },
    maxLength: 4000,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'otherLegalLimitations',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: true,
  },
];

/** @deprecated Use electricityField + landBoundaryField instead */
export const LimitationOther: FormField[] = [...electricityField, ...landBoundaryField];

export const evictionField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Eviction',
    name: 'evictionType',
    orientation: 'horizontal',
    group: 'Eviction',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'evictionTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'evictionType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'evictionType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const allocationField: FormField[] = [
  {
    type: 'radio-group',
    label: 'Allocation',
    name: 'allocationType',
    orientation: 'horizontal',
    group: 'Allocation',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },
];

export const sizeAndBoundary: FormField[] = [
  {
    type: 'text-input',
    label: 'North Consecutive Area',
    name: 'northAdjacentArea',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
  },

  {
    type: 'number-input',
    label: 'North Estimate Length',
    name: 'northBoundaryLength',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
    decimalPlaces: 2,
  },

  {
    type: 'text-input',
    label: 'South Consecutive Area',
    name: 'southAdjacentArea',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
  },

  {
    type: 'number-input',
    label: 'South Estimate Length',
    name: 'southBoundaryLength',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
    decimalPlaces: 2,
  },

  {
    type: 'text-input',
    label: 'East Consecutive Area',
    name: 'eastAdjacentArea',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
  },

  {
    type: 'number-input',
    label: 'East Estimate Length',
    name: 'eastBoundaryLength',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
    decimalPlaces: 2,
  },

  {
    type: 'text-input',
    label: 'West Consecutive Area',
    name: 'westAdjacentArea',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
  },

  {
    type: 'number-input',
    label: 'West Estimate Length',
    name: 'westBoundaryLength',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
    decimalPlaces: 2,
  },
];

export const otherInformationField: FormField[] = [
  {
    type: 'number-input',
    label: 'Pond Area',
    name: 'pondArea',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
  },

  {
    type: 'number-input',
    label: 'Depth of Pit',
    name: 'pondDepth',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
  },

  {
    type: 'boolean-toggle',
    label: 'Has Building',
    name: 'hasBuilding',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'hasBuildingOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasBuilding', is: true },
    requiredWhen: { field: 'hasBuilding', is: true },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'boolean-toggle',
    label: 'Land is rented out to others',
    name: 'isRentedOut',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-12',
  },
];

export const remarkLandField: FormField[] = [
  {
    type: 'textarea',
    label: 'Remark',
    name: 'remark',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },
];

// =============================================================================
// Building fields (from BuildingDetailForm.tsx)
// =============================================================================

export const buildingInfoField: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-12',
    maxLength: 150,
  },

  {
    type: 'text-input',
    label: 'Building No.',
    name: 'buildingNumber',
    wrapperClassName: 'col-span-3',
    required: true,
    maxLength: 30,
  },

  {
    type: 'text-input',
    label: 'House No.',
    name: 'houseNumber',
    wrapperClassName: 'col-span-3',
    disableWhen: { field: 'noHouseNumber', is: '02' },
    disabledValue: '-',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Model Name',
    name: 'modelName',
    wrapperClassName: 'col-span-6',
    required: true,
    maxLength: 100,
  },

  {
    type: 'boolean-toggle',
    label: 'Check Owner',
    name: 'isOwnerVerifiedBuilding',
    required: true,
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerNameBuilding',
    wrapperClassName: 'col-span-12',
    required: true,
    disableWhen: { field: 'isOwnerVerifiedBuilding', is: false },
    requiredWhen: { field: 'isOwnerVerifiedBuilding', is: true },
    disabledValue: 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้',
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Construction on Title Deed No.',
    name: 'builtOnTitleNumber',
    wrapperClassName: 'col-span-5',
    required: true,
    maxLength: 500,
  },

  {
    type: 'radio-group',
    label: 'No House Number',
    name: 'noHouseNumber',
    wrapperClassName: 'col-span-12',
    group: 'NoHouseNumber',
    orientation: 'horizontal',
    variant: 'button',
  },

  {
    type: 'radio-group',
    label: 'Building Condition',
    group: 'BuildingCondition',
    orientation: 'horizontal',
    name: 'buildingConditionType',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'buildingConditionTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'buildingConditionType', is: '99' },
    requiredWhen: { field: 'buildingConditionType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'boolean-toggle',
    label: 'Under Construction',
    name: 'isUnderConstruction',
    wrapperClassName: 'col-span-3',
    options: ['No', 'Yes'],
  },

  {
    type: 'datetime-input',
    label: 'License Expiration Date',
    name: 'constructionLicenseExpirationDate',
    wrapperClassName: 'col-span-6',
  },

  {
    type: 'boolean-toggle',
    label: 'Appraisal',
    name: 'isAppraisable',
    required: true,
    options: ['Not Appraised', 'Appraise'],
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'radio-group',
    label: 'Is Obligation',
    name: 'hasObligation',
    orientation: 'horizontal',
    variant: 'button',
    group: 'Obligation',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'text-input',
    label: 'Obligation',
    name: 'obligationDetails',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasObligation', is: ObligationDetail, operator: 'in' },
    requiredWhen: { field: 'hasObligation', is: ObligationDetail, operator: 'in' },
    maxLength: 100,
  },
];

export const buildingTypeField: FormField[] = [
  {
    type: 'radio-group',
    label: 'Building Type',

    name: 'buildingType',
    orientation: 'horizontal',
    group: 'BuildingType',
    variant: 'button',
    wrapperClassName: 'col-span-12',
    required: true,
  },

  {
    type: 'textarea',
    label: 'Building Type Other',
    name: 'buildingTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'buildingType', is: '99' },
    requiredWhen: { field: 'buildingType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'number-input',
    label: 'Total Floor',
    name: 'numberOfFloors',
    wrapperClassName: 'col-span-12',
    required: true,
    maxIntegerDigits: 3,
    decimalPlaces: 1,
  },
];

export const decorationField: FormField[] = [
  {
    type: 'radio-group',
    label: 'Decoration',

    name: 'decorationType',
    orientation: 'horizontal',
    group: 'Decoration',
    variant: 'button',
    wrapperClassName: 'col-span-12',
    required: true,
  },

  {
    type: 'textarea',
    label: 'Decoration Other',
    name: 'decorationTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'decorationType', is: '99' },
    requiredWhen: { field: 'decorationType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const encroachmentField: FormField[] = [
  {
    type: 'checkbox',
    label: 'Is Encroaching',
    name: 'isEncroachingOthers',
    wrapperClassName: 'col-span-3 flex items-center',
  },

  {
    type: 'number-input',
    label: 'Encroaching Area',
    name: 'encroachingOthersArea',
    wrapperClassName: 'col-span-9',
    disableWhen: { field: 'isEncroachingOthers', is: false },
    maxIntegerDigits: 8,
  },

  {
    type: 'textarea',
    label: 'Encroachment Remark',
    name: 'encroachingOthersRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isEncroachingOthers', is: true },
    requiredWhen: { field: 'isEncroachingOthers', is: true },
    maxLength: 4000,
    showCharCount: true,
  },
];

export const buildingMaterialField: FormField[] = [
  {
    type: 'radio-group',
    label: 'Building Material',
    name: 'buildingMaterialType',
    orientation: 'horizontal',
    group: 'BuildingMaterial',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },
];

export const buildingStyleField: FormField[] = [
  {
    type: 'radio-group',
    label: 'Building Style',
    name: 'buildingStyleType',
    orientation: 'horizontal',
    group: 'BuildingStyle',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'buildingStyleTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'buildingStyleType', is: '99' },
    requiredWhen: { field: 'buildingStyleType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const isResidentialField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Is Residential',
    name: 'isResidential',
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-10 flex items-center',
  },

  {
    type: 'number-input',
    label: 'Building Age',
    name: 'buildingAge',
    wrapperClassName: 'col-span-2',
    maxIntegerDigits: 3,
    decimalPlaces: 1,
    allowZero: true,
  },

  {
    type: 'textarea',
    label: 'Due To',
    name: 'residentialRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isResidential', is: false },
    requiredWhen: { field: 'isResidential', is: false },
    maxLength: 100,
    showCharCount: true,
  },
];

export const constructionStyleField: FormField[] = [
  {
    type: 'radio-group',
    label: 'Construction Style',
    name: 'constructionStyleType',
    orientation: 'horizontal',
    group: 'ConstructionStyle',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Remark',
    name: 'constructionStyleRemark',
    wrapperClassName: 'col-span-12',
    required: false,
    maxLength: 4000,
    showCharCount: true,
  },
];

export const generalStructureField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'General Structure',

    name: 'structureType',
    orientation: 'horizontal',
    group: 'GeneralStructure',

    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'structureTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'structureType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'structureType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const roofFrameField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Roof Frame',
    name: 'roofFrameType',
    orientation: 'horizontal',
    group: 'RoofFrame',

    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'roofFrameTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofFrameType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'roofFrameType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const roofField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Roof',
    name: 'roofType',
    orientation: 'horizontal',
    group: 'Roof',

    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'roofTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'roofType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const ceilingField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Ceiling',
    name: 'ceilingType',
    orientation: 'horizontal',
    group: 'Ceiling',

    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'ceilingTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'ceilingType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'ceilingType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const wallField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Interior Wall',
    name: 'interiorWallType',
    orientation: 'horizontal',
    group: 'Interior',

    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'interiorWallTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'interiorWallType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'interiorWallType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'checkbox-group',
    label: 'Exterior Wall',
    name: 'exteriorWallType',
    orientation: 'horizontal',
    group: 'Exterior',

    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'exteriorWallTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'exteriorWallType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'exteriorWallType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const fenceField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Fence',
    name: 'fenceType',
    orientation: 'horizontal',
    group: 'Fence',

    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'fenceTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'fenceType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'fenceType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const constTypeFeild: FormField[] = [
  {
    type: 'radio-group',
    label: 'Construction Type',
    name: 'constructionType',
    orientation: 'horizontal',
    group: 'ConstructionType',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'constructionTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'constructionType', is: '99' },
    requiredWhen: { field: 'constructionType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const buildingArea: FormField[] = [
  {
    type: 'number-input',
    name: 'totalBuildingArea',
    label: 'Total Building Area (sq.m.)',
    wrapperClassName: 'col-span-3',
    required: true,
    maxIntegerDigits: 8,
    decimalPlaces: 2,
  },
];

export const utilizationFeild: FormField[] = [
  {
    type: 'radio-group',
    label: 'Utilization',
    name: 'utilizationType',
    orientation: 'horizontal',
    group: 'Utilization',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'utilizationTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'utilizationType', is: '99' },
    requiredWhen: { field: 'utilizationType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const remarkBuildingField: FormField[] = [
  {
    type: 'textarea',
    label: 'Remark',
    name: 'remark',
    wrapperClassName: 'col-span-12',
    required: false,
    maxLength: 4000,
    showCharCount: true,
  },
];

// =============================================================================
// Condominium fields (from CondoDetailForm.tsx)
// =============================================================================

export const condoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-12',
    maxLength: 150,
  },

  {
    type: 'text-input',
    label: 'Condominium Name',
    name: 'condoName',
    wrapperClassName: 'col-span-12',
    required: true,
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Room No',
    name: 'roomNumber',
    wrapperClassName: 'col-span-3',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Floor No',
    name: 'floorNumber',
    wrapperClassName: 'col-span-3',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Building No',
    name: 'buildingNumber',
    wrapperClassName: 'col-span-3',
    required: true,
    maxLength: 30,
  },

  {
    type: 'text-input',
    label: 'Condominium Registration No',
    name: 'condoRegistrationNumber',
    wrapperClassName: 'col-span-3',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Model Name',
    name: 'modelName',
    wrapperClassName: 'col-span-6',
    required: true,
    maxLength: 100,
  },

  {
    type: 'number-input',
    label: 'Usable Area (Sq.M)',
    name: 'usableArea',
    wrapperClassName: 'col-span-6',
    required: true,
    maxIntegerDigits: 5,
  },

  {
    type: 'textarea',
    label: 'Title Number',
    name: 'titleNumber',
    wrapperClassName: 'col-span-12',
    required: true,
    maxLength: 500,
    showCharCount: true,
  },

  {
    // The percentage moved into the Construction Inspection tab; this flag is what opens it.
    // col-span-6, not 3, so the row still sums to 12 like every other row in this group.
    type: 'boolean-toggle',
    label: 'Under Construction',
    name: 'isUnderConstruction',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
  },
];

export const condoAddressFields: FormField[] = [
  // Location selector (sub-district autocomplete that populates district, province, postcode)
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'district',
    districtNameField: 'districtName',
    provinceField: 'province',
    provinceNameField: 'provinceName',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    addressSource: 'title',
    wrapperClassName: 'col-span-5',
    required: true,
  },
  // Display fields (autopopulated by location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    wrapperClassName: 'col-span-4',
  },

  {
    type: 'text-input',
    label: 'Province',
    name: 'provinceName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
];

export const condoDopaAddressFields: FormField[] = [
  // Dopa Location selector (sub-district autocomplete that populates dopaDistrict, dopaProvince)
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'dopaSubDistrict',
    districtField: 'dopaDistrict',
    districtNameField: 'dopaDistrictName',
    provinceField: 'dopaProvince',
    provinceNameField: 'dopaProvinceName',
    postcodeField: 'dopaPostcode',
    subDistrictNameField: 'dopaSubDistrictName',
    addressSource: 'dopa',
    wrapperClassName: 'col-span-5',
    required: true,
  },
  // Display fields (autopopulated by dopa location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'dopaDistrictName',
    disabled: true,
    wrapperClassName: 'col-span-4',
  },

  {
    type: 'text-input',
    label: 'Province',
    name: 'dopaProvinceName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
];

export const condoFieldsTail: FormField[] = [
  {
    type: 'number-input',
    label: 'Latitude',
    name: 'latitude',
    wrapperClassName: 'col-span-6',
    required: true,
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowZero: true,
    allowNegative: true,
    min: -90,
    max: 90,
  },

  {
    type: 'number-input',
    label: 'Longitude',
    name: 'longitude',
    wrapperClassName: 'col-span-6',
    required: true,
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowZero: true,
    allowNegative: true,
    min: -180,
    max: 180,
  },

  {
    type: 'parameter-search',
    label: 'Land Office',
    name: 'landOffice',
    wrapperClassName: 'col-span-12',
    required: true,
    group: 'LandOffice',
  },

  {
    type: 'boolean-toggle',
    label: 'Check Owner',
    name: 'isOwnerVerified',
    required: true,
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-12',
    requiredWhen: { field: 'isOwnerVerified', is: true },
    disableWhen: { field: 'isOwnerVerified', is: false },
    disabledValue: 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้',
    maxLength: 100,
  },

  {
    type: 'radio-group',
    label: 'Condominium Condition',
    name: 'buildingConditionType',
    wrapperClassName: 'col-span-12',
    group: 'BuildingCondition',
    orientation: 'horizontal',
    variant: 'button',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'buildingConditionTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'buildingConditionType', is: '99' },
    requiredWhen: { field: 'buildingConditionType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'radio-group',
    label: 'Is Obligation',
    name: 'hasObligation',
    orientation: 'horizontal',
    variant: 'button',
    group: 'Obligation',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'text-input',
    label: 'Obligation',
    name: 'obligationDetails',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasObligation', is: ObligationDetail, operator: 'in' },
    requiredWhen: { field: 'hasObligation', is: ObligationDetail, operator: 'in' },
    maxLength: 100,
  },

  {
    type: 'dropdown',
    label: 'Document Validation',
    name: 'documentValidationResultType',
    group: 'DocumentValidation',
    wrapperClassName: 'col-span-12',
    required: true,
  },
];

export const condoLocationFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Location',
    name: 'locationType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'CondoLocation',
    variant: 'button',
  },

  {
    type: 'text-input',
    label: 'Street',
    name: 'street',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Soi',
    name: 'soi',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'number-input',
    label: 'Distance',
    name: 'distanceFromMainRoad',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 5,
    suffix: 'm',
  },

  {
    type: 'number-input',
    label: 'Road Width',
    name: 'accessRoadWidth',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
    decimalPlaces: 0,
    suffix: 'm',
  },

  {
    type: 'number-input',
    label: 'Right of Way',
    name: 'rightOfWay',
    wrapperClassName: 'col-span-4',
    decimalPlaces: 0,
    maxIntegerDigits: 3,
  },

  {
    type: 'radio-group',
    label: 'Road Surface',
    name: 'roadSurfaceType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'RoadSurface',
    variant: 'button',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'roadSurfaceTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roadSurfaceType', is: '99' },
    requiredWhen: { field: 'roadSurfaceType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'checkbox-group',
    label: 'Public Utility',
    name: 'publicUtilityType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'PublicUtility',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'publicUtilityTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'publicUtilityType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'publicUtilityType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const condoDecorationFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Decoration',

    name: 'decorationType',
    wrapperClassName: 'col-span-12',
    required: true,
    orientation: 'horizontal',
    group: 'Decoration',
    variant: 'button',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'decorationTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'decorationType', is: '99' },
    requiredWhen: { field: 'decorationType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const ageHeightCondoFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Building Age (Years)',
    name: 'buildingAge',
    wrapperClassName: 'col-span-12',
    maxIntegerDigits: 3,
    decimalPlaces: 1,
  },

  {
    type: 'number-input',
    label: 'Total Number of Floors',
    name: 'numberOfFloors',
    wrapperClassName: 'col-span-12',
    required: true,
    maxIntegerDigits: 3,
    decimalPlaces: 1,
  },
];

export const buildingFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Building Form',
    name: 'buildingFormType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'BuildingForm',
    variant: 'button',
  },
];

export const constructionMaterialsFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Construction Materials',
    name: 'constructionMaterialType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'ConstructionMaterials',
    variant: 'button',
  },
];

export const condoRoomLayoutFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Room Layout',
    name: 'roomLayoutType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'RoomLayout',
    variant: 'default',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'roomLayoutTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roomLayoutType', is: '99' },
    requiredWhen: { field: 'roomLayoutType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const locationViewFormFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Location View',
    name: 'locationViewType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'LocationView',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'locationViewTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'locationViewType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'locationViewType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const floorFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Ground Flooring Materials',
    name: 'groundFloorMaterialType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'GroundFlooringMaterials',
    variant: 'button',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'groundFloorMaterialTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'groundFloorMaterialType', is: '99' },
    requiredWhen: { field: 'groundFloorMaterialType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'radio-group',
    label: 'Upper Flooring Materials',
    name: 'upperFloorMaterialType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'UpperFlooringMaterials',
    variant: 'button',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'upperFloorMaterialTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'upperFloorMaterialType', is: '99' },
    requiredWhen: { field: 'upperFloorMaterialType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'radio-group',
    label: 'Bathroom Flooring Materials',
    name: 'bathroomFloorMaterialType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'BathroomFlooringMaterials',
    variant: 'button',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'bathroomFloorMaterialTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'bathroomFloorMaterialType', is: '99' },
    requiredWhen: { field: 'bathroomFloorMaterialType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const roofFormFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Roof',
    name: 'roofType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'Roof',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'roofTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'roofType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const expropriationFields: FormField[] = [
  {
    type: 'checkbox',
    label: 'Is Expropriated',
    name: 'isExpropriated',
    wrapperClassName: 'col-span-3',
  },

  {
    type: 'checkbox',
    label: 'In Line Expropriated',
    name: 'isInExpropriationLine',
    wrapperClassName: 'col-span-3',
  },

  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'royalDecree',
    wrapperClassName: 'col-span-6',
    maxLength: 20,
  },

  {
    type: 'textarea',
    label: 'Is Expropriated',
    name: 'expropriationRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isExpropriated', is: true },
    requiredWhen: { field: 'isExpropriated', is: true },
    maxLength: 4000,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Is In Line Expropriated',
    name: 'expropriationLineRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isInExpropriationLine', is: true },
    requiredWhen: { field: 'isInExpropriationLine', is: true },
    maxLength: 4000,
    showCharCount: true,
  },
];

export const condoFacilityFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Facility',
    name: 'facilityType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'Facilities',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'facilityTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'facilityType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'facilityType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const environmentFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Environment',
    name: 'environmentType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'Environment',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'environmentTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'environmentType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'environmentType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const inForestBoundaryFormFields: FormField[] = [
  {
    type: 'checkbox',
    label: 'Is In Forest Boundary',
    name: 'isForestBoundary',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Is In Forest Boundary',
    name: 'forestBoundaryRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isForestBoundary', is: true },
    requiredWhen: { field: 'isForestBoundary', is: true },
    maxLength: 4000,
    showCharCount: true,
  },
];

export const remarkFormFields: FormField[] = [
  {
    type: 'textarea',
    label: 'Remark',
    name: 'remark',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },
];

// Condo land-characteristic fields — same param groups as the land/land+building
// equivalents (landEntranceField, landFillField, landUseField at ~L253-436), reused
// as-is since these are condo-level attributes of the land the building sits on.
// Unlike landFillField, landFillPercent/soilLevel are omitted here: those two describe
// physical fill work on bare land, which doesn't apply once a condominium is built.
export const condoLandCharacteristicsFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Type of urban plan',
    name: 'urbanPlanningType',
    wrapperClassName: 'col-span-12',
    group: 'TypeOfUrbanPlanning',
  },

  {
    type: 'radio-group',
    label: 'Land Condition',

    name: 'landFillType',
    orientation: 'horizontal',
    group: 'Landfill',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landFillTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landFillType', is: '99' },
    requiredWhen: { field: 'landFillType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'checkbox-group',
    label: 'Land Use',
    name: 'landUseType',
    orientation: 'horizontal',
    group: 'LandUse',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landUseTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landUseType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'landUseType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'checkbox-group',
    label: 'Entrance-Exit',
    name: 'landEntranceExitType',
    orientation: 'horizontal',
    group: 'LandEntranceExit',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landEntranceExitTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landEntranceExitType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'landEntranceExitType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

// Condo government price — per SQUARE METRE (unlike land's per-Sq.Wa), since a condo
// unit's title doesn't carry a Rai/Ngan/Sq.Wa land area. governmentPrice is computed
// (pricePerSqm × usableArea) and locked, mirroring landtitlesFields' governmentPrice.
export const condoGovernmentPriceFields: FormField[] = [
  {
    name: 'isMissingFromSurvey',
    label: 'Missed out on the survey',
    type: 'boolean-toggle',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'number-input',
    label: 'Government Price per Sq.M',
    name: 'governmentPricePerSqm',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 16,
    decimalPlaces: 2,
    disableWhen: { field: 'isMissingFromSurvey', is: true },
    disabledValue: 0,
  },

  {
    type: 'number-input',
    label: 'Government Price',
    name: 'governmentPrice',
    wrapperClassName: 'col-span-6',
    disabled: true,
    maxIntegerDigits: 16,
    decimalPlaces: 2,
  },
];

// Condo building insurance — unlike Government Price, this is NOT computed client-side.
// buildingInsurancePrice (rate × usableArea) is derived and locked server-side from the
// selected fireInsuranceCondition; the client only posts fireInsuranceCondition and
// displays whatever buildingInsurancePrice the GET response returns. See CondoDetailForm.
export const condoBuildingInsuranceFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Fire Insurance Condition',
    name: 'fireInsuranceCondition',
    // Populated at render time from useFireInsuranceOptions('Condo') — see CondoDetailForm.
    options: [],
    wrapperClassName: 'col-span-6',
  },

  {
    type: 'number-input',
    label: 'Building Insurance Price',
    name: 'buildingInsurancePrice',
    wrapperClassName: 'col-span-6',
    disabled: true,
    maxIntegerDigits: 16,
    decimalPlaces: 2,
  },
];

// --- Merged Land sections ---
export const roadAndSurfaceField: FormField[] = [...roadField, ...roadSurfaceField];

export const landAccessAndUtilityField: FormField[] = [
  ...publicUtilityField,
  ...landUseField,
  ...landEntranceField,
  ...transpotationField,
];

export const assessmentField: FormField[] = [
  ...anticipationProsperityField,
  ...evictionField,
  ...allocationField,
];

// --- Merged Building sections ---
export const materialAndStyleField: FormField[] = [
  ...buildingMaterialField,
  ...buildingStyleField,
  ...constructionStyleField,
];

export const roofAndCeilingField: FormField[] = [...roofFrameField, ...roofField, ...ceilingField];

export const constructionAndUseField: FormField[] = [
  ...fenceField,
  ...constTypeFeild,
  ...utilizationFeild,
];

export const interiorWallFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Interior Wall',
    name: 'interiorWallType',
    orientation: 'horizontal',
    group: 'Interior',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'interiorWallTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'interiorWallType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'interiorWallType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const exteriorWallFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Exterior Wall',
    name: 'exteriorWallType',
    orientation: 'horizontal',
    group: 'Exterior',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'exteriorWallTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'exteriorWallType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'exteriorWallType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

// --- Merged Condo sections ---
export const condoDecorationAndStructureFields: FormField[] = [
  ...condoDecorationFields,
  ...ageHeightCondoFields,
];

export const buildingDesignFields: FormField[] = [
  ...buildingFormFields,
  ...constructionMaterialsFormFields,
  ...condoRoomLayoutFormFields,
  ...locationViewFormFields,
];

export const facilitiesAndEnvironmentFields: FormField[] = [
  ...condoFacilityFields,
  ...environmentFields,
];

export const groundFloorFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Ground Flooring Materials',
    name: 'groundFloorMaterialType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'GroundFlooringMaterials',
    variant: 'default',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'groundFloorMaterialTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'groundFloorMaterialType', is: '99' },
    requiredWhen: { field: 'groundFloorMaterialType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const upperFloorFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Upper Flooring Materials',
    name: 'upperFloorMaterialType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'UpperFlooringMaterials',
    variant: 'default',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'upperFloorMaterialTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'upperFloorMaterialType', is: '99' },
    requiredWhen: { field: 'upperFloorMaterialType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const bathroomFloorFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Bathroom Flooring Materials',
    name: 'bathroomFloorMaterialType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'BathroomFlooringMaterials',
    variant: 'default',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'bathroomFloorMaterialTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'bathroomFloorMaterialType', is: '99' },
    requiredWhen: { field: 'bathroomFloorMaterialType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

// =============================================================================
// Machine fields (from MachineDetailForm.tsx)
// =============================================================================

export const machineInfoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-12',
    maxLength: 150,
  },

  {
    type: 'boolean-toggle',
    label: 'Check Owner',
    name: 'isOwnerVerified',
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-12',
    disableWhen: { field: 'isOwnerVerified', is: false },
    requiredWhen: { field: 'isOwnerVerified', is: true },
    disabledValue: 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้',
    maxLength: 100,
    help: {
      title: 'Locks automatically',
      lines: [
        'When Check Owner is "Can not" this field locks and is filled with the standard note.',
      ],
      conditions: [
        { text: 'Check Owner is "Can not"', when: { field: 'isOwnerVerified', is: false } },
      ],
      whenMet: 'Locked. Set Check Owner to "Can" to type here.',
    },
  },

  {
    type: 'text-input',
    label: 'Registration No.',
    name: 'registrationNumber',
    wrapperClassName: 'col-span-5',
    maxLength: 50,
    help: {
      title: 'This is the ร.2/1 booklet number',
      lines: [
        'The summary report folds machines carrying the same number into one line: "ตามสำเนาทะเบียนเครื่องจักร (ร.2/1) เลขที่ … จำนวน N เครื่อง".',
        'A registered machine with no number still counts in the header above that list, it just gets no line of its own.',
      ],
    },
  },

  // Registration & installation, carried over from the request title and editable here.
  // The appraiser sees the machine; the requestor only described it.
  {
    type: 'dropdown',
    label: 'Installation Status',
    name: 'installationStatus',
    wrapperClassName: 'col-span-4',
    group: 'MachineStatus',
    help: {
      title: 'Carried over from the request',
      lines: [
        'The requestor recorded this when the request was opened. Change it here if the site visit says otherwise.',
      ],
      conditions: [
        {
          text: 'Set to "under procurement" — Invoice No. becomes required and Price Certified locks to not appraised',
          when: { field: 'installationStatus', is: '2' },
        },
      ],
      whenMet: 'This rule is in effect right now.',
    },
  },

  {
    type: 'dropdown',
    label: 'Machine Type',
    name: 'machineType',
    wrapperClassName: 'col-span-3',
    group: 'MachineType',
    help: {
      title: 'Carried over from the request',
      lines: [
        'Classification only — nothing else depends on it.',
        'Appraisals created before this column existed are blank: the value was never stored, so it cannot be filled in retrospectively.',
      ],
    },
  },

  {
    type: 'boolean-toggle',
    label: 'Registration Status',
    name: 'registrationStatus',
    options: ['Unregistered', 'Registered'],
    wrapperClassName: 'col-span-4',
    help: {
      title: 'Carried over from the request',
      lines: [
        'Whether ownership of the machine has been registered. The summary report groups machines by this.',
      ],
      conditions: [
        {
          text: 'Unregistered — Price Certified locks to not appraised',
          when: { field: 'registrationStatus', is: false },
        },
      ],
      whenMet: 'This rule is in effect right now.',
    },
  },

  {
    type: 'text-input',
    label: 'Invoice No.',
    name: 'invoiceNumber',
    wrapperClassName: 'col-span-4',
    maxLength: 20,
    requiredWhen: { field: 'installationStatus', is: '2' },
    help: {
      title: 'Required while under procurement',
      lines: [
        'A machine that has not been delivered is priced from the supplier quotation or invoice, so the document number has to be on record.',
      ],
      conditions: [
        {
          text: 'Installation Status is "under procurement"',
          when: { field: 'installationStatus', is: '2' },
        },
      ],
      whenMet: 'Required right now.',
      whenClear: 'Optional right now.',
    },
  },

  // Certifying the price and appraising a value are one decision, not two: this flag is what the
  // summary report prints as "(ไม่ประเมินมูลค่า)". The server enforces the same two rules in
  // MachineryAppraisalDetail.NormalizePriceCertification, so the toggle only mirrors them.
  {
    type: 'boolean-toggle',
    label: 'Price Certified',
    name: 'isPriceCertified',
    options: ['Not Certified', 'Certified'],
    wrapperClassName: 'col-span-4',
    disabledValue: false,
    disableWhen: {
      match: 'any',
      conditions: [
        { field: 'registrationStatus', is: false },
        { field: 'installationStatus', is: '2' },
      ],
    },
    help: {
      title: 'Certifying the price is appraising the value',
      lines: [
        'One decision, not two: this is what the summary report prints as "(ไม่ประเมินมูลค่า)".',
        'The server forces it to not certified whenever either rule below is in effect.',
      ],
      conditions: [
        { text: 'Not registered', when: { field: 'registrationStatus', is: false } },
        { text: 'Under procurement', when: { field: 'installationStatus', is: '2' } },
      ],
      whenMet:
        'Locked. Enforced on the server: sending true straight to the API still stores false, without an error.',
      whenClear:
        'Your call. For a machine that is registered and installed, the appraiser decides whether to appraise a value.',
    },
  },

  {
    type: 'radio-group',
    label: 'Condition Use ',
    name: 'conditionUse',
    wrapperClassName: 'col-span-12',
    group: 'ConditionUse',
    orientation: 'horizontal',
    variant: 'button',
    help: {
      title: 'Shows up in the report',
      lines: [
        '"Not Found" appends "(สำรวจไม่พบ)" to this machine in the summary report and drops it from the surveyed count.',
      ],
      conditions: [
        { text: 'Condition Use is "Not Found"', when: { field: 'conditionUse', is: '03' } },
      ],
      whenMet: 'This rule is in effect right now.',
    },
  },

  {
    type: 'boolean-toggle',
    label: 'Can Use',
    name: 'isOperational',
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-3',
  },

  {
    type: 'text-input',
    label: 'Machinery Name',
    name: 'machineName',
    wrapperClassName: 'col-span-9',
    maxLength: 300,
  },

  {
    type: 'text-input',
    label: 'Brand',
    name: 'brand',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Model',
    name: 'model',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Series',
    name: 'series',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },

  {
    type: 'number-input',
    label: 'Year',
    name: 'yearOfManufacture',
    wrapperClassName: 'col-span-4',
    decimalPlaces: 0,
    maxIntegerDigits: 4,
    thousandSeparator: false,
  },

  {
    type: 'number-input',
    label: 'Quantity',
    name: 'quantity',
    wrapperClassName: 'col-span-4',
    decimalPlaces: 0,
    maxIntegerDigits: 6,
  },

  {
    type: 'parameter-search',
    label: 'Country of Manufacture',
    name: 'manufacturer',
    wrapperClassName: 'col-span-4',
    group: 'Country',
  },

  {
    type: 'date-input',
    label: 'Purchase Date',
    name: 'purchaseDate',
    wrapperClassName: 'col-span-4',
    disableFutureDates: true,
  },

  {
    type: 'number-input',
    label: 'Purchase Price',
    name: 'purchasePrice',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 15,
    decimalPlaces: 2,
  },

  {
    type: 'text-input',
    label: 'Location ',
    name: 'location',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Machinery Condition ',
    name: 'machineCondition',
    wrapperClassName: 'col-span-9',
    maxLength: 50,
  },

  {
    type: 'number-input',
    label: 'Machinery Age ',
    name: 'machineAge',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 0,
    maxIntegerDigits: 3,
  },

  {
    type: 'text-input',
    label: 'Usage Purpose',
    name: 'usagePurpose',
    wrapperClassName: 'col-span-6',
    maxLength: 300,
  },

  {
    type: 'text-input',
    label: 'Capacity',
    name: 'capacity',
    wrapperClassName: 'col-span-6',
    maxLength: 300,
  },

  {
    type: 'number-input',
    label: 'Width',
    name: 'width',
    wrapperClassName: 'col-span-2',
    maxIntegerDigits: 3,
  },

  {
    type: 'number-input',
    label: 'Length',
    name: 'length',
    wrapperClassName: 'col-span-2',
    maxIntegerDigits: 3,
  },

  {
    type: 'number-input',
    label: 'Height',
    name: 'height',
    wrapperClassName: 'col-span-2',
    maxIntegerDigits: 3,
  },

  {
    type: 'text-input',
    label: 'Machine Dimensions',
    name: 'machineDimensions',
    wrapperClassName: 'col-span-6',
    maxLength: 300,
  },

  {
    type: 'text-input',
    label: 'Energy Use',
    name: 'energyUse',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Machinery Efficiency ',
    name: 'machineEfficiency',
    wrapperClassName: 'col-span-6',
    maxLength: 50,
  },

  {
    type: 'text-input',
    label: 'Machinery Technology ',
    name: 'machineTechnology',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
  },

  {
    type: 'textarea',
    label: 'Machinery Parts',
    name: 'machineParts',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'other',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Remark ',
    name: 'remark',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Appraiser Opinion ',
    name: 'appraiserOpinion',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },
];

// =============================================================================

export const allLandFields: FormField[] = [
  ...landInfoField,
  ...landAddressFields,
  ...landDopaAddressFields,
  ...landInfoFieldTail,
  ...landLocationField,
  ...plotLocationField,
  ...landFillField,
  ...roadField,
  ...roadSurfaceField,
  ...publicUtilityField,
  ...landUseField,
  ...landEntranceField,
  ...transpotationField,
  ...anticipationProsperityField,
  ...expropriateField,
  ...encroachedField,
  ...LimitationOther,
  ...evictionField,
  ...allocationField,
  ...sizeAndBoundary,
  ...otherInformationField,
  ...remarkLandField,
];

export const allBuildingFields: FormField[] = [
  ...buildingInfoField,
  ...buildingTypeField,
  ...decorationField,
  ...encroachmentField,
  ...buildingMaterialField,
  ...buildingStyleField,
  ...isResidentialField,
  ...constructionStyleField,
  ...generalStructureField,
  ...roofFrameField,
  ...roofField,
  ...ceilingField,
  ...wallField,
  ...fenceField,
  ...constTypeFeild,
  ...buildingArea,
  ...utilizationFeild,
  ...remarkBuildingField,
];

export const allLandBuildingFields: FormField[] = [...allLandFields, ...allBuildingFields];

export const allCondoFields: FormField[] = [
  ...condoFields,
  ...condoAddressFields,
  ...condoDopaAddressFields,
  ...condoFieldsTail,
  ...condoLocationFields,
  ...condoLandCharacteristicsFields,
  ...condoGovernmentPriceFields,
  ...condoBuildingInsuranceFields,
  ...condoDecorationFields,
  ...ageHeightCondoFields,
  ...buildingFormFields,
  ...constructionMaterialsFormFields,
  ...condoRoomLayoutFormFields,
  ...locationViewFormFields,
  ...floorFormFields,
  ...roofFormFields,
  ...expropriationFields,
  ...condoFacilityFields,
  ...environmentFields,
  ...inForestBoundaryFormFields,
  ...remarkFormFields,
];

export const allMachineryFields: FormField[] = [...machineInfoFields];

export const allAppraisalFields: FormField[] = [
  ...allLandFields,
  ...allBuildingFields,
  ...allLandBuildingFields,
  ...allCondoFields,
];

// =============================================================================
// Land titles fields
// =============================================================================
export const landtitlesFields: FormField[] = [
  {
    name: 'titleType',
    label: 'Title Type',
    type: 'dropdown',
    group: 'DeedType',
    wrapperClassName: 'col-span-12',
    required: true,
  },

  {
    name: 'titleNumber',
    label: 'Title Number',
    type: 'text-input',
    wrapperClassName: 'col-span-12',
    required: true,
    maxLength: 200,
  },

  {
    name: 'bookNumber',
    label: 'Book Number',
    type: 'text-input',
    wrapperClassName: 'col-span-12',
    maxLength: 10,
    requiredWhen: {
      conditions: [
        { field: 'titleType', is: 'DEED' },
        { field: 'titleType', is: 'NS3' },
        { field: 'titleType', is: 'NS3K' },
        { field: 'titleType', is: 'NS3KO' },
      ],
      match: 'any',
    },
  },
  {
    name: 'pageNumber',
    label: 'Page Number',
    type: 'text-input',
    wrapperClassName: 'col-span-12',
    maxLength: 10,
    requiredWhen: {
      conditions: [
        { field: 'titleType', is: 'DEED' },
        { field: 'titleType', is: 'NS3' },
        { field: 'titleType', is: 'NS3K' },
        { field: 'titleType', is: 'NS3KO' },
      ],
      match: 'any',
    },
  },
  {
    name: 'rawang',
    label: 'Rawang',
    type: 'text-input',
    wrapperClassName: 'col-span-12',
    maxLength: 30,
    showWhen: { field: 'titleType', is: RAWANG_TITLE_TYPES, operator: 'in' },
    requiredWhen: { field: 'titleType', is: 'DEED' },
  },

  {
    name: 'landParcelNumber',
    label: 'Land Number',
    type: 'text-input',
    wrapperClassName: 'col-span-12',
    maxLength: 10,
    showWhen: { field: 'titleType', is: LAND_PARCEL_TITLE_TYPES, operator: 'in' },
    requiredWhen: {
      conditions: [
        { field: 'titleType', is: 'DEED' },
        { field: 'titleType', is: 'NS3K' },
      ],
      match: 'any',
    },
  },
  {
    name: 'surveyNumber',
    label: 'Survey Number',
    type: 'text-input',
    wrapperClassName: 'col-span-12',
    maxLength: 10,
    showWhen: { field: 'titleType', is: SURVEY_TITLE_TYPES, operator: 'in' },
    requiredWhen: { field: 'titleType', is: 'DEED' },
  },

  {
    name: 'mapSheetNumber',
    label: 'Sheet Number',
    type: 'text-input',
    wrapperClassName: 'col-span-12',
    maxLength: 10,
    showWhen: { field: 'titleType', is: AERIAL_TITLE_TYPES, operator: 'in' },
    requiredWhen: { field: 'titleType', is: 'NS3K' },
  },

  {
    name: 'aerialMapName',
    label: 'Aerial Photo Name',
    type: 'text-input',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showWhen: { field: 'titleType', is: AERIAL_TITLE_TYPES, operator: 'in' },
    requiredWhen: { field: 'titleType', is: 'NS3K' },
  },

  {
    name: 'aerialMapNumber',
    label: 'Aerial Photo Number',
    type: 'text-input',
    wrapperClassName: 'col-span-12',
    maxLength: 50,
    showWhen: { field: 'titleType', is: AERIAL_TITLE_TYPES, operator: 'in' },
    requiredWhen: { field: 'titleType', is: 'NS3K' },
  },

  {
    name: 'rai',
    label: 'Rai',
    type: 'number-input',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },

  {
    name: 'ngan',
    label: 'Ngan',
    type: 'number-input',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 0,
    maxIntegerDigits: 1,
    max: 3,
  },

  {
    name: 'squareWa',
    label: 'Sq.Wa',
    type: 'number-input',
    wrapperClassName: 'col-span-3',
    requiredWhen: {
      conditions: [
        { field: 'rai', operator: 'isEmpty' },
        { field: 'ngan', operator: 'isEmpty' },
      ],
      match: 'all',
    },
    decimalPlaces: 2,
    maxIntegerDigits: 2,
  },
  {
    name: 'totalSquareWa',
    label: 'Total Sq.Wa',
    type: 'number-input',
    wrapperClassName: 'col-span-3',
    disabled: true,
    decimalPlaces: 2,
  },

  {
    name: 'boundaryMarkerType',
    label: 'Boundary Marker',
    type: 'dropdown',
    group: 'BoundaryMarker',
    wrapperClassName: 'col-span-12',
  },

  {
    name: 'boundaryMarkerRemark',
    label: 'Boundary Other',
    type: 'textarea',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
    showWhen: { field: 'boundaryMarkerType', is: '99' },
  },

  {
    name: 'documentValidationResultType',
    label: 'Document Validate',
    type: 'radio-group',
    orientation: 'horizontal',
    variant: 'button',
    group: 'DocumentValidation',
    wrapperClassName: 'col-span-12',
    required: true,
  },

  {
    name: 'isMissingFromSurvey',
    label: 'Missed out on the survey',
    type: 'boolean-toggle',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-12',
  },

  {
    name: 'governmentPricePerSqWa',
    label: 'Government Price per Sq.Wa',
    type: 'number-input',
    wrapperClassName: 'col-span-12',
    maxIntegerDigits: 16,
    decimalPlaces: 2,
    // Missing-from-survey land has no government price → force to 0 and lock.
    // governmentPrice (computed = pricePerSqWa × totalSqWa) then follows to 0 automatically.
    disableWhen: { field: 'isMissingFromSurvey', is: true },
    disabledValue: 0,
  },

  {
    name: 'governmentPrice',
    label: 'Government Price',
    type: 'number-input',
    wrapperClassName: 'col-span-12',
    disabled: true,
    maxIntegerDigits: 16,
    decimalPlaces: 2,
  },
];

// =============================================================================
// PMA fields
// =============================================================================
export const pmaField: FormField[] = [
  {
    type: 'number-input',
    label: 'Selling Price',
    name: 'sellingPrice',
    wrapperClassName: 'col-span-3',
    required: true,
    maxIntegerDigits: 15,
    leftIcon: bahtPrefix,
  },

  {
    type: 'number-input',
    label: 'Force Selling Price',
    name: 'forcedSalePrice',
    wrapperClassName: 'col-span-3',
    required: true,
    maxIntegerDigits: 15,
    leftIcon: bahtPrefix,
  },

  {
    type: 'number-input',
    label: 'Building Insurance',
    name: 'buildingInsurancePrice',
    wrapperClassName: 'col-span-3',
    required: true,
    maxIntegerDigits: 15,
    leftIcon: bahtPrefix,
  },
];

// =============================================================================
// Land and building PMA fields
// =============================================================================

// 12-col grid (see LandBuildingPMAForm): text rows use col-span-4 (three per row); the land-area
// row (Rai/Ngan/Sq.Wa/Total) uses col-span-3 so the four fields are equal AND fill the full width.
export const landPmaTitleFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Title Number',
    name: 'titleNumber',
    wrapperClassName: 'col-span-4',
    required: true,
    maxLength: 200,
  },

  {
    type: 'text-input',
    label: 'Book Number',
    name: 'bookNumber',
    wrapperClassName: 'col-span-4',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Page Number',
    name: 'pageNumber',
    wrapperClassName: 'col-span-4',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Rawang',
    name: 'rawang',
    wrapperClassName: 'col-span-4',
    required: true,
    maxLength: 30,
  },

  {
    type: 'text-input',
    label: 'Land Number',
    name: 'landNumber',
    wrapperClassName: 'col-span-4',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Survey Number',
    name: 'surveyNumber',
    wrapperClassName: 'col-span-4',
    required: true,
    maxLength: 10,
  },
];

export const landPmaAreaFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Rai',
    name: 'areaRai',
    wrapperClassName: 'cas-inline col-span-3',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },

  {
    type: 'number-input',
    label: 'Ngan',
    name: 'areaNgan',
    wrapperClassName: 'cas-inline col-span-3',
    decimalPlaces: 0,
    maxIntegerDigits: 1,
    max: 3,
  },

  {
    type: 'number-input',
    label: 'Sq.Wa',
    name: 'areaSquareWa',
    wrapperClassName: 'cas-inline col-span-3',
    maxIntegerDigits: 3,
  },

  {
    // Read-only computed total (Rai*400 + Ngan*100 + Sq.Wa), kept in sync by a useWatch+useEffect
    // derive in LandBuildingPMAForm. Rai/Ngan/Sq.Wa are individually optional; the required-area
    // rule is enforced here via a superRefine (total > 0) in makeLandAndBuildingPMAForm.
    // 12-col grid: the four area fields each col-span-3 = 12 (equal, full-width row); text rows use
    // col-span-4, so Sub District/District/Province wrap to their own full-width row below.
    type: 'number-input',
    label: 'Total Sq.Wa',
    name: 'totalSquareWa',
    wrapperClassName: 'cas-inline col-span-3',
    disabled: true,
    decimalPlaces: 2,
  },
];

export const landPmaAddressFields: FormField[] = [
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'district',
    districtNameField: 'districtName',
    provinceField: 'province',
    provinceNameField: 'provinceName',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    addressSource: 'title',
    wrapperClassName: 'col-span-4',
    required: true,
  },

  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-4',
  },

  {
    type: 'text-input',
    label: 'Province',
    name: 'provinceName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-4',
  },
];

export const landAndBuildingPMAFields: FormField[] = [
  ...landPmaTitleFields,
  ...landPmaAreaFields,
  ...landPmaAddressFields,
];

// =============================================================================
// Condominium PMA fields
// =============================================================================
export const condoPmaDetailFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Condo Name',
    name: 'condoName',
    wrapperClassName: 'col-span-9',
    required: true,
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Room Number',
    name: 'roomNumber',
    wrapperClassName: 'col-span-9',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Floor Number',
    name: 'floorNumber',
    wrapperClassName: 'col-span-9',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Building Number',
    name: 'buildingNumber',
    wrapperClassName: 'col-span-9',
    required: true,
    maxLength: 30,
  },

  {
    type: 'text-input',
    label: 'Condo Registration Number',
    name: 'condoRegistrationNumber',
    wrapperClassName: 'col-span-9',
    required: true,
    maxLength: 10,
  },

  {
    type: 'textarea',
    label: 'Title Number',
    name: 'titleNumber',
    wrapperClassName: 'col-span-9',
    required: true,
    maxLength: 500,
    showCharCount: true,
  },
];

export const condoPmaAddressFields: FormField[] = [
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'district',
    districtNameField: 'districtName',
    provinceField: 'province',
    provinceNameField: 'provinceName',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    addressSource: 'title',
    wrapperClassName: 'col-span-5',
    required: true,
  },

  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-4',
  },

  {
    type: 'text-input',
    label: 'Province',
    name: 'provinceName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-3',
  },
];

export const condoPMAFields: FormField[] = [...condoPmaDetailFields, ...condoPmaAddressFields];

export const allCondoPMAFields: FormField[] = [...pmaField, ...condoPMAFields];

export const allLandAndBuildingPMAFields: FormField[] = [...pmaField, ...landAndBuildingPMAFields];

// =============================================================================
// Lease Agreement fields
// =============================================================================

export const leaseInfoField: FormField[] = [
  {
    type: 'text-input',
    label: 'Lessor Name',
    name: 'lessorName',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Lessee Name',
    name: 'lesseeName',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },
];

export const leaseContractField: FormField[] = [
  {
    type: 'number-input',
    label: 'Lease Period as Contract',
    name: 'leasePeriodAsContract',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 3,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Remaining Lease as Appraisal Date',
    name: 'remainingLeaseAsAppraisalDate',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 3,
    decimalPlaces: 2,
  },

  {
    type: 'text-input',
    label: 'Contract No',
    name: 'contractNo',
    wrapperClassName: 'col-span-12',
    maxLength: 40,
  },
];

export const leaseDatesFeesField: FormField[] = [
  {
    type: 'date-input',
    label: 'Lease Start Date',
    name: 'leaseStartDate',
    wrapperClassName: 'col-span-3',
  },

  {
    type: 'date-input',
    label: 'Lease End Date',
    name: 'leaseEndDate',
    wrapperClassName: 'col-span-3',
  },

  {
    type: 'number-input',
    label: 'Lease Rent Fee',
    name: 'leaseRentFee',
    wrapperClassName: 'col-span-3',
    maxIntegerDigits: 15,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Rent Adjust',
    name: 'rentAdjust',
    wrapperClassName: 'col-span-3',
    maxIntegerDigits: 15,
    decimalPlaces: 2,
  },
];

export const leaseTermsField: FormField[] = [
  {
    type: 'text-input',
    label: 'Sublease',
    name: 'sublease',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'number-input',
    label: 'Additional Expenses',
    name: 'additionalExpenses',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 15,
    decimalPlaces: 2,
  },

  {
    type: 'text-input',
    label: 'Lease Terminate',
    name: 'leaseTerminate',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Contract Renewal',
    name: 'contractRenewal',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },
];

export const leaseRentalTermsField: FormField[] = [
  {
    type: 'textarea',
    label: 'Rental Terms Impacting Property Use',
    name: 'rentalTermsImpactingPropertyUse',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Termination of Lease',
    name: 'terminationOfLease',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: true,
  },
];

export const leaseOtherField: FormField[] = [
  {
    type: 'textarea',
    label: 'Remark',
    name: 'remark',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },
];

export const allLeaseAgreementFields: FormField[] = [
  ...leaseInfoField,
  ...leaseContractField,
  ...leaseDatesFeesField,
  ...leaseTermsField,
  ...leaseRentalTermsField,
  ...leaseOtherField,
];

// =============================================================================
// Rental Info fields
// =============================================================================

export const rentalScheduleField: FormField[] = [
  {
    type: 'number-input',
    label: 'Number of Year',
    name: 'numberOfYears',
    wrapperClassName: 'col-span-3',
    maxIntegerDigits: 3,
    required: true,
  },

  {
    type: 'date-input',
    label: 'First Year Start From',
    name: 'firstYearStartDate',
    wrapperClassName: 'col-span-3',
    required: true,
  },

  {
    type: 'number-input',
    label: 'Contract Rental Fee per Year',
    name: 'contractRentalFeePerYear',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 2,
    maxIntegerDigits: 15,
    required: true,
  },

  {
    type: 'number-input',
    label: 'Up Front',
    name: 'upFrontTotalAmount',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 2,
    maxIntegerDigits: 15,
    required: true,
    allowZero: true,
  },
];

export const rentalGrowthPeriodField: FormField[] = [
  {
    type: 'number-input',
    label: 'Growth Rate %',
    name: 'growthRatePercent',
    wrapperClassName: 'col-span-12',
    maxIntegerDigits: 3,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Every (Year)',
    name: 'growthIntervalYears',
    wrapperClassName: 'col-span-12',
    maxIntegerDigits: 3,
    decimalPlaces: 0,
  },
];

// =============================================================================
// Machinery Summary fields (appraisal-level — global for all machines)
// Backend: MachineryAppraisalSummary (Section 3.1 general + Section 3.3 rights/legal)
// =============================================================================

/** Section 3.1 — General machinery (counts + condition) */
export const machinerySummaryGeneralFields: FormField[] = [
  {
    type: 'text-input',
    label: 'In Industrial Estate',
    name: 'inIndustrial',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
  },

  {
    type: 'number-input',
    label: 'Surveyed (no. of machines)',
    name: 'surveyedNumber',
    wrapperClassName: 'col-span-4',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },

  {
    type: 'number-input',
    label: 'Appraised (no. of machines)',
    name: 'appraisalNumber',
    wrapperClassName: 'col-span-4',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },

  {
    type: 'number-input',
    label: 'Installed & In Use',
    name: 'installedAndUseCount',
    wrapperClassName: 'col-span-4',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },

  {
    type: 'number-input',
    label: 'Appraised as Scrap',
    name: 'appraisalScrapCount',
    wrapperClassName: 'col-span-4',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },

  {
    type: 'number-input',
    label: 'Appraised by Document',
    name: 'appraisedByDocumentCount',
    wrapperClassName: 'col-span-4',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },

  {
    type: 'number-input',
    label: 'Not Installed',
    name: 'notInstalledCount',
    wrapperClassName: 'col-span-4',
    decimalPlaces: 0,
    maxIntegerDigits: 10,
  },

  {
    type: 'textarea',
    label: 'Maintenance',
    name: 'maintenance',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Exterior',
    name: 'exterior',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Performance',
    name: 'performance',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'boolean-toggle',
    label: 'Market Demand Available',
    name: 'marketDemandAvailable',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-12',
  },

  {
    // FSD = MAX (no cap) — no `maxLength`, intentionally unbounded.
    type: 'textarea',
    label: 'Market Demand',
    name: 'marketDemand',
    wrapperClassName: 'col-span-12',
    // Editable only when there IS market demand (toggle = Yes). Disabled when the
    // toggle is No or unset (default null); the value is cleared while disabled
    // (empty string keeps the textarea controlled so the display clears too).
    disableWhen: { field: 'marketDemandAvailable', is: true, operator: 'notEquals' },
    disabledValue: '',
  },
];

/** Section 3.3 — Rights & legal */
export const machinerySummaryLegalFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Proprietor',
    name: 'proprietor',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Owner',
    name: 'owner',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'textarea',
    label: 'Machine Address',
    name: 'machineAddress',
    wrapperClassName: 'col-span-12',
    maxLength: 500,
    showCharCount: true,
  },
  // Lat/Lon — matches the pattern used by land (landInfoField) and condo (condoFields) detail
  // forms: 6 decimal places, 3 integer digits, signed, ±90/±180 range. Required per
  // CA-527/528. Note this is a client-side requirement only: the backend declares
  // Latitude/Longitude as `decimal?` with no range validation, so records created through
  // other paths may still carry null coordinates.
  {
    type: 'number-input',
    label: 'Latitude',
    name: 'latitude',
    wrapperClassName: 'col-span-6',
    required: true,
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowNegative: true,
    allowZero: true,
    min: -90,
    max: 90,
  },

  {
    type: 'number-input',
    label: 'Longitude',
    name: 'longitude',
    wrapperClassName: 'col-span-6',
    required: true,
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowNegative: true,
    allowZero: true,
    min: -180,
    max: 180,
  },

  {
    type: 'textarea',
    label: 'Obligation',
    name: 'obligation',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'other',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: true,
  },
];

/** Combined — used to build the zod form schema */
export const allMachinerySummaryFields: FormField[] = [
  ...machinerySummaryGeneralFields,
  ...machinerySummaryLegalFields,
];

/**
 * Machinery Book Section 1 (วัตถุประสงค์และที่ตั้งเครื่องจักร) — three free-text intro fields,
 * distinct from Section 3.1/3.3 above. Labels here are placeholders for schema-building only
 * (buildFormSchema doesn't use `label` for validation) — MachineryBookSection1Tab.tsx renders
 * translated labels via `t('machineryBookSection1.fields.<name>')` instead.
 */
export const machineryBookSection1Fields: FormField[] = [
  {
    type: 'textarea',
    label: 'Assignment',
    name: 'assignment',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Valuation Purpose',
    name: 'valuationPurpose',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },

  {
    type: 'textarea',
    label: 'Property Characteristics',
    name: 'propertyCharacteristics',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },
];
