import { createElement } from 'react';
import {
  booleanChips,
  type ConditionFn,
  type FormField,
  type FormFieldItem,
} from '@/shared/components/form';
import {
  AERIAL_TITLE_TYPES,
  LAND_PARCEL_TITLE_TYPES,
  RAWANG_TITLE_TYPES,
  SURVEY_TITLE_TYPES,
} from '@/shared/constants/titleTypes';
import { requiredUnlessDevelopmentOnly } from '../utils/developmentOnlyBuilding';
import { obligationFields } from './obligationFields';

// Re-exported so the Data Correction labels (read from every export of this file) include them.
export { obligationFields };

/** ฿ left-adornment for currency number-inputs (Land + Condo PMA prices). */
const bahtPrefix = createElement('span', { className: 'text-sm text-(--palette-gray-400)' }, '฿');

/** Prefix all field names for schema building (short → full dotted path). */
export function prefixFields(fields: FormField[], prefix: string): FormField[] {
  return fields.map(f => ({ ...f, name: `${prefix}.${f.name}` }));
}

// =============================================================================
// Land fields (from LandDetailForm.tsx)
// =============================================================================

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
    wrapperClassName: 'col-span-6',
    required: true,
  },
  // Display fields (autopopulated by location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    wrapperClassName: 'col-span-3',
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
    wrapperClassName: 'col-span-6',
    required: true,
  },
  // Display fields (autopopulated by dopa location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'dopaDistrictName',
    disabled: true,
    wrapperClassName: 'col-span-3',
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
    maxLength: 4000,
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

  ...obligationFields,
];

export const landLocationField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Land Location Verified',
    name: 'isLandLocationVerified',
    options: ['Incorrect', 'Correct'],
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'checkbox-group',
    label: 'Check By',
    name: 'landCheckMethodType',
    orientation: 'horizontal',
    group: 'CheckBy',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landCheckMethodTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landCheckMethodType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'landCheckMethodType', is: '99', operator: 'contains' },
    maxLength: 100,
  },

  {
    type: 'textarea',
    label: 'Land Location Remark',
    name: 'landLocationRemark',
    wrapperClassName: 'col-span-12',
    // Why the position is not correct: offered while the verdict is "Incorrect", never required
    // (the verdict starts at Incorrect, so a required remark would block every new land).
    showWhen: { field: 'isLandLocationVerified', is: false },
    maxLength: 4000,
    showCharCount: true,
    rows: 4,
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
    suffix: 'm',
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
    type: 'radio-group',
    label: 'Land Shape',
    name: 'landShapeType',
    orientation: 'horizontal',
    variant: 'button',
    wrapperClassName: 'col-span-12',
    group: 'LandShape',
    // Retired options are left out; a record that still holds one keeps showing it as selected.
    activeOnly: true,
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'landShapeTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'landShapeType', is: '99' },
    requiredWhen: { field: 'landShapeType', is: '99' },
    maxLength: 100,
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
  },

  {
    type: 'number-input',
    label: 'Landfill ( % )',
    name: 'landFillPercent',
    suffix: 'percent',
    // Filled (and overwritten) when the appraiser picks the condition: 02 filled = 100, 03 not filled = 0.
    defaultWhen: {
      field: 'landFillType',
      cases: [
        { is: '02', value: 100 },
        { is: '03', value: 0 },
      ],
    },
    wrapperClassName: 'col-span-6',
    decimalPlaces: 2,
    maxIntegerDigits: 3,
    max: 100,
  },

  {
    type: 'number-input',
    label: 'Soil Level ( m )',
    name: 'soilLevel',
    suffix: 'm',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
    decimalPlaces: 2,
    allowNegative: true,
  },
];

export const roadField: FormField[] = [
  {
    type: 'number-input',
    label: 'Carriageway Width (m)',
    name: 'carriagewayWidth',
    suffix: 'm',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Right-of-way Width (m)',
    name: 'rightOfWayWidth',
    suffix: 'm',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Number of Lanes',
    name: 'numberOfLanes',
    suffix: 'lane',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
    decimalPlaces: 0,
  },

  {
    type: 'number-input',
    label: 'Wide frontage of land adjacent to the road',
    name: 'roadFrontage',
    suffix: 'm',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 3,
  },

  {
    type: 'number-input',
    label: 'Number of sides facing the road',
    name: 'numberOfSidesFacingRoad',
    suffix: 'side',
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
  },

  {
    type: 'radio-group',
    label: 'Development Suitability',
    name: 'developmentSuitabilityType',
    orientation: 'horizontal',
    group: 'DevelopmentSuitability',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },
];

