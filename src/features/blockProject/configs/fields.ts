import type { FormField } from '@/shared/components/form';
import {
  CONDO_FIRE_INSURANCE_CONDITION_OPTIONS,
  LB_FIRE_INSURANCE_OPTIONS,
  LOCATION_METHOD_OPTIONS,
} from '../data/options';

// =============================================================================
// Shared Project Info fields
// =============================================================================

export const projectInformationFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Project Name',
    name: 'projectName',
    required: true,
    wrapperClassName: 'col-span-8',
    maxLength: 200,
  },
  {
    type: 'textarea',
    label: 'Project Description',
    name: 'projectDescription',
    wrapperClassName: 'col-span-12',
    maxLength: 500,
  },
  {
    type: 'text-input',
    label: 'Developer',
    name: 'developer',
    wrapperClassName: 'col-span-4',
    maxLength: 200,
  },
  {
    type: 'text-input',
    label: 'Project Sale Launch Date',
    name: 'projectSaleLaunchDate',
    placeholder: 'YYYY or YYYY-MM or YYYY-MM-DD',
    maxLength: 10,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'dropdown',
    label: 'Land Office',
    name: 'landOffice',
    group: 'LandOffice',
    required: true,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Rai',
    name: 'landAreaRai',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Ngan',
    name: 'landAreaNgan',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Square Wa',
    name: 'landAreaSquareWa',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Unit For Sale',
    name: 'unitForSaleCount',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Number of Phase',
    name: 'numberOfPhase',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
];

export const projectLocationFields: FormField[] = [
  {
    type: 'text-input',
    label: 'House Number',
    name: 'houseNumber',
    wrapperClassName: 'col-span-4',
    maxLength: 10,
  },
  {
    type: 'text-input',
    label: 'Road',
    name: 'road',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'soi',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  // Single autocomplete that fills sub-district, district, province, postcode codes
  // — and the matching display-name form fields below (mirrors the appraisal-side
  // `LocationSelector` pattern).
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'district',
    provinceField: 'province',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    districtNameField: 'districtName',
    provinceNameField: 'provinceName',
    wrapperClassName: 'col-span-4',
  },
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
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'text-input',
    label: 'Postcode',
    name: 'postcode',
    disabled: true,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Latitude',
    name: 'latitude',
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowNegative: true,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Longitude',
    name: 'longitude',
    decimalPlaces: 6,
    maxIntegerDigits: 3,
    allowNegative: true,
    wrapperClassName: 'col-span-4',
  },
];

export const projectDetailFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Utilities',
    name: 'utilities',
    group: 'PublicUtility',
    variant: 'tag',
    wrap: true,
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Utilities',
    name: 'utilitiesOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'utilities', is: '99', operator: 'contains' },
  },
  {
    type: 'checkbox-group',
    label: 'Facilities',
    name: 'facilities',
    group: 'Facilities',
    variant: 'tag',
    wrap: true,
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Facilities',
    name: 'facilitiesOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'facilities', is: '99', operator: 'contains' },
  },
  {
    type: 'textarea',
    label: 'Remark',
    name: 'remark',
    maxLength: 500,
    wrapperClassName: 'col-span-12',
  },
];

// =============================================================================
// Shared Pricing fields
// =============================================================================

export const pricingLocationSharedFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Location Method',
    name: 'locationMethod',
    options: LOCATION_METHOD_OPTIONS,
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'number-input',
    label: 'Corner (Baht)',
    name: 'cornerAdjustment',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Edge (Baht)',
    name: 'edgeAdjustment',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Other (Baht)',
    name: 'otherAdjustment',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
];

export const pricingForceSaleFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Force Sale Percentage (%)',
    name: 'forceSalePercentage',
    decimalPlaces: 2,
    min: 0,
    max: 100,
    wrapperClassName: 'col-span-6',
  },
];

// =============================================================================
// Shared Model fields (common to Condo + LandAndBuilding)
// =============================================================================

export const modelFloorMaterialFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Ground Flooring Materials',
    name: 'groundFloorMaterialType',
    group: 'GroundFlooringMaterials',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Ground Floor Material',
    name: 'groundFloorMaterialTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'groundFloorMaterialType', is: '99' },
    requiredWhen: { field: 'groundFloorMaterialType', is: '99' },
  },
  {
    type: 'radio-group',
    label: 'Upper Flooring Materials',
    name: 'upperFloorMaterialType',
    group: 'UpperFlooringMaterials',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Upper Floor Material',
    name: 'upperFloorMaterialTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'upperFloorMaterialType', is: '99' },
    requiredWhen: { field: 'upperFloorMaterialType', is: '99' },
  },
  {
    type: 'radio-group',
    label: 'Bathroom Flooring Materials',
    name: 'bathroomFloorMaterialType',
    group: 'BathroomFlooringMaterials',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Bathroom Floor Material',
    name: 'bathroomFloorMaterialTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'bathroomFloorMaterialType', is: '99' },
    requiredWhen: { field: 'bathroomFloorMaterialType', is: '99' },
  },
];

