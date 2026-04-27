import { buildFormSchema } from '@/shared/components/form/schemaBuilder';
import { z } from 'zod';
import type { ProjectType } from '../types';
import {
  projectInformationFields,
  projectLocationFields,
  projectDetailFields,
  condoProjectInfoFields,
  condoFacilityFields,
  condoModelInfoFields,
  modelFloorMaterialFields,
  condoTowerInfoFields,
  condoTowerConditionFields,
  condoTowerLocationFields,
  condoTowerStructureFields,
  condoTowerFloorFields,
  condoTowerRoofFields,
  condoTowerLegalFields,
  pricingLocationSharedFields,
  pricingForceSaleFields,
  condoPricingLocationFields,
  condoPricingFloorFields,
  lbProjectInfoFields,
  lbFacilityFields,
  lbModelInfoFields,
  lbModelBuildingDetailFields,
  lbModelStructureFields,
  lbPricingLocationFields,
} from '../configs/fields';

// =============================================================================
// Project Info Form
// =============================================================================

/**
 * Common base additions for project info (utilities + facilities as arrays).
 * Separated so both Condo and LB schemas can extend with type-specific fields.
 */
const projectInfoBase = z.object({
  utilities: z.array(z.string()).default([]),
  facilities: z.array(z.string()).default([]),
  // projectType is the discriminator (Condo | LandAndBuilding) stamped from the route prop
  // on submit via { ...data, projectType }. There is no user-facing dropdown for this field.
  projectType: z.string().nullable().optional(),
});

const condoProjectInfoAllFields = [
  ...projectInformationFields,
  ...condoProjectInfoFields,
  ...projectLocationFields,
  ...projectDetailFields,
  ...condoFacilityFields,
];

export const condoProjectInfoForm = buildFormSchema(condoProjectInfoAllFields, projectInfoBase);
export type CondoProjectInfoFormType = z.infer<typeof condoProjectInfoForm>;

export const condoProjectInfoFormDefaults: CondoProjectInfoFormType = {
  projectName: '',
  projectDescription: null,
  developer: null,
  projectSaleLaunchDate: null,
  landAreaRai: null,
  landAreaNgan: null,
  landAreaWa: null,
  unitForSaleCount: null,
  numberOfPhase: null,
  landOffice: '',
  projectType: '',
  locationNumber: null,
  road: null,
  soi: null,
  subDistrict: null,
  district: null,
  province: null,
  postcode: null,
  latitude: null,
  longitude: null,
  builtOnTitleDeedNumber: null,
  utilities: [],
  utilitiesOther: null,
  facilities: [],
  facilitiesOther: null,
  remark: null,
};

const lbProjectInfoAllFields = [
  ...projectInformationFields,
  ...lbProjectInfoFields,
  ...projectLocationFields,
  ...projectDetailFields,
  ...lbFacilityFields,
];

export const lbProjectInfoForm = buildFormSchema(lbProjectInfoAllFields, projectInfoBase);
export type LbProjectInfoFormType = z.infer<typeof lbProjectInfoForm>;

export const lbProjectInfoFormDefaults: LbProjectInfoFormType = {
  projectName: '',
  projectDescription: null,
  developer: null,
  projectSaleLaunchDate: null,
  landAreaRai: null,
  landAreaNgan: null,
  landAreaWa: null,
  unitForSaleCount: null,
  numberOfPhase: null,
  landOffice: '',
  projectType: '',
  locationNumber: null,
  road: null,
  soi: null,
  subDistrict: null,
  district: null,
  province: null,
  postcode: null,
  latitude: null,
  longitude: null,
  licenseExpirationDate: null,
  utilities: [],
  utilitiesOther: null,
  facilities: [],
  facilitiesOther: null,
  remark: null,
};

/**
 * Factory: returns the correct project-info schema based on projectType discriminator.
 */
export function projectInfoForm(projectType: ProjectType) {
  return projectType === 'Condo' ? condoProjectInfoForm : lbProjectInfoForm;
}

// =============================================================================
// Condo Model Form
// =============================================================================

const condoModelAreaDetailItem = z.object({
  id: z.string().nullable().optional(),
  areaDescription: z.string().nullable().optional(),
  areaSize: z.coerce.number().nullable().optional(),
});

const condoModelBase = z.object({
  areaDetails: z.array(condoModelAreaDetailItem).nullable().optional(),
});

const allCondoModelFields = [...condoModelInfoFields, ...modelFloorMaterialFields];

export const condoModelForm = buildFormSchema(allCondoModelFields, condoModelBase);
export type CondoModelFormType = z.infer<typeof condoModelForm>;

export const condoModelFormDefaults: CondoModelFormType = {
  modelName: '',
  modelDescription: null,
  buildingNumber: '',
  startingPriceMin: null,
  startingPriceMax: null,
  standardPrice: null,
  hasMezzanine: false,
  usableAreaMin: null,
  usableAreaMax: null,
  standardUsableArea: null,
  fireInsuranceCondition: null,
  roomLayoutType: null,
  roomLayoutTypeOther: null,
  groundFloorMaterialType: null,
  groundFloorMaterialTypeOther: null,
  upperFloorMaterialType: null,
  upperFloorMaterialTypeOther: null,
  bathroomFloorMaterialType: null,
  bathroomFloorMaterialTypeOther: null,
  remark: null,
  areaDetails: [],
};