// Drawn by UrbanPlanningColorField (colour cards), not by FormFields; kept here so the schema, the
// correction labels and the missing-field check read them like any other field.
export const urbanPlanningColorFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Urban Planning Color',
    name: 'urbanPlanningColor',
    group: 'UrbanPlanningColor',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'text-input',
    label: 'Other',
    name: 'urbanPlanningColorOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'urbanPlanningColor', is: '99' },
    requiredWhen: { field: 'urbanPlanningColor', is: '99' },
    maxLength: 100,
  },
];

// "Located in an expropriation map sheet" (isExpropriated and its remark) is no longer asked on any form. Both stay here,
// unrendered and with no rule, so the schema declares them and a stored value goes back untouched on
// save (as with encroachmentRemark below): the forms simply do not pick them.
export const expropriateField: FormField[] = [
  {
    type: 'boolean-toggle',
    name: 'isExpropriated',
    label: 'Is Expropriate',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
  },

  {
    type: 'textarea',
    label: 'Is Expropriated',
    name: 'expropriationRemark',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },

  {
    type: 'boolean-toggle',
    name: 'isInExpropriationLine',
    label: 'In Line Expropriate',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
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

  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'royalDecree',
    wrapperClassName: 'col-span-12',
    // The decree belongs to the expropriation line: it opens with it and is cleared when it is No.
    showWhen: { field: 'isInExpropriationLine', is: true },
    maxLength: 200,
  },
];

export const encroachedField: FormField[] = [
  {
    type: 'boolean-toggle',
    name: 'isEncroached',
    label: 'Is Encroached',
    wrapperClassName: 'col-span-6',
    options: ['No', 'Yes'],
  },

  // The deducted area is no longer typed here — it is the sum of the LandAreaDeductionTable rows,
  // which the land form renders right under this group. The legacy field stays in the payload but
  // is not what the appraisal prices against.

  {
    type: 'textarea',
    label: 'Is Encroached',
    name: 'encroachmentRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isEncroached', is: true },
    // No longer required: the detail now lives in the LandAreaDeductionTable rows, each with its
    // own remark, and this field is not rendered on the land form any more — so a `requiredWhen`
    // here blocked the save with an error the user had no field to satisfy.
    maxLength: 4000,
    showCharCount: true,
  },
];

export const electricityField: FormField[] = [
  {
    type: 'boolean-toggle',
    name: 'hasElectricity',
    // Yes = the plot lies far from the power line (the distance opens only then). The field name
    // says "has"; the meaning, and so the label, is "far from".
    label: 'Far from Power Distribution Line',
    wrapperClassName: 'col-span-6',
    options: ['No', 'Yes'],
  },

  {
    type: 'number-input',
    label: 'Distance from Electricity (m)',
    name: 'electricityDistance',
    suffix: 'm',
    wrapperClassName: 'col-span-6',
    // The distance opens only while the plot is far from the power line, and goes back to blank
    // (null) when it goes to No.
    showWhen: { field: 'hasElectricity', is: true },
    maxIntegerDigits: 3,
  },
];

export const landBoundaryField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Is Landlocked',
    name: 'isLandlocked',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
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
    type: 'boolean-toggle',
    label: 'Is Forest Boundary',
    name: 'isForestBoundary',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
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
    label: 'Other Limitations Found',
    name: 'otherLegalLimitations',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
    rows: 4,
  },
];

/**
 * "Others" under the limitations found: the text of `otherLegalLimitations` is asked while the chip
 * is on. There is no column for the chip: it is on while the text is not null (a blank text reads as
 * off), a pick writes '' (so the text is required) and a drop writes null (the text is hidden and
 * cleared). The land form only; the block project form keeps the plain textarea above.
 */
const hasOtherLegalLimitations: ConditionFn = Object.assign(
  (values: Record<string, unknown>) => values.otherLegalLimitations != null,
  { deps: ['otherLegalLimitations'] },
);
const otherLegalLimitationsPlain = landBoundaryField.find(f => f.name === 'otherLegalLimitations')!;
export const otherLegalLimitationsField: FormField = {
  ...otherLegalLimitationsPlain,
  showWhen: hasOtherLegalLimitations,
  requiredWhen: hasOtherLegalLimitations,
};
export const otherLegalLimitationsChip: FormField = {
  ...otherLegalLimitationsPlain,
  label: 'Others',
  chip: {
    isOn: value => value != null,
    on: '',
    off: null,
    labelKey: 'otherLegalLimitationsChip',
  },
};

/** @deprecated Use electricityField + landBoundaryField instead */
export const LimitationOther: FormField[] = [...electricityField, ...landBoundaryField];

/** Shown while at least one right-restriction chip is picked (no list operator: `isNotEmpty` is true for `[]`). */
const hasEvictionType: ConditionFn = Object.assign(
  (values: Record<string, unknown>) =>
    Array.isArray(values.evictionType) && values.evictionType.length > 0,
  { deps: ['evictionType'] },
);