// =============================================================================
// Condo-specific fields (prefixed condo*)
// =============================================================================

export const condoProjectInfoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Built on Title Deed Number',
    name: 'builtOnTitleDeedNumber',
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },
];

export const condoFacilityFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Facilities',
    name: 'facilities',
    group: 'Facilities',
    variant: 'tag',
    wrap: true,
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Facilities',
    name: 'facilitiesOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'facilities', is: '99', operator: 'contains' },
  },
];

export const condoModelInfoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Model Name',
    name: 'modelName',
    required: true,
    wrapperClassName: 'col-span-6',
    maxLength: 200,
  },
  {
    type: 'textarea',
    label: 'Model Description',
    name: 'modelDescription',
    wrapperClassName: 'col-span-12',
    maxLength: 500,
  },
  {
    type: 'boolean-toggle',
    label: 'Has Mezzanine',
    name: 'hasMezzanine',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'number-input',
    label: 'Starting Price Min (THB)',
    name: 'startingPriceMin',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Starting Price Max (THB)',
    name: 'startingPriceMax',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Usable Area Min (sq.m.)',
    name: 'usableAreaMin',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Usable Area Max (sq.m.)',
    name: 'usableAreaMax',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Standard Usable Area (sq.m.)',
    name: 'standardUsableArea',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'dropdown',
    label: 'Fire Insurance Condition',
    name: 'fireInsuranceCondition',
    options: CONDO_FIRE_INSURANCE_CONDITION_OPTIONS,
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Room Layout',
    name: 'roomLayoutType',
    group: 'RoomLayout',
    variant: 'default',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Room Layout',
    name: 'roomLayoutTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roomLayoutType', is: '99' },
    requiredWhen: { field: 'roomLayoutType', is: '99' },
  },
  {
    type: 'textarea',
    label: 'Remark',
    name: 'remark',
    maxLength: 500,
    wrapperClassName: 'col-span-12',
  },
];

export const condoTowerInfoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Tower Name',
    name: 'towerName',
    wrapperClassName: 'col-span-6',
    maxLength: 200,
  },
  {
    type: 'text-input',
    label: 'Condo Registration Number',
    name: 'condoRegistrationNumber',
    required: true,
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },
  {
    type: 'number-input',
    label: 'Number of Units',
    name: 'numberOfUnits',
    required: true,
    decimalPlaces: 0,
    allowZero: true,
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Number of Floors',
    name: 'numberOfFloors',
    required: true,
    decimalPlaces: 0,
    allowZero: true,
    wrapperClassName: 'col-span-6',
  },
];

export const condoTowerConditionFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Condition',
    name: 'conditionType',
    group: 'BuildingCondition',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'boolean-toggle',
    label: 'Is Obligation',
    name: 'hasObligation',
    options: ['No obligations', 'Mortgage as security'],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Obligation Details',
    name: 'obligationDetails',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'hasObligation', is: true },
    requiredWhen: { field: 'hasObligation', is: true },
    maxLength: 200,
  },
  {
    type: 'radio-group',
    label: 'Document Validation',
    name: 'documentValidationType',
    group: 'DocumentValidation',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
];

export const condoTowerLocationFields: FormField[] = [
  {
    type: 'boolean-toggle',
    label: 'Location Correct',
    name: 'isLocationCorrect',
    options: ['Incorrect', 'Correct'],
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'number-input',
    label: 'Distance (m)',
    name: 'distance',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Road Width (m)',
    name: 'roadWidth',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Right of Way (m)',
    name: 'rightOfWay',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'radio-group',
    label: 'Road Surface',
    name: 'roadSurfaceType',
    group: 'Condo_RoadSurface',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Road Surface',
    name: 'roadSurfaceTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roadSurfaceType', is: '99' },
    requiredWhen: { field: 'roadSurfaceType', is: '99' },
  },
];

export const condoTowerStructureFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Decoration',
    name: 'decorationType',
    group: 'Decoration',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Decoration',
    name: 'decorationTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'decorationType', is: '99' },
    requiredWhen: { field: 'decorationType', is: '99' },
  },
  {
    type: 'number-input',
    label: 'Building Age',
    name: 'buildingAge',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'radio-group',
    label: 'Building Form',
    name: 'buildingFormType',
    group: 'BuildingForm',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Construction Materials',
    name: 'constructionMaterialType',
    group: 'ConstructionMaterials',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
];

