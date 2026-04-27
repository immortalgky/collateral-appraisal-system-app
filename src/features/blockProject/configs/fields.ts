import type { FormField } from '@/shared/components/form';
import {
  CONDO_FACILITY_OPTIONS,
  CONDO_FIRE_INSURANCE_CONDITION_OPTIONS,
  CONDO_ROOM_LAYOUT_OPTIONS,
  CONDO_TOWER_CONDITION_OPTIONS,
  DECORATION_OPTIONS,
  DOCUMENT_VALIDATION_OPTIONS,
  FLOOR_MATERIAL_OPTIONS,
  LB_BUILDING_TYPE_OPTIONS,
  LB_DECORATION_TYPE_OPTIONS,
  LB_BUILDING_MATERIAL_TYPE_OPTIONS,
  LB_BUILDING_STYLE_TYPE_OPTIONS,
  LB_CONSTRUCTION_STYLE_TYPE_OPTIONS,
  LB_CONSTRUCTION_TYPE_OPTIONS,
  LB_UTILIZATION_TYPE_OPTIONS,
  LB_FIRE_INSURANCE_OPTIONS,
  LOCATION_METHOD_OPTIONS,
  QUALITY_OPTIONS,
  ROAD_SURFACE_OPTIONS,
  UTILITY_OPTIONS,
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
    placeholder: 'YYYY-MM-DD',
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
    label: 'Land Area (Rai)',
    name: 'landAreaRai',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Land Area (Ngan)',
    name: 'landAreaNgan',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Land Area (Wa)',
    name: 'landAreaWa',
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
    label: 'Location Number',
    name: 'locationNumber',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
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
  {
    type: 'text-input',
    label: 'Sub District',
    name: 'subDistrict',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'district',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'province',
    wrapperClassName: 'col-span-4',
    maxLength: 100,
  },
  {
    type: 'text-input',
    label: 'Postcode',
    name: 'postcode',
    wrapperClassName: 'col-span-4',
    maxLength: 10,
  },
  {
    type: 'number-input',
    label: 'Latitude',
    name: 'latitude',
    decimalPlaces: 6,
    allowNegative: true,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Longitude',
    name: 'longitude',
    decimalPlaces: 6,
    allowNegative: true,
    wrapperClassName: 'col-span-4',
  },
];

export const projectDetailFields: FormField[] = [
  {
    type: 'checkbox-group',
    label: 'Utilities',
    name: 'utilities',
    options: UTILITY_OPTIONS,
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
    showWhen: { field: 'utilities', is: 'Other', operator: 'contains' },
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
    options: FLOOR_MATERIAL_OPTIONS,
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
    showWhen: { field: 'groundFloorMaterialType', is: 'Other' },
    requiredWhen: { field: 'groundFloorMaterialType', is: 'Other' },
  },
  {
    type: 'radio-group',
    label: 'Upper Flooring Materials',
    name: 'upperFloorMaterialType',
    options: FLOOR_MATERIAL_OPTIONS,
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
    showWhen: { field: 'upperFloorMaterialType', is: 'Other' },
    requiredWhen: { field: 'upperFloorMaterialType', is: 'Other' },
  },
  {
    type: 'radio-group',
    label: 'Bathroom Flooring Materials',
    name: 'bathroomFloorMaterialType',
    options: FLOOR_MATERIAL_OPTIONS,
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
    showWhen: { field: 'bathroomFloorMaterialType', is: 'Other' },
    requiredWhen: { field: 'bathroomFloorMaterialType', is: 'Other' },
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
    options: CONDO_FACILITY_OPTIONS,
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
    showWhen: { field: 'facilities', is: 'Other', operator: 'contains' },
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
    type: 'text-input',
    label: 'Building Number',
    name: 'buildingNumber',
    required: true,
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },
  {
    type: 'textarea',
    label: 'Model Description',
    name: 'modelDescription',
    wrapperClassName: 'col-span-12',
    maxLength: 500,
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
    label: 'Standard Price (Baht/sq.m.)',
    name: 'standardPrice',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'boolean-toggle',
    label: 'Has Mezzanine',
    name: 'hasMezzanine',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Usable Area Min (sq.m.)',
    name: 'usableAreaMin',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Usable Area Max (sq.m.)',
    name: 'usableAreaMax',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-6',
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
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'radio-group',
    label: 'Room Layout',
    name: 'roomLayoutType',
    options: CONDO_ROOM_LAYOUT_OPTIONS,
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'text-input',
    label: 'Other Room Layout',
    name: 'roomLayoutTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roomLayoutType', is: 'Other' },
    requiredWhen: { field: 'roomLayoutType', is: 'Other' },
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
    type: 'number-input',
    label: 'Number of Units',
    name: 'numberOfUnits',
    required: true,
    decimalPlaces: 0,
    allowZero: true,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Number of Floors',
    name: 'numberOfFloors',
    required: true,
    decimalPlaces: 0,
    allowZero: true,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'text-input',
    label: 'Condo Registration Number',
    name: 'condoRegistrationNumber',
    required: true,
    wrapperClassName: 'col-span-6',
    maxLength: 100,
  },
];