export const evictionField: FormField[] = [
  {
    type: 'checkbox-group',
    // การรอนสิทธิ์: part of the plot is given over to a state utility (a high-voltage line, an
    // underground railway). The field keeps its old name; "Eviction" was a mistranslation.
    label: 'Right Restriction',
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
  },

  {
    type: 'textarea',
    label: 'Right Restriction Details',
    name: 'evictionRemark',
    wrapperClassName: 'col-span-12',
    // Optional: it opens with the first chip and clears when the last one goes.
    showWhen: hasEvictionType,
    maxLength: 4000,
    showCharCount: true,
    rows: 4,
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

/** "Rented out" under the obligations (land, land-and-building, condo). Pairs with useRentedOutFollowsLease. */
export const rentedOutField: FormField = {
  type: 'boolean-toggle',
  label: 'Rented Out',
  name: 'isRentedOut',
  options: ['No', 'Yes'],
  // Picking "tied to a lease" in the obligations sets it to Yes and locks it.
  disableWhen: { field: 'obligationType', is: '03', operator: 'contains' },
  disabledHint: 'Yes because "Tied to a lease" is picked.',
  wrapperClassName: 'col-span-12',
};

export const otherInformationField: FormField[] = [
  {
    type: 'number-input',
    label: 'Pond Area',
    name: 'pondArea',
    suffix: 'sqwa',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
  },

  {
    type: 'number-input',
    label: 'Depth of Pit',
    name: 'pondDepth',
    suffix: 'm',
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
    // Not asked on any form now, so it must not block a save: no requiredWhen.
    showWhen: { field: 'hasBuilding', is: true },
    maxLength: 100,
  },

  rentedOutField,
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
    disableWhen: { field: 'houseNumberStatus', is: '02' },
    disabledValue: '-',
    required: true,
    maxLength: 50,
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
    label: 'House Number Status',
    name: 'houseNumberStatus',
    wrapperClassName: 'col-span-12',
    keepSpan: true,
    group: 'HouseNumberStatus',
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
  },

  {
    type: 'boolean-toggle',
    label: 'Under Construction',
    name: 'isUnderConstruction',
    // Picking the condition "under construction" (BuildingCondition 04) turns it on; the appraiser
    // can still flip it, and nothing else moves it.
    defaultWhen: { field: 'buildingConditionType', cases: [{ is: '04', value: true }] },
    wrapperClassName: 'col-span-3',
    options: ['No', 'Yes'],
  },

  {
    type: 'text-input',
    label: 'Construction License No.',
    name: 'constructionLicenseNumber',
    wrapperClassName: 'col-span-6',
    maxLength: 50,
  },

  {
    type: 'date-input',
    label: 'License Expiration Date',
    name: 'constructionLicenseExpirationDate',
    wrapperClassName: 'col-span-6',
  },

  {
    type: 'boolean-toggle',
    label: 'Include Building in Valuation',
    name: 'isAppraisable',
    required: true,
    options: ['Exclude', 'Include'],
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Reason Not Appraised',
    name: 'notAppraisableReason',
    wrapperClassName: 'col-span-12',
    // Why the building is left out of the valuation: asked while it is excluded, cleared when it is
    // included again. Data entry only; no calculation reads it.
    showWhen: { field: 'isAppraisable', is: false },
    requiredWhen: { field: 'isAppraisable', is: false },
    maxLength: 4000,
    showCharCount: true,
    rows: 4,
  },

  ...obligationFields,
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
  },

  {
    type: 'number-input',
    label: 'Total Floor',
    name: 'numberOfFloors',
    suffix: 'floor',
    wrapperClassName: 'col-span-12',
    // Development-only buildings (every depreciation row non-building) have no floors to count.
    requiredWhen: requiredUnlessDevelopmentOnly,
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
  },
];

export const encroachmentField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Is Encroaching',
    name: 'isEncroachingOthers',
    wrapperClassName: 'col-span-6',
    options: ['No', 'Yes'],
  },

  {
    type: 'number-input',
    label: 'Encroaching Area',
    name: 'encroachingOthersArea',
    suffix: 'sqwa',
    wrapperClassName: 'col-span-6',
    // Opens with "Yes"; going back to "No" hides it and clears it to null (blank, not 0).
    showWhen: { field: 'isEncroachingOthers', is: true },
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
    suffix: 'year',
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
  },
];

// Kept apart from ceilingField / buildingArea: the block-project model form reads those and has no
// column for these yet.
export const buildingSizeField: FormField[] = [
  {
    type: 'number-input',
    label: 'Building Width (m.)',
    name: 'buildingWidth',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Building Length (m.)',
    name: 'buildingLength',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 5,
    decimalPlaces: 2,
  },

  {
    type: 'textarea',
    label: 'Space Division',
    name: 'spaceDivision',
    wrapperClassName: 'col-span-12',
    maxLength: 1000,
    showCharCount: true,
  },
];