// =============================================================================
// LB Model Form
// =============================================================================

const lbModelAreaDetailItem = z.object({
  id: z.string().nullable().optional(),
  areaDescription: z.string().nullable().optional(),
  areaSize: z.coerce.number().nullable().optional(),
});

const lbModelSurfaceItem = z.object({
  id: z.string().nullable().optional(),
  fromFloorNumber: z.coerce.number().nullable().optional(),
  toFloorNumber: z.coerce.number().nullable().optional(),
  floorType: z.string().nullable().optional(),
  floorStructureType: z.string().nullable().optional(),
  floorStructureTypeOther: z.string().nullable().optional(),
  floorSurfaceType: z.string().nullable().optional(),
  floorSurfaceTypeOther: z.string().nullable().optional(),
});

const lbModelDepreciationPeriodItem = z.object({
  id: z.string().nullable().optional(),
  atYear: z.coerce.number().nullable().optional(),
  toYear: z.coerce.number().nullable().optional(),
  depreciationPerYear: z.coerce.number().nullable().optional(),
  totalDepreciationPct: z.coerce.number().nullable().optional(),
  priceDepreciation: z.coerce.number().nullable().optional(),
});

const lbModelDepreciationDetailItem = z.object({
  id: z.string().nullable().optional(),
  depreciationMethod: z.string().nullable().optional(),
  areaDescription: z.string().nullable().optional(),
  area: z.coerce.number().nullable().optional(),
  year: z.coerce.number().nullable().optional(),
  isBuilding: z.boolean().nullable().optional(),
  pricePerSqMBeforeDepreciation: z.coerce.number().nullable().optional(),
  priceBeforeDepreciation: z.coerce.number().nullable().optional(),
  pricePerSqMAfterDepreciation: z.coerce.number().nullable().optional(),
  priceAfterDepreciation: z.coerce.number().nullable().optional(),
  depreciationYearPct: z.coerce.number().nullable().optional(),
  totalDepreciationPct: z.coerce.number().nullable().optional(),
  priceDepreciation: z.coerce.number().nullable().optional(),
  periods: z.array(lbModelDepreciationPeriodItem).nullable().optional(),
});

const lbModelBase = z.object({
  areaDetails: z.array(lbModelAreaDetailItem).nullable().optional(),
  surfaces: z.array(lbModelSurfaceItem).nullable().optional(),
  depreciationDetails: z.array(lbModelDepreciationDetailItem).nullable().optional(),
  // Multi-select array fields (rendered as custom CheckboxGroup in Phase 2)
  structureType: z.array(z.string()).nullable().optional(),
  roofFrameType: z.array(z.string()).nullable().optional(),
  roofType: z.array(z.string()).nullable().optional(),
  ceilingType: z.array(z.string()).nullable().optional(),
  interiorWallType: z.array(z.string()).nullable().optional(),
  exteriorWallType: z.array(z.string()).nullable().optional(),
  fenceType: z.array(z.string()).nullable().optional(),
  // Boolean fields not driven by FormField config
  isEncroachingOthers: z.boolean().nullable().optional(),
  isResidential: z.boolean().nullable().optional(),
  // Free-text fields not in FormField config (conditional on isEncroachingOthers / isResidential)
  encroachingOthersRemark: z.string().nullable().optional(),
  encroachingOthersArea: z.coerce.number().nullable().optional(),
  residentialRemark: z.string().nullable().optional(),
});

const allLbModelFields = [
  ...lbModelInfoFields,
  ...modelFloorMaterialFields,
  ...lbModelBuildingDetailFields,
  ...lbModelStructureFields,
];

export const lbModelForm = buildFormSchema(allLbModelFields, lbModelBase);
export type LbModelFormType = z.infer<typeof lbModelForm>;