export const condoTowerConditionFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Condition',
    name: 'conditionType',
    options: CONDO_TOWER_CONDITION_OPTIONS,
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
    options: DOCUMENT_VALIDATION_OPTIONS,
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
    options: ROAD_SURFACE_OPTIONS,
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
    showWhen: { field: 'roadSurfaceType', is: 'Other' },
    requiredWhen: { field: 'roadSurfaceType', is: 'Other' },
  },
];

export const condoTowerStructureFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Decoration',
    name: 'decorationType',
    options: DECORATION_OPTIONS,
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
    showWhen: { field: 'decorationType', is: 'Other' },
    requiredWhen: { field: 'decorationType', is: 'Other' },
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
    label: 'Total Number of Floors',
    name: 'totalNumberOfFloors',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'radio-group',
    label: 'Building Form',
    name: 'buildingFormType',
    options: QUALITY_OPTIONS,
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Construction Materials',
    name: 'constructionMaterialType',
    options: QUALITY_OPTIONS,
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
];

export const condoTowerFloorFields: FormField[] = [
  {
    type: 'radio-group',
    label: 'Ground Flooring',
    name: 'groundFloorMaterialType',
    options: FLOOR_MATERIAL_OPTIONS,
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
    showWhen: { field: 'groundFloorMaterialType', is: 'Other' },
    requiredWhen: { field: 'groundFloorMaterialType', is: 'Other' },
  },
  {
    type: 'radio-group',
    label: 'Upper Flooring',
    name: 'upperFloorMaterialType',
    options: FLOOR_MATERIAL_OPTIONS,
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
    showWhen: { field: 'upperFloorMaterialType', is: 'Other' },
    requiredWhen: { field: 'upperFloorMaterialType', is: 'Other' },
  },
  {
    type: 'radio-group',
    label: 'Bathroom Flooring',
    name: 'bathroomFloorMaterialType',
    options: FLOOR_MATERIAL_OPTIONS,
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
    showWhen: { field: 'bathroomFloorMaterialType', is: 'Other' },
    requiredWhen: { field: 'bathroomFloorMaterialType', is: 'Other' },
  },
];

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
    showWhen: { field: 'roofType', is: 'Other', operator: 'contains' },
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
    type: 'text-input',
    label: 'License Expiration Date',
    name: 'licenseExpirationDate',
    placeholder: 'YYYY-MM-DD',
    wrapperClassName: 'col-span-4',
  },
];