export const buildingMaintenanceField: FormField[] = [
  {
    type: 'radio-group',
    label: 'Maintenance',
    group: 'BuildingMaintenance',
    orientation: 'horizontal',
    name: 'maintenanceType',
    variant: 'button',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'maintenanceTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'maintenanceType', is: '99' },
    requiredWhen: { field: 'maintenanceType', is: '99' },
    maxLength: 100,
  },
];

export const doorWindowField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Door',
    name: 'doorType',
    orientation: 'horizontal',
    group: 'Door',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'doorTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'doorType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'doorType', is: '99', operator: 'contains' },
    maxLength: 100,
  },

  {
    type: 'checkbox-group',
    label: 'Window',
    name: 'windowType',
    orientation: 'horizontal',
    group: 'Window',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'windowTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'windowType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'windowType', is: '99', operator: 'contains' },
    maxLength: 100,
  },
];

export const buildingServicesField: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Sanitary Ware',
    name: 'sanitaryType',
    orientation: 'horizontal',
    group: 'Sanitary',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'sanitaryTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'sanitaryType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'sanitaryType', is: '99', operator: 'contains' },
    maxLength: 100,
  },

  {
    type: 'checkbox-group',
    label: 'Building Systems',
    name: 'buildingSystemType',
    orientation: 'horizontal',
    group: 'BuildingSystem',
    wrapperClassName: 'col-span-12',
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'buildingSystemTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'buildingSystemType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'buildingSystemType', is: '99', operator: 'contains' },
    maxLength: 100,
  },
];

export const buildingArea: FormField[] = [
  {
    type: 'number-input',
    name: 'totalBuildingArea',
    suffix: 'sqm',
    label: 'Total Building Area (sq.m.)',
    wrapperClassName: 'col-span-12',
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
    suffix: 'sqm',
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
    // As on the building form: picking the condition "under construction" (04) turns it on.
    defaultWhen: { field: 'buildingConditionType', cases: [{ is: '04', value: true }] },
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
    wrapperClassName: 'col-span-6',
    required: true,
  },
  // Display fields (autopopulated by location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    wrapperClassName: 'col-span-3',
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
    wrapperClassName: 'col-span-6',
    required: true,
  },
  // Display fields (autopopulated by dopa location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'dopaDistrictName',
    disabled: true,
    wrapperClassName: 'col-span-3',
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
  },

  ...obligationFields,

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
    label: 'Unit Location',
    name: 'locationType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'CondoLocation',
    variant: 'button',
  },

  {
    type: 'textarea',
    label: 'Unit Location Remark',
    name: 'locationRemark',
    wrapperClassName: 'col-span-12',
    // Why the position is not correct (code '2'): optional, cleared when the code changes back.
    showWhen: { field: 'locationType', is: '2' },
    maxLength: 4000,
    showCharCount: true,
    rows: 4,
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
    suffix: 'm',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 5,
  },

  {
    type: 'number-input',
    label: 'Carriageway Width (m)',
    name: 'carriagewayWidth',
    suffix: 'm',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Right-of-way Width (m)',
    name: 'rightOfWayWidth',
    suffix: 'm',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Number of Lanes',
    name: 'numberOfLanes',
    suffix: 'lane',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
    decimalPlaces: 0,
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
  },
];

export const ageHeightCondoFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Building Age (Years)',
    name: 'buildingAge',
    suffix: 'year',
    wrapperClassName: 'col-span-12',
    maxIntegerDigits: 3,
    decimalPlaces: 1,
  },

  {
    type: 'number-input',
    label: 'Total Number of Floors',
    name: 'numberOfFloors',
    suffix: 'floor',
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
  },
];

// As on the land form (see expropriateField): isExpropriated and its remark are carried, not asked.
export const expropriationFields: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Is Expropriated',
    name: 'isExpropriated',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
  },

  {
    type: 'textarea',
    label: 'Is Expropriated',
    name: 'expropriationRemark',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },

  {
    type: 'boolean-toggle',
    label: 'In Line Expropriated',
    name: 'isInExpropriationLine',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
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

  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'royalDecree',
    wrapperClassName: 'col-span-12',
    // As on the land form: it opens with the expropriation line and is cleared when it is No.
    showWhen: { field: 'isInExpropriationLine', is: true },
    maxLength: 200,
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
  },
];

