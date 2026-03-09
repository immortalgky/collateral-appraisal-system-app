import type { FieldArrayField, FormField } from '@/shared/components/form';

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
  },
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
    wrapperClassName: 'col-span-3',
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
  {
    type: 'dropdown',
    label: 'Land Office',
    name: 'landOffice',
    group: 'LandOffice',
    wrapperClassName: 'col-span-3',
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
    name: 'isOwnerVerified',
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-4',
    disableWhen: { field: 'isOwnerVerified', is: false },
    requiredWhen: { field: 'isOwnerVerified', is: true },
    disabledValue: 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้',
  },
  {
    type: 'boolean-toggle',
    label: 'Is Obligation',
    name: 'hasObligation',
    options: ['No Obligation', 'Mortgage as Security'],
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Obligation',
    name: 'obligationDetails',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasObligation', is: true },
    requiredWhen: { field: 'hasObligation', is: true },
    maxLength: 100,
  },
];

export const landLocationField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: '',
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
  },
  {
    type: 'text-input',
    label: 'Village',
    name: 'village',
    wrapperClassName: 'col-span-12',
    maxLength: 100,
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
    wrapperClassName: 'col-span-6',
    group: 'LandShape',
  },
  {
    type: 'dropdown',
    label: 'Type of urban plan',
    name: 'urbanPlanningType',
    wrapperClassName: 'col-span-6',
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
];

export const plotLocationField: FormField[] = [
  {
    type: 'checkbox-group',
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
    name: 'landFillType',
    orientation: 'horizontal',
    group: 'Landfill',
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
    label: 'Soil Level',
    name: 'soilLevel',
    wrapperClassName: 'col-span-6',
  },
];

export const roadField: FormField[] = [
  {
    type: 'number-input',
    label: 'Road Width',
    name: 'accessRoadWidth',
    wrapperClassName: 'col-span-6',
    maxIntegerDigits: 3,
  },
  {
    type: 'number-input',
    label: 'Right of Way',
    name: 'rightOfWay',
    wrapperClassName: 'col-span-6',
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
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },
  {
    type: 'radio-group',
    label: 'Land Accessibility',
    name: 'landAccessibilityType',
    orientation: 'horizontal',
    group: 'LandAccessibility',
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
    name: 'roadSurfaceType',
    orientation: 'horizontal',
    group: 'RoadSurface',
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
    name: 'propertyAnticipationType',
    orientation: 'horizontal',
    group: 'AnticipationOfProsperity',
    wrapperClassName: 'col-span-12',
  },
];