/** Floor-material fields were removed from ProjectTower (backend decision §1a).
 *  They now live on ProjectModel only. Array kept as empty export to avoid
 *  import churn in schema/form files that still reference it. */
export const condoTowerFloorFields: FormField[] = [];

export const condoTowerRoofFields: FormField[] = [
  // NOTE: roofType is a z.array(z.string()) field declared separately in the form schema.
  // Rendered via custom CheckboxGroup in TowerDetailForm, NOT via FormFields.
  // Listed here for schema-completeness — do not add a 'checkbox-group' for 'roofType'.
  {
    type: 'text-input',
    label: 'Other Roof Type',
    name: 'roofTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofType', is: '99', operator: 'contains' },
  },
];

export const condoTowerLegalFields: FormField[] = [
  {
    type: 'checkbox',
    label: 'Is Expropriated',
    name: 'isExpropriated',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'checkbox',
    label: 'In Line Expropriated',
    name: 'isInExpropriationLine',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Royal Decree Reference',
    name: 'royalDecree',
    wrapperClassName: 'col-span-12',
    showWhen: {
      conditions: [
        { field: 'isExpropriated', is: true },
        { field: 'isInExpropriationLine', is: true },
      ],
      match: 'any',
    },
    maxLength: 200,
  },
  {
    type: 'text-input',
    label: 'Expropriation Remark',
    name: 'expropriationRemark',
    wrapperClassName: 'col-span-12',
    maxLength: 200,
  },
  {
    type: 'boolean-toggle',
    label: 'In Forest Boundary',
    name: 'isForestBoundary',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Forest Boundary Remark',
    name: 'forestBoundaryRemark',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'isForestBoundary', is: true },
    maxLength: 200,
  },
  {
    type: 'textarea',
    label: 'Remark',
    name: 'remark',
    maxLength: 500,
    wrapperClassName: 'col-span-12',
  },
];

export const condoPricingLocationFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Pool View (Baht)',
    name: 'poolViewAdjustment',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'South (Baht)',
    name: 'southAdjustment',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
];

export const condoPricingFloorFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Every X Floor',
    name: 'floorIncrementEveryXFloor',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Amount (Baht)',
    name: 'floorIncrementAmount',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-6',
  },
];

// =============================================================================
// LandAndBuilding-specific fields (prefixed lb*)
// =============================================================================

export const lbProjectInfoFields: FormField[] = [
  {
    type: 'date-input',
    label: 'License Expiration Date',
    name: 'licenseExpirationDate',
    wrapperClassName: 'col-span-4',
  },
];

export const lbFacilityFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Facilities',
    name: 'facilities',
    group: 'Facilities',
    variant: 'tag',
    wrap: true,
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Facilities',
    name: 'facilitiesOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'facilities', is: '99', operator: 'contains' },
  },
];

export const lbModelInfoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Model Name',
    name: 'modelName',
    required: true,
    wrapperClassName: 'col-span-12',
    maxLength: 200,
  },
  {
    type: 'textarea',
    label: 'Model Description',
    name: 'modelDescription',
    wrapperClassName: 'col-span-12',
    maxLength: 500,
  },
  // Row: numberOfHouse + startingPriceMin + startingPriceMax → 4+4+4 = 12
  {
    type: 'number-input',
    label: 'Number of Houses',
    name: 'numberOfHouse',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Starting Price Min (THB)',
    name: 'startingPriceMin',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Starting Price Max (THB)',
    name: 'startingPriceMax',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  // Row: usableAreaMin + usableAreaMax + standardUsableArea → 4+4+4 = 12
  {
    type: 'number-input',
    label: 'Usable Area Min (sq.m.)',
    name: 'usableAreaMin',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Usable Area Max (sq.m.)',
    name: 'usableAreaMax',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Standard Usable Area (sq.m.)',
    name: 'standardUsableArea',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Land Area Min (sq.wa)',
    name: 'landAreaMin',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Land Area Max (sq.wa)',
    name: 'landAreaMax',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Standard Land Area (sq.wa)',
    name: 'standardLandArea',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'dropdown',
    label: 'Fire Insurance Condition',
    name: 'fireInsuranceCondition',
    options: LB_FIRE_INSURANCE_OPTIONS,
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'textarea',
    label: 'Remark',
    name: 'remark',
    maxLength: 500,
    wrapperClassName: 'col-span-12',
  },
];