// Flood and pollution problems around the property (book section 1.5); land and condo share them.
export const environmentProblemFields: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Flood Problem',
    name: 'hasFloodProblem',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
  },

  {
    type: 'textarea',
    label: 'Flood Remark',
    name: 'floodProblemRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasFloodProblem', is: true },
    maxLength: 4000,
    showCharCount: true,
    rows: 4,
  },

  {
    type: 'boolean-toggle',
    label: 'Pollution Problem',
    name: 'hasPollutionProblem',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
  },

  {
    type: 'checkbox-group',
    label: 'Pollution Type',
    name: 'pollutionType',
    orientation: 'horizontal',
    group: 'Pollution',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasPollutionProblem', is: true },
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'pollutionTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'pollutionType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'pollutionType', is: '99', operator: 'contains' },
    maxLength: 100,
  },

  {
    type: 'textarea',
    label: 'Pollution Remark',
    name: 'pollutionProblemRemark',
    wrapperClassName: 'col-span-12',
    // Free text about the pollution, not required: it opens with the toggle and clears with it.
    showWhen: { field: 'hasPollutionProblem', is: true },
    maxLength: 4000,
    showCharCount: true,
    rows: 4,
  },

  {
    type: 'boolean-toggle',
    label: 'Other Environment Problem',
    name: 'hasOtherEnvironmentProblem',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
  },

  {
    type: 'textarea',
    label: 'Other Environment Problem Remark',
    name: 'otherEnvironmentProblemRemark',
    wrapperClassName: 'col-span-12',
    // What the problem is: asked for once the chip is on, and cleared with it.
    showWhen: { field: 'hasOtherEnvironmentProblem', is: true },
    requiredWhen: { field: 'hasOtherEnvironmentProblem', is: true },
    maxLength: 4000,
    showCharCount: true,
    rows: 4,
  },
];

/**
 * The problems as the forms lay them out: one chip row (flood, pollution, other; each chip is its
 * boolean, an unselected one is false), then what each chip opens, in chip order. Each block shows
 * only while its chip is on and clears when it goes off (showWhen). The sub-heading above the row is
 * `EnvironmentProblemsHeading`, drawn by the form.
 */
const environmentField = (name: string) => environmentProblemFields.find(f => f.name === name)!;
export const environmentProblemItems: FormFieldItem[] = [
  booleanChips('environmentProblems', 'Problems Found', [
    environmentField('hasFloodProblem'),
    environmentField('hasPollutionProblem'),
    environmentField('hasOtherEnvironmentProblem'),
  ]),
  environmentField('floodProblemRemark'),
  environmentField('pollutionType'),
  environmentField('pollutionTypeOther'),
  environmentField('pollutionProblemRemark'),
  environmentField('otherEnvironmentProblemRemark'),
];

export const inForestBoundaryFormFields: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Is In Forest Boundary',
    name: 'isForestBoundary',
    wrapperClassName: 'col-span-12',
    options: ['No', 'Yes'],
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
  },

  // The road passing the building and the ways of getting there: the land form's fields, reused.
  roadField.find(f => f.name === 'roadPassInFrontOfLand')!,
  ...transpotationField,
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
    suffix: 'baht',
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
    suffix: 'baht',
    wrapperClassName: 'col-span-6',
    disabled: true,
    maxIntegerDigits: 16,
    decimalPlaces: 2,
  },
];

// Condo building insurance — unlike Government Price, this is NOT computed client-side.
// buildingInsurancePrice (rate × usableArea) is derived and locked server-side from the
// selected fireInsuranceCode; the client only posts fireInsuranceCode and
// displays whatever buildingInsurancePrice the GET response returns. See CondoDetailForm.
export const condoBuildingInsuranceFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Fire Insurance Condition',
    name: 'fireInsuranceCode',
    // Populated at render time from useFireInsuranceOptions('Condo') — see CondoDetailForm.
    options: [],
    wrapperClassName: 'col-span-6',
  },

  {
    type: 'number-input',
    label: 'Building Insurance Price',
    name: 'buildingInsurancePrice',
    suffix: 'baht',
    wrapperClassName: 'col-span-6',
    disabled: true,
    maxIntegerDigits: 16,
    decimalPlaces: 2,
  },

  // buildingInsurancePriceOverride is NOT declared here — it renders as CondoInsuranceSummary,
  // the same Edited/Calculated band the building form shows, which a plain number-input cannot be.
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
  },
];

// =============================================================================
// Machine fields (from MachineDetailForm.tsx)
// =============================================================================