export const expropriateField: FormField[] = [
  {
    type: 'checkbox',
    name: 'isExpropriated',
    label: 'Is Expropriate',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'checkbox',
    name: 'isInExpropriationLine',
    label: 'In Line Expropriate',
    wrapperClassName: 'col-span-7',
  },
  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'royalDecree',
    wrapperClassName: 'col-span-3',
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
    wrapperClassName: 'col-span-9',
  },
  {
    type: 'number-input',
    label: 'Encraoched Area Sq.wa',
    name: 'encroachmentArea',
    wrapperClassName: 'col-span-3',
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

export const LimitationOther: FormField[] = [
  {
    type: 'checkbox',
    name: 'hasElectricity',
    label: 'Has Electricity',
    wrapperClassName: 'col-span-9',
  },
  {
    type: 'number-input',
    label: 'Distance',
    name: 'electricityDistance',
    wrapperClassName: 'col-span-3',
    disableWhen: { field: 'hasElectricity', is: false },
    maxIntegerDigits: 3,
  },
  {
    type: 'checkbox',
    label: 'Is Landlocked',
    name: 'isLandlocked',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'checkbox',
    label: 'Is Forest Boundary',
    name: 'isForestBoundary',
    wrapperClassName: 'col-span-3',
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

export const evictionField: FormField[] = [
  {
    type: 'checkbox-group',
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
    showWhen: { field: 'evictionStatusType', is: '99', operator: 'contains' },
    requiredWhen: { field: 'evictionStatusType', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const allocationField: FormField[] = [
  {
    type: 'radio-group',
    name: 'allocationType',
    orientation: 'horizontal',
    group: 'Allocation',
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
    type: 'checkbox',
    label: 'Has Building',
    name: 'hasBuilding',
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
];

export const remarkLandField: FormField[] = [
  {
    type: 'textarea',
    label: '',
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
    name: 'isOwnerVerified',
    required: true,
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-4',
    required: true,
    disableWhen: { field: 'isOwnerVerified', is: false },
    disabledValue: 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้',
  },
  {
    type: 'text-input',
    label: 'Construction on Title Deed No.',
    name: 'builtOnTitleNumber',
    wrapperClassName: 'col-span-5',
    required: true,
    maxLength: 200,
  },
  {
    type: 'radio-group',
    label: 'Building Condition',
    group: 'BuildingCondition',
    orientation: 'horizontal',
    name: 'buildingConditionType',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'boolean-toggle',
    label: 'Under Construction',
    name: 'isUnderConstruction',
    wrapperClassName: 'col-span-3',
    options: ['No', 'Yes'],
  },
  {
    type: 'number-input',
    label: 'Construction Completion (%)',
    name: 'constructionCompletionPercent',
    wrapperClassName: 'col-span-3',
    disableWhen: { field: 'isUnderConstruction', is: true },
  },
  {
    type: 'datetime-input',
    label: 'License Expiration Date',
    name: 'constructionLicenseExpirationDate',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'boolean-toggle',
    label: 'Is Appraise',
    name: 'isAppraisable',
    required: true,
    options: ['Not Appraise', 'Appraise'],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'boolean-toggle',
    label: 'Is Obligation',
    name: 'hasObligation',
    options: ['No Obligation', 'Mortgage as Security'],
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Obligation',
    name: 'obligationDetails',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasObligation', is: true },
    requiredWhen: { field: 'hasObligation', is: true },
    maxLength: 100,
  },
];

export const buildingTypeField: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingType',
    orientation: 'horizontal',
    group: 'BuildingType',
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
  },
  {
    type: 'number-input',
    label: 'Total Floor',
    name: 'numberOfFloors',
    wrapperClassName: 'col-span-2',
    required: true,
    maxIntegerDigits: 3,
    decimalPlaces: 1,
  },
];

export const decorationField: FormField[] = [
  {
    type: 'radio-group',
    name: 'decorationType',
    orientation: 'horizontal',
    group: 'Decoration',
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
    type: 'boolean-toggle',
    label: '',
    name: 'isEncroachingOthers',
    options: ['Is not Encroaching', 'Is Encroaching'],
    wrapperClassName: 'col-span-4 flex items-center',
  },
  {
    type: 'number-input',
    label: 'Encroaching Area',
    name: 'encroachingOthersArea',
    wrapperClassName: 'col-span-2',
    disableWhen: { field: 'isEncroachingOthers', is: false },
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
    name: 'buildingMaterialType',
    orientation: 'horizontal',
    group: 'BuildingMaterial',
    wrapperClassName: 'col-span-12',
  },
];

export const buildingStyleField: FormField[] = [
  {
    type: 'radio-group',
    name: 'buildingStyleType',
    orientation: 'horizontal',
    group: 'BuildingStyle',
    wrapperClassName: 'col-span-12',
  },
];

export const isResidentialField: FormField[] = [
  {
    type: 'boolean-toggle',
    label: '',
    name: 'isResidential',
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-10 flex items-center',
  },
  {
    type: 'number-input',
    label: 'Building Age',
    name: 'buildingAge',
    wrapperClassName: 'col-span-2',
    required: true,
    maxIntegerDigits: 3,
    decimalPlaces: 1,
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
    name: 'constructionStyleType',
    orientation: 'horizontal',
    group: 'ConstructionStyle',
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
    label: 'Interior',
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
    label: 'Exterior',
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
    name: 'constructionType',
    orientation: 'horizontal',
    group: 'ConstructionType',
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
  },
];

export const utilizationFeild: FormField[] = [
  {
    type: 'radio-group',
    name: 'utilizationType',
    orientation: 'horizontal',
    group: 'Utilization',
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
    wrapperClassName: 'col-span-4',
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
    type: 'number-input',
    label: 'Floor No',
    name: 'floorNumber',
    wrapperClassName: 'col-span-2',
    required: true,
    decimalPlaces: 0,
    maxIntegerDigits: 3,
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
    label: 'Model Name',
    name: 'modelName',
    wrapperClassName: 'col-span-4',
    required: true,
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Construction on Title Deed No',
    name: 'builtOnTitleNumber',
    wrapperClassName: 'col-span-4',
    required: true,
    maxLength: 200,
  },
  {
    type: 'text-input',
    label: 'Condominium Registration No',
    name: 'condoRegistrationNumber',
    wrapperClassName: 'col-span-4',
    required: true,
    maxLength: 10,
  },
  {
    type: 'number-input',
    label: 'Usable Area (Sqm)',
    name: 'usableArea',
    wrapperClassName: 'col-span-3',
    required: true,
    maxIntegerDigits: 5,
  },
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
    wrapperClassName: 'col-span-3',
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
  {
    type: 'number-input',
    label: 'Latitude',
    name: 'latitude',
    wrapperClassName: 'col-span-4',
    required: true,
    decimalPlaces: 6,
    maxIntegerDigits: 3,
  },
  {
    type: 'number-input',
    label: 'Longitude',
    name: 'longitude',
    wrapperClassName: 'col-span-4',
    required: true,
    decimalPlaces: 6,
    maxIntegerDigits: 3,
  },
  {
    type: 'dropdown',
    label: 'Land Office',
    name: 'landOffice',
    wrapperClassName: 'col-span-4',
    required: true,
    group: 'LandOffice',
  },
  {
    type: 'boolean-toggle',
    label: 'Check Owner',
    name: 'isOwnerVerified',
    required: true,
    options: ['Can not', 'Can'],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-4',
    requiredWhen: { field: 'isOwnerVerified', is: true },
    disableWhen: { field: 'isOwnerVerified', is: false },
    disabledValue: 'ไม่สามารถตรวจสอบกรรมสิทธิ์ได้',
  },
  {
    type: 'radio-group',
    label: 'Condominium Conditions',
    name: 'buildingConditionType',
    wrapperClassName: 'col-span-12',
    group: 'CondoCondition',
    orientation: 'horizontal',
  },
  {
    type: 'boolean-toggle',
    label: 'Is Obligation',
    name: 'hasObligation',
    wrapperClassName: 'col-span-12',
    options: ['No obligations', 'Mortgage as security'],
  },
  {
    type: 'text-input',
    label: 'Obligation',
    name: 'obligationDetails',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasObligation', is: true },
    requiredWhen: { field: 'hasObligation', is: true },
    maxLength: 100,
  },
  {
    type: 'boolean-toggle',
    label: 'Document Validation',
    name: 'isDocumentValidated',
    wrapperClassName: 'col-span-12',
    required: true,
    options: ['Not Consistent', 'Correctly Matched'],
  },
];

export const condoLocationFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'locationType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'CondoLocation',
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
    wrapperClassName: 'col-span-3',
    maxIntegerDigits: 8,
  },
  {
    type: 'number-input',
    label: 'Road Width',
    name: 'accessRoadWidth',
    wrapperClassName: 'col-span-3',
    maxIntegerDigits: 8,
  },
  {
    type: 'number-input',
    label: 'Right of Way',
    name: 'rightOfWay',
    wrapperClassName: 'col-span-3',
    decimalPlaces: 0,
  },
  {
    type: 'radio-group',
    label: 'Road Surface',
    name: 'roadSurfaceType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'Condo_RoadSurface',
  },
  {
    type: 'checkbox-group',
    label: 'Public Utility',
    name: 'publicUtilityType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'Condo_PublicUtility',
  },
  {
    type: 'textarea',
    label: 'Other',
    name: 'publicUtilityTypeOther',
    wrapperClassName: 'col-span-12',
    required: false,
    showWhen: { field: 'publicUtility', is: '99', operator: 'contains' },
    requiredWhen: { field: 'publicUtility', is: '99', operator: 'contains' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const condoDecorationFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'decorationType',
    wrapperClassName: 'col-span-12',
    required: true,
    orientation: 'horizontal',
    group: 'Decoration',
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
    wrapperClassName: 'col-span-4',
    maxIntegerDigits: 3,
    decimalPlaces: 1,
  },
  {
    type: 'number-input',
    label: 'Total Number of Floors',
    name: 'numberOfFloors',
    wrapperClassName: 'col-span-4',
    required: true,
    maxIntegerDigits: 3,
  },
];

export const buildingFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'buildingFormType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'BuildingForm',
  },
];

export const constructionMaterialsFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'constructionMaterialType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'ConstructionMaterials',
  },
];