/**
 * LB facility field config.
 *
 * TODO(Phase 2): LB_FACILITY_OPTIONS uses `{ key, label }` shape but CheckboxOption
 * requires `{ value, label }`. Phase 2 must normalize LB_FACILITY_OPTIONS or use a
 * custom component. The checkbox-group field is omitted here to avoid a type mismatch;
 * Phase 2 will render facilities inline with a custom component.
 */
export const lbFacilityFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Other Facilities',
    name: 'facilitiesOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
  },
];

export const lbModelInfoFields: FormField[] = [
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
    type: 'number-input',
    label: 'Number of Houses',
    name: 'numberOfHouse',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Starting Price (THB)',
    name: 'startingPrice',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Usable Area Min (sq.m.)',
    name: 'usableAreaMin',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'number-input',
    label: 'Usable Area Max (sq.m.)',
    name: 'usableAreaMax',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-6',
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
    label: 'Land Area (Rai)',
    name: 'landAreaRai',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Land Area (Ngan)',
    name: 'landAreaNgan',
    decimalPlaces: 0,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Land Area (Wa)',
    name: 'landAreaWa',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'number-input',
    label: 'Standard Land Area (sq.w.)',
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
    options: LB_BUILDING_TYPE_OPTIONS,
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
    showWhen: { field: 'buildingType', is: 'Other' },
    requiredWhen: { field: 'buildingType', is: 'Other' },
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
    options: LB_DECORATION_TYPE_OPTIONS,
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
    showWhen: { field: 'decorationType', is: 'Other' },
    requiredWhen: { field: 'decorationType', is: 'Other' },
  },
  {
    type: 'radio-group',
    label: 'Building Material',
    name: 'buildingMaterialType',
    options: LB_BUILDING_MATERIAL_TYPE_OPTIONS,
    variant: 'button',
    orientation: 'horizontal',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'radio-group',
    label: 'Building Style',
    name: 'buildingStyleType',
    options: LB_BUILDING_STYLE_TYPE_OPTIONS,
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
    options: LB_CONSTRUCTION_STYLE_TYPE_OPTIONS,
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
    options: LB_CONSTRUCTION_TYPE_OPTIONS,
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
    showWhen: { field: 'constructionType', is: 'Other' },
  },
  {
    type: 'radio-group',
    label: 'Utilization Type',
    name: 'utilizationType',
    options: LB_UTILIZATION_TYPE_OPTIONS,
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
    showWhen: { field: 'utilizationType', is: 'Other' },
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
    showWhen: { field: 'structureType', is: 'Other', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Roof Frame Type',
    name: 'roofFrameTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofFrameType', is: 'Other', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Roof Type',
    name: 'roofTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'roofType', is: 'Other', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Ceiling Type',
    name: 'ceilingTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'ceilingType', is: 'Other', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Interior Wall Type',
    name: 'interiorWallTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'interiorWallType', is: 'Other', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Exterior Wall Type',
    name: 'exteriorWallTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'exteriorWallType', is: 'Other', operator: 'contains' },
  },
  {
    type: 'text-input',
    label: 'Other Fence Type',
    name: 'fenceTypeOther',
    placeholder: 'Please specify...',
    wrapperClassName: 'col-span-12',
    showWhen: { field: 'fenceType', is: 'Other', operator: 'contains' },
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

// Re-export option constants needed by Phase 2 form components that build on these configs.
// These are complex multi-select options not covered by the FormField[] arrays above.
export {
  LB_FLOOR_SURFACE_TYPE_OPTIONS,
  LB_FLOOR_STRUCTURE_TYPE_OPTIONS,
  LB_STRUCTURE_TYPE_OPTIONS,
  LB_ROOF_FRAME_TYPE_OPTIONS,
  LB_ROOF_TYPE_OPTIONS,
  LB_CEILING_TYPE_OPTIONS,
  LB_WALL_TYPE_OPTIONS,
  LB_FENCE_TYPE_OPTIONS,
  LB_FACILITY_OPTIONS,
  CONDO_ROOF_OPTIONS,
} from '../data/options';