// Ordered the way an appraiser fills the form in: what the machine is, where it came from, who
// owns it and whether it may be valued, what condition it is in, where it sits and how big it is,
// then free text. Fields that are read together share a row; everything else gets its own.
export const machineInfoFields: FormField[] = [
  // ── The machine itself ──────────────────────────────────────────────────
  // One name, not two. `propertyName` and `machineName` are separate columns but held the same
  // text on every row that had both, and the form asked for it twice. `propertyName` is the one
  // kept: every property type has it, and the group cards, the property list and the pricing
  // analysis already read it first. maxLength matches the column — the old machineName field
  // allowed 300 into an nvarchar(200).
  {
    type: 'text-input',
    label: 'Machinery Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-12',
    maxLength: 200,
  },

  {
    type: 'dropdown',
    label: 'Machine Type',
    name: 'machineType',
    wrapperClassName: 'col-span-12',
    group: 'MachineType',
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
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  {
    type: 'number-input',
    label: 'Quantity',
    name: 'quantity',
    suffix: 'machine',
    wrapperClassName: 'col-span-6',
    decimalPlaces: 0,
    maxIntegerDigits: 6,
  },

  // ── Where it came from ──────────────────────────────────────────────────
  {
    type: 'parameter-search',
    label: 'Country of Manufacture',
    name: 'manufacturer',
    wrapperClassName: 'col-span-6',
    group: 'Country',
  },

  {
    type: 'number-input',
    label: 'Year',
    name: 'yearOfManufacture',
    suffix: 'be',
    wrapperClassName: 'col-span-6',
    decimalPlaces: 0,
    maxIntegerDigits: 4,
    thousandSeparator: false,
  },

  {
    type: 'date-input',
    label: 'Purchase Date',
    name: 'purchaseDate',
    wrapperClassName: 'col-span-6',
    disableFutureDates: true,
  },

  {
    type: 'number-input',
    label: 'Purchase Price',
    name: 'purchasePrice',
    suffix: 'baht',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 15,
    decimalPlaces: 2,
  },

  // ── Ownership, registration, and whether a value may be appraised ───────
  {
    type: 'boolean-toggle',
    label: 'Check Owner',
    name: 'isOwnerVerified',
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-12',
  },

  // Thai reads "ผู้ถือกรรมสิทธิ์" — the party that holds title, which is what the Check Owner
  // toggle above verifies. English stays "Owner", matching the OwnerName column.
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-12',
    disableWhen: { field: 'isOwnerVerified', is: false },
    requiredWhen: { field: 'isOwnerVerified', is: true },
    disabledValue: 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้',
    maxLength: 100,
  },

  // The status and the number it refers to, side by side. Both are carried over from the request
  // title and editable here: the appraiser sees the machine, the requestor only described it.
  {
    type: 'boolean-toggle',
    label: 'Registration Status',
    name: 'registrationStatus',
    options: ['Unregistered', 'Registered'],
    wrapperClassName: 'col-span-6',
  },

  {
    type: 'text-input',
    label: 'Registration No.',
    name: 'registrationNumber',
    wrapperClassName: 'col-span-6',
    maxLength: 50,
    // An unregistered machine has no registration number, so the field empties as well as greying
    // out. Without this the old number stayed in the box — and went on printing as
    // "ทะเบียนเลขที่ …" against a machine the report has just called unregistered.
    disableWhen: { field: 'registrationStatus', is: false },
    disabledValue: '',
  },

  // Same pairing: the invoice number only applies while the machine is under procurement, so it
  // sits beside the status that governs it, and empties with it. Disabled rather than hidden — the
  // field keeps its place in the layout instead of the row jumping as the status changes.
  //
  // English stays "Invoice No.", matching the InvoiceNumber column; Thai reads "เลขที่ใบเสนอราคา"
  // because the document a machine still being procured is priced from is a supplier quotation.
  // The two are meant to differ — do not "fix" one to match the other.
  {
    type: 'dropdown',
    label: 'Installation Status',
    name: 'installationStatus',
    wrapperClassName: 'col-span-6',
    group: 'MachineStatus',
  },

  {
    type: 'text-input',
    label: 'Invoice No.',
    name: 'invoiceNumber',
    wrapperClassName: 'col-span-6',
    maxLength: 20,
    disableWhen: { field: 'installationStatus', operator: 'notEquals', is: '2' },
    // Cleared, not preserved: a machine that is no longer under procurement has no quotation to
    // point at, so the column is emptied rather than left holding a number the record contradicts.
    // The domain enforces the same rule on every write (MachineryAppraisalDetail
    // .ClearInapplicableFields), so this only keeps the screen honest about what is stored.
    disabledValue: '',
    requiredWhen: { field: 'installationStatus', is: '2' },
  },

  // Certifying the price and appraising a value are one decision, not two: this flag is what the
  // summary report prints as "(ไม่ประเมินมูลค่า)". Always editable — the appraiser decides, and the
  // form does not infer it from the registration or installation status.
  {
    type: 'boolean-toggle',
    label: 'Price Certified',
    name: 'isPriceCertified',
    options: ['Not Certified', 'Certified'],
    wrapperClassName: 'col-span-12',
  },

  // ── Condition and use ───────────────────────────────────────────────────
  {
    type: 'radio-group',
    label: 'Condition Use ',
    name: 'conditionUse',
    wrapperClassName: 'col-span-12',
    group: 'ConditionUse',
    orientation: 'horizontal',
    variant: 'button',
  },

  {
    type: 'boolean-toggle',
    label: 'Can Use',
    name: 'isOperational',
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-6',
  },

  {
    type: 'text-input',
    label: 'Machinery Condition ',
    name: 'machineCondition',
    wrapperClassName: 'col-span-6',
    maxLength: 50,
  },

  {
    type: 'number-input',
    label: 'Machinery Age ',
    name: 'machineAge',
    suffix: 'year',
    wrapperClassName: 'col-span-6',
    decimalPlaces: 0,
    maxIntegerDigits: 3,
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

  // ── Where it sits, and how big it is ────────────────────────────────────
  {
    type: 'text-input',
    label: 'Location ',
    name: 'location',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
  },

  // The three measurements are one reading, so they stay on one row.
  {
    type: 'number-input',
    label: 'Width',
    name: 'width',
    suffix: 'm',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
  },

  {
    type: 'number-input',
    label: 'Length',
    name: 'length',
    suffix: 'm',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
  },

  {
    type: 'number-input',
    label: 'Height',
    name: 'height',
    suffix: 'm',
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
  },

  {
    type: 'text-input',
    label: 'Machine Dimensions',
    name: 'machineDimensions',
    wrapperClassName: 'col-span-12',
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
    label: 'Machinery Technology ',
    name: 'machineTechnology',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },

  // ── Free text ───────────────────────────────────────────────────────────
  // Same order the appraisal book prints them in (partials/section-machine.html): อื่นๆ,
  // ส่วนประกอบของเครื่องจักร, หมายเหตุ, ความเห็นผู้ประเมิน — so what the appraiser types top to
  // bottom comes out top to bottom.
  {
    type: 'textarea',
    label: 'Other',
    name: 'other',
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

/**
 * The details of the expropriation line, the forest line and the landlocked plot (the decree, their
 * remarks, and the landlocked flag), and the distance from the power line, are no longer asked on the
 * land and condo forms: the Law & Regulation tab holds the first. They stay in the schema as carriers, with no rules and never rendered,
 * so a stored value goes back untouched on save. The block project land form still asks them, so it
 * takes the originals back (`lawTabOriginalFields`).
 */
const LAW_TAB_CARRIED = [
  'royalDecree',
  'expropriationLineRemark',
  'forestBoundaryRemark',
  'isLandlocked',
  'landlockedRemark',
  // The distance from the power line is not asked either.
  'hasElectricity',
  'electricityDistance',
];
const asLawTabCarrier = (fields: FormField[]): FormField[] =>
  fields.map(f =>
    LAW_TAB_CARRIED.includes(f.name) ? { ...f, showWhen: undefined, requiredWhen: undefined } : f,
  );
export const lawTabOriginalFields = new Map(
  [...expropriateField, ...landBoundaryField, ...electricityField]
    .filter(f => LAW_TAB_CARRIED.includes(f.name))
    .map(f => [f.name, f]),
);

export const allLandFields: FormField[] = asLawTabCarrier([
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
  ...environmentFields,
  ...anticipationProsperityField,
  ...expropriateField,
  ...encroachedField,
  // The land form's "Others" chip opens the other-limitations text (otherLegalLimitationsField).
  ...LimitationOther.map(f =>
    f.name === 'otherLegalLimitations' ? otherLegalLimitationsField : f,
  ),
  ...evictionField,
  ...allocationField,
  ...sizeAndBoundary,
  ...otherInformationField,
  ...urbanPlanningColorFields,
  ...environmentProblemFields,
  ...remarkLandField,
]);

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
  ...doorWindowField,
  ...buildingServicesField,
  ...fenceField,
  ...constTypeFeild,
  ...buildingArea,
  ...buildingSizeField,
  ...buildingMaintenanceField,
  ...utilizationFeild,
  ...remarkBuildingField,
];

export const allLandBuildingFields: FormField[] = [...allLandFields, ...allBuildingFields];

export const allCondoFields: FormField[] = asLawTabCarrier([
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
  // The condo form's "Others" chip opens the other-limitations text, as on the land form.
  otherLegalLimitationsField,
  ...condoFacilityFields,
  ...environmentFields,
  ...urbanPlanningColorFields,
  ...environmentProblemFields,
  ...inForestBoundaryFormFields,
  ...remarkFormFields,
]);

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
    suffix: 'baht',
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
    suffix: 'baht',
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
// 12-col grid on both PMA forms: the three prices are col-span-4 so they share one row.
export const pmaField: FormField[] = [
  {
    type: 'number-input',
    label: 'Selling Price',
    name: 'sellingPrice',
    wrapperClassName: 'col-span-4',
    required: true,
    maxIntegerDigits: 15,
    leftIcon: bahtPrefix,
  },

  {
    type: 'number-input',
    label: 'Force Selling Price',
    name: 'forcedSalePrice',
    wrapperClassName: 'col-span-4',
    required: true,
    maxIntegerDigits: 15,
    leftIcon: bahtPrefix,
  },

  {
    type: 'number-input',
    label: 'Building Insurance',
    name: 'buildingInsurancePrice',
    wrapperClassName: 'col-span-4',
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
    wrapperClassName: 'col-span-3',
    decimalPlaces: 0,
    maxIntegerDigits: 5,
  },

  {
    type: 'number-input',
    label: 'Ngan',
    name: 'areaNgan',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 0,
    maxIntegerDigits: 1,
    max: 3,
  },

  {
    type: 'number-input',
    label: 'Sq.Wa',
    name: 'areaSquareWa',
    wrapperClassName: 'col-span-3',
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
    wrapperClassName: 'col-span-3',
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
    wrapperClassName: 'col-span-6',
    required: true,
  },

  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-3',
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
    wrapperClassName: 'col-span-12',
    required: true,
    maxLength: 100,
  },

  {
    type: 'text-input',
    label: 'Room Number',
    name: 'roomNumber',
    wrapperClassName: 'col-span-6',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Floor Number',
    name: 'floorNumber',
    wrapperClassName: 'col-span-6',
    required: true,
    maxLength: 10,
  },

  {
    type: 'text-input',
    label: 'Building Number',
    name: 'buildingNumber',
    wrapperClassName: 'col-span-6',
    required: true,
    maxLength: 30,
  },

  {
    type: 'text-input',
    label: 'Condo Registration Number',
    name: 'condoRegistrationNumber',
    wrapperClassName: 'col-span-6',
    required: true,
    maxLength: 10,
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
    wrapperClassName: 'col-span-6',
    required: true,
  },

  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-3',
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
    suffix: 'year',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 3,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Remaining Lease as Appraisal Date',
    name: 'remainingLeaseAsAppraisalDate',
    suffix: 'year',
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
    suffix: 'baht',
    wrapperClassName: 'col-span-3',
    maxIntegerDigits: 15,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Rent Adjust',
    name: 'rentAdjust',
    suffix: 'percent',
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
    suffix: 'baht',
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
  },

  {
    type: 'textarea',
    label: 'Termination of Lease',
    name: 'terminationOfLease',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
  },
];