export const condoRoomLayoutFormFields: FormField[] = [
  {
    type: 'radio-group',
    label: '',
    name: 'roomLayoutType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'RoomLayout',
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
    label: '',
    name: 'locationViewType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'LocationView',
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
    label: '',
    name: 'roofType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'Condo_Roof',
  },
  {
    type: 'textarea',
    label: 'Other',
    name: 'roofTypeOther',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofType', is: '99' },
    requiredWhen: { field: 'roofType', is: '99' },
    maxLength: 100,
    showCharCount: true,
  },
];

export const expropriationFields: FormField[] = [
  {
    type: 'checkbox',
    label: 'Is Expropriated',
    name: 'isExpropriated',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'checkbox',
    label: 'In Line Expropriated',
    name: 'isInExpropriationLine',
    wrapperClassName: 'col-span-7',
  },
  {
    type: 'text-input',
    label: 'Royal Decree',
    name: 'royalDecree',
    wrapperClassName: 'col-span-3',
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
    label: '',
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
  },
];

export const environmentFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: '',
    name: 'environmentType',
    wrapperClassName: 'col-span-12',
    orientation: 'horizontal',
    group: 'Environment',
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
    label: '',
    name: 'remark',
    wrapperClassName: 'col-span-12',
    maxLength: 4000,
    showCharCount: true,
  },
];

// =============================================================================

export const allLandFields: FormField[] = [
  ...landInfoField,
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
  ...condoLocationFields,
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

export const allAppraisalFields: FormField[] = [
  ...allLandFields,
  ...allBuildingFields,
  ...allLandBuildingFields,
  ...allCondoFields,
];