export const lbModelBuildingDetailFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Building Type',
    name: 'buildingType',
    group: 'BuildingType',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Building Type',
    name: 'buildingTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'buildingType', is: '99' },
    requiredWhen: { field: 'buildingType', is: '99' },
  },
  {
    type: 'number-input',
    label: 'Number of Floors',
    name: 'numberOfFloors',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'radio-group',
    label: 'Decoration',
    name: 'decorationType',
    group: 'Decoration',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Decoration',
    name: 'decorationTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'decorationType', is: '99' },
    requiredWhen: { field: 'decorationType', is: '99' },
  },
  {
    type: 'radio-group',
    label: 'Building Material',
    name: 'buildingMaterialType',
    group: 'BuildingMaterial',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Building Style',
    name: 'buildingStyleType',
    group: 'BuildingStyle',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'number-input',
    label: 'Construction Year',
    name: 'constructionYear',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Building Age',
    name: 'buildingAge',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'radio-group',
    label: 'Construction Style',
    name: 'constructionStyleType',
    group: 'ConstructionStyle',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Construction Style Remark',
    name: 'constructionStyleRemark',
    wrapperClassName: 'col-span-12',
    maxLength: 200,
  },
  {
    type: 'radio-group',
    label: 'Construction Type',
    name: 'constructionType',
    group: 'ConstructionType',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Construction Type',
    name: 'constructionTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'constructionType', is: '99' },
  },
  {
    type: 'radio-group',
    label: 'Utilization Type',
    name: 'utilizationType',
    group: 'Utilization',
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Utilization Type',
    name: 'utilizationTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'utilizationType', is: '99' },
  },
];

/**
 * LB model surface/structure fields (Roof, Ceiling, Walls, Fence).
 * NOTE: structureType, roofFrameType, roofType, ceilingType, interiorWallType,
 * exteriorWallType, fenceType are z.array(z.string()) fields; they are rendered
 * via custom CheckboxGroup components and are listed here only for awareness.
 * Do NOT add 'checkbox-group' entries for those multi-select arrays here —
 * handle in Phase 2 form components.
 */
export const lbModelStructureFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Other Structure Type',
    name: 'structureTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'structureType', is: '99', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Roof Frame Type',
    name: 'roofFrameTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofFrameType', is: '99', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Roof Type',
    name: 'roofTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofType', is: '99', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Ceiling Type',
    name: 'ceilingTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'ceilingType', is: '99', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Interior Wall Type',
    name: 'interiorWallTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'interiorWallType', is: '99', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Exterior Wall Type',
    name: 'exteriorWallTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'exteriorWallType', is: '99', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Fence Type',
    name: 'fenceTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'fenceType', is: '99', operator: 'contains' },
  },
];

export const lbModelSurfaceFields: FormField[] = [
  // Surfaces are complex nested objects (fromFloorNumber, toFloorNumber, floorType, etc.)
  // rendered as a dynamic field-array in Phase 2. Field config for floor surface sub-fields:
  // - floorType (free text), floorStructureType (LB_FLOOR_STRUCTURE_TYPE_OPTIONS),
  // - floorSurfaceType (LB_FLOOR_SURFACE_TYPE_OPTIONS).
  // These are not enumerated here as static FormField entries — use a custom FieldArray
  // component in Phase 2 that uses LB_FLOOR_SURFACE_TYPE_OPTIONS and LB_FLOOR_STRUCTURE_TYPE_OPTIONS.
];

export const lbPricingLocationFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Near Garden (Baht)',
    name: 'nearGardenAdjustment',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Land Increase/Decrease Rate (%)',
    name: 'landIncreaseDecreaseRate',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
];

// Re-export only option constants without a matching parameter group.
// LB floor surface/structure options have no `FloorSurface`/`FloorStructure`
// parameter group yet — keep as local options until backend exposes one.
export { LB_FLOOR_SURFACE_TYPE_OPTIONS, LB_FLOOR_STRUCTURE_TYPE_OPTIONS } from '../data/options';

// =============================================================================
// Project Land — block-owned copies of appraisal land configs
// =============================================================================
// Sections that need to differ from the per-asset appraisal flow are copied
// here so the block-project flow can evolve independently. Sections that are
// still identical to appraisal continue to import from `appraisal/configs/fields`
// inside `BlockLandDetailForm`; copy each one into this file when it needs
// to diverge.

/**
 * Land Information section for the project-land form.
 *
 * Differences from appraisal `landInfoField`:
 *   • No `latitude` / `longitude` (captured at the project level on Project Info).
 *   • No `landOffice` (same — single project-level land office on Project Info).
 */
export const projectLandInfoFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-12',
    maxLength: 150,
  },
  // Location selector (sub-district autocomplete that populates district, province, postcode).
  // Three fields fill the row 4+4+4 = 12 since lat/lon and Land Office are dropped here.
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
    wrapperClassName: 'col-span-4',
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
];