export const leaseLegalField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Lease Registered',
    name: 'isLeaseRegistered',
    options: ['Not Registered', 'Registered'],
    nullable: true,
    wrapperClassName: 'col-span-6',
  },

  {
    type: 'boolean-toggle',
    label: 'Leasehold Pledgeable',
    name: 'isLeaseholdPledgeable',
    options: ['Not Allowed', 'Allowed'],
    nullable: true,
    wrapperClassName: 'col-span-6',
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
  ...leaseLegalField,
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
    suffix: 'year',
    decimalPlaces: 0,
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
    suffix: 'bahtPerYear',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 2,
    maxIntegerDigits: 15,
    required: true,
  },

  {
    type: 'number-input',
    label: 'Up Front',
    name: 'upFrontTotalAmount',
    suffix: 'baht',
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
    suffix: 'percent',
    wrapperClassName: 'col-span-3',
    maxIntegerDigits: 3,
    decimalPlaces: 2,
  },

  {
    type: 'number-input',
    label: 'Every (Year)',
    name: 'growthIntervalYears',
    suffix: 'year',
    wrapperClassName: 'col-span-3',
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
    showCharCount: false,
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
    type: 'text-input',
    label: 'Maintenance',
    name: 'maintenance',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: false,
  },

  {
    type: 'text-input',
    label: 'Exterior',
    name: 'exterior',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: false,
  },

  {
    type: 'text-input',
    label: 'Performance',
    name: 'performance',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: false,
  },

  {
    type: 'boolean-toggle',
    label: 'Market Demand Available',
    name: 'marketDemandAvailable',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-12',
  },

  {
    // FSD = MAX (no cap) — no `maxLength` here, so Textarea's own 4000-character default
    // applies. That makes this the roomiest box on the tab, and it is sized to match.
    // `!` beats Textarea's own min-h utility.
    type: 'textarea',
    className: '!min-h-[180px]',
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
    showCharCount: false,
  },

  {
    type: 'text-input',
    label: 'Owner',
    name: 'owner',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
    showCharCount: false,
  },

  {
    type: 'textarea',
    className: '!min-h-[180px]',
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
    type: 'text-input',
    label: 'Obligation',
    name: 'obligation',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
    showCharCount: false,
  },

  {
    type: 'textarea',
    label: 'Other',
    name: 'other',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
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