export const lbModelFormDefaults = {
  modelName: '',
  modelDescription: null,
  numberOfHouse: null,
  startingPrice: null,
  standardPrice: null,
  usableAreaMin: null,
  usableAreaMax: null,
  standardUsableArea: null,
  landAreaRai: null,
  landAreaNgan: null,
  landAreaWa: null,
  standardLandArea: null,
  fireInsuranceCondition: null,
  groundFloorMaterialType: null,
  groundFloorMaterialTypeOther: null,
  upperFloorMaterialType: null,
  upperFloorMaterialTypeOther: null,
  bathroomFloorMaterialType: null,
  bathroomFloorMaterialTypeOther: null,
  remark: null,
  buildingType: null,
  buildingTypeOther: null,
  numberOfFloors: null,
  decorationType: null,
  decorationTypeOther: null,
  isEncroachingOthers: false,
  encroachingOthersRemark: null,
  encroachingOthersArea: null,
  buildingMaterialType: null,
  buildingStyleType: null,
  isResidential: false,
  buildingAge: null,
  constructionYear: null,
  residentialRemark: null,
  constructionStyleType: null,
  constructionStyleRemark: null,
  constructionType: null,
  constructionTypeOther: null,
  utilizationType: null,
  utilizationTypeOther: null,
  structureType: [] as string[],
  structureTypeOther: null,
  roofFrameType: [] as string[],
  roofFrameTypeOther: null,
  roofType: [] as string[],
  roofTypeOther: null,
  ceilingType: [] as string[],
  ceilingTypeOther: null,
  interiorWallType: [] as string[],
  interiorWallTypeOther: null,
  exteriorWallType: [] as string[],
  exteriorWallTypeOther: null,
  fenceType: [] as string[],
  fenceTypeOther: null,
  areaDetails: [],
  surfaces: [],
  depreciationDetails: [],
} satisfies Partial<LbModelFormType>;

/**
 * Factory: returns the correct model schema based on projectType.
 */
export function projectModelForm(projectType: ProjectType) {
  return projectType === 'Condo' ? condoModelForm : lbModelForm;
}

// =============================================================================
// Project Tower Form (Condo only)
// =============================================================================

const condoTowerBase = z.object({
  // modelTypeIds uses dynamic options from useGetProjectModels — rendered via
  // a custom component, NOT via configs/fields.ts
  modelTypeIds: z.array(z.string()).nullable().optional(),
  roofType: z.array(z.string()).nullable().optional(),
});

const allTowerFields = [
  ...condoTowerInfoFields,
  ...condoTowerConditionFields,
  ...condoTowerLocationFields,
  ...condoTowerStructureFields,
  ...condoTowerFloorFields,
  ...condoTowerRoofFields,
  ...condoTowerLegalFields,
];

export const projectTowerForm = buildFormSchema(allTowerFields, condoTowerBase);
export type ProjectTowerFormType = z.infer<typeof projectTowerForm>;

export const projectTowerFormDefaults: ProjectTowerFormType = {
  towerName: null,
  numberOfUnits: 0,
  numberOfFloors: 0,
  condoRegistrationNumber: '',
  modelTypeIds: [],
  conditionType: null,
  hasObligation: false,
  obligationDetails: null,
  documentValidationType: null,
  isLocationCorrect: true,
  distance: null,
  roadWidth: null,
  rightOfWay: null,
  roadSurfaceType: null,
  roadSurfaceTypeOther: null,
  decorationType: null,
  decorationTypeOther: null,
  constructionYear: null,
  totalNumberOfFloors: null,
  buildingFormType: null,
  constructionMaterialType: null,
  groundFloorMaterialType: null,
  groundFloorMaterialTypeOther: null,
  upperFloorMaterialType: null,
  upperFloorMaterialTypeOther: null,
  bathroomFloorMaterialType: null,
  bathroomFloorMaterialTypeOther: null,
  roofType: [],
  roofTypeOther: null,
  isExpropriated: false,
  expropriationRemark: null,
  isInExpropriationLine: false,
  royalDecree: null,
  isForestBoundary: false,
  forestBoundaryRemark: null,
  remark: null,
};

// =============================================================================
// Pricing Assumption Form
// =============================================================================

const condoPricingAllFields = [
  ...pricingLocationSharedFields,
  ...condoPricingLocationFields,
  ...condoPricingFloorFields,
  ...pricingForceSaleFields,
];

export const condoPricingAssumptionForm = buildFormSchema(condoPricingAllFields);
export type CondoPricingAssumptionFormType = z.infer<typeof condoPricingAssumptionForm>;

export const condoPricingAssumptionFormDefaults: CondoPricingAssumptionFormType = {
  locationMethod: null,
  cornerAdjustment: null,
  edgeAdjustment: null,
  otherAdjustment: null,
  poolViewAdjustment: null,
  southAdjustment: null,
  floorIncrementEveryXFloor: null,
  floorIncrementAmount: null,
  forceSalePercentage: null,
};

const lbPricingAllFields = [
  ...pricingLocationSharedFields,
  ...lbPricingLocationFields,
  ...pricingForceSaleFields,
];

export const lbPricingAssumptionForm = buildFormSchema(lbPricingAllFields);
export type LbPricingAssumptionFormType = z.infer<typeof lbPricingAssumptionForm>;

export const lbPricingAssumptionFormDefaults: LbPricingAssumptionFormType = {
  locationMethod: null,
  cornerAdjustment: null,
  edgeAdjustment: null,
  otherAdjustment: null,
  nearGardenAdjustment: null,
  landIncreaseDecreaseRate: null,
  forceSalePercentage: null,
};

/**
 * Factory: returns the correct pricing-assumption schema based on projectType.
 */
export function projectPricingAssumptionForm(projectType: ProjectType) {
  return projectType === 'Condo' ? condoPricingAssumptionForm : lbPricingAssumptionForm;
}
