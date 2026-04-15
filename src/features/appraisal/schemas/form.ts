import { buildFormSchema } from '@/shared/components/form/schemaBuilder';
import { z } from 'zod';
import {
  allBuildingFields,
  allCondoFields,
  allCondoPMAFields,
  allLandAndBuildingPMAFields,
  allLandBuildingFields,
  allLandFields,
  allLeaseAgreementFields,
  allMachineryFields,
  rentalScheduleField,
} from '../configs/fields';

const landTitleItem = z.object({
  titleNumber: z.string(),
  titleType: z.string(),
  bookNumber: z.string().nullable().optional(),
  pageNumber: z.string().nullable().optional(),
  landParcelNumber: z.string().nullable().optional(),
  surveyNumber: z.string().nullable().optional(),
  mapSheetNumber: z.string().nullable().optional(),
  rawang: z.string().nullable().optional(),
  aerialMapName: z.string().nullable().optional(),
  aerialMapNumber: z.string().nullable().optional(),
  rai: z.number().nullable().optional(),
  ngan: z.number().nullable().optional(),
  squareWa: z.number().nullable().optional(),
  boundaryMarkerType: z.string().nullable().optional(),
  boundaryMarkerRemark: z.string().nullable().optional(),
  documentValidationResultType: z.string().nullable().optional(),
  isMissingFromSurvey: z.boolean().nullable().optional(),
  governmentPricePerSqWa: z.number().nullable().optional(),
  governmentPrice: z.number().nullable().optional(),
  remark: z.string().nullable().optional(),
});

export const createLandFormBase = z.object({
  titles: z.array(landTitleItem).nullable().optional(),
});

export const createLandForm = buildFormSchema(allLandFields, createLandFormBase);

const surfaceFormItem = z.object({
  fromFloorNumber: z.coerce.number().nullable().optional(),
  toFloorNumber: z.coerce.number().nullable().optional(),
  floorType: z.string().nullable().optional(),
  floorStructureType: z.string().nullable().optional(),
  floorStructureTypeOther: z.string().nullable().optional(),
  floorSurfaceType: z.string().nullable().optional(),
  floorSurfaceTypeOther: z.string().nullable().optional(),
});

const depreciationPeriodFormItem = z.object({
  atYear: z.coerce.number().nullable().optional(),
  toYear: z.coerce.number().nullable().optional(),
  depreciationPerYear: z.coerce.number().nullable().optional(),
  totalDepreciationPct: z.coerce.number().nullable().optional(),
  priceDepreciation: z.coerce.number().nullable().optional(),
});

const depreciationFormItem = z.object({
  areaDescription: z.string().nullable().optional(),
  area: z.coerce.number().nullable().optional(),
  isBuilding: z.boolean().nullable().optional(),
  year: z.coerce.number().nullable().optional(),
  pricePerSqMBeforeDepreciation: z.coerce.number().nullable().optional(),
  priceBeforeDepreciation: z.coerce.number().nullable().optional(),
  depreciationMethod: z.string().nullable().optional(),
  depreciationYearPct: z.coerce.number().nullable().optional(),
  totalDepreciationPct: z.coerce.number().nullable().optional(),
  priceDepreciation: z.coerce.number().nullable().optional(),
  pricePerSqMAfterDepreciation: z.coerce.number().nullable().optional(),
  priceAfterDepreciation: z.coerce.number().nullable().optional(),
  depreciationPeriods: z.array(depreciationPeriodFormItem).nullable().optional(),
});

const constructionSubItemFormItem = z.object({
  id: z.string().nullable().optional(),
  constructionWorkGroupId: z.string(),
  constructionWorkItemId: z.string().nullable().optional(),
  workItemName: z.string(),
  displayOrder: z.coerce.number().nullable().optional(),
  proportionPct: z.coerce.number().nullable().optional(),
  previousProgressPct: z.coerce.number().nullable().optional(),
  currentProgressPct: z.coerce.number().nullable().optional(),
});

const constructionSummaryFormItem = z.object({
  summaryDetail: z.string().nullable().optional(),
  summaryPreviousProgressPct: z.coerce.number().nullable().optional(),
  summaryPreviousValue: z.coerce.number().nullable().optional(),
  summaryCurrentProgressPct: z.coerce.number().nullable().optional(),
  summaryCurrentValue: z.coerce.number().nullable().optional(),
  documentId: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  filePath: z.string().nullable().optional(),
  fileExtension: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSizeBytes: z.coerce.number().nullable().optional(),
});

export const createBuildingFormBase = z.object({
  surfaces: z.array(surfaceFormItem).nullable().optional(),
  depreciationDetails: z.array(depreciationFormItem).nullable().optional(),
  constructionEnterDetail: z.boolean().nullable().optional(),
  constructionSubItems: z.array(constructionSubItemFormItem).nullable().optional(),
  constructionSummary: constructionSummaryFormItem.nullable().optional(),
  constructionRemark: z.string().nullable().optional(),
});

const constructionProportionRefinement = (data: any, ctx: z.RefinementCtx) => {
  if (data.constructionEnterDetail) {
    const total = (data.constructionSubItems ?? []).reduce(
      (sum: number, item: any) => sum + (Number(item.proportionPct) || 0),
      0,
    );
    if (total > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total proportion is ${total.toFixed(2)}% — cannot exceed 100%`,
        path: ['constructionSubItems'],
      });
    }
  }
};

export const createBuildingForm = buildFormSchema(
  allBuildingFields,
  createBuildingFormBase,
).superRefine(constructionProportionRefinement);

const AreaDetailDto = z
  .object({
    id: z.string().uuid().nullable(),
    areaDescription: z.string().nullable(),
    areaSize: z.coerce.number().nullable(),
  })
  .passthrough();

export const createCondoFormBase = z.object({
  areaDetails: z.array(AreaDetailDto).nullable(),
});

export const createCondoForm = buildFormSchema(allCondoFields, createCondoFormBase);

export const createLandAndBuildingFormBase = z.object({
  titles: z.array(landTitleItem).nullable().optional(),
  surfaces: z.array(surfaceFormItem).nullable().optional(),
  depreciationDetails: z.array(depreciationFormItem).nullable().optional(),
  constructionEnterDetail: z.boolean().nullable().optional(),
  constructionSubItems: z.array(constructionSubItemFormItem).nullable().optional(),
  constructionSummary: constructionSummaryFormItem.nullable().optional(),
  constructionRemark: z.string().nullable().optional(),
});

export const createLandAndBuildingForm = buildFormSchema(
  allLandBuildingFields,
  createLandAndBuildingFormBase,
).superRefine(constructionProportionRefinement);

export const createLandAndBuildingPMAFormBase = z.object({
  buildingInsurancePrice: z.coerce.number().nullable(),
  sellingPrice: z.coerce.number().nullable(),
  forcedSalePrice: z.coerce.number().nullable(),
  titleNo: z.string().nullable().optional(),
  rawang: z.string().nullable().optional(),
  landNo: z.string().nullable().optional(),
  surveyNo: z.string().nullable().optional(),
  bookNumber: z.string().nullable().optional(),
  pageNumber: z.string().nullable().optional(),
  areaRai: z.number().int().nullable().optional(),
  areaNgan: z.number().int().nullable().optional(),
  areaSquareWa: z.number().nullable().optional(),
  subDistrict: z.string().min(1, 'Sub district is required.'),
  subDistrictName: z.string().nullable(),
  district: z.string().min(1, 'District is required.'),
  districtName: z.string().nullable(),
  province: z.string().min(1, 'Province is required.'),
  provinceName: z.string().nullable(),
});

export const createCondoPMAFormBase = z.object({
  buildingInsurancePrice: z.coerce.number().nullable(),
  sellingPrice: z.coerce.number().nullable(),
  forcedSalePrice: z.coerce.number().nullable(),
  builtOnTitleNumber: z.string().min(1, 'Built on title number is required.'),
  condoRegistrationNumber: z.string().min(1, 'Condo registration number is required.'),
  roomNumber: z.string().min(1, 'Room number is required.'),
  floorNumber: z.coerce.number(),
  buildingNumber: z.string().min(1, 'Building number is required.'),
  condoName: z.string().min(1, 'Condo name is required.'),
  subDistrict: z.string().min(1, 'Sub district is required.'),
  subDistrictName: z.string().nullable(),
  district: z.string().min(1, 'District is required.'),
  districtName: z.string().nullable(),
  province: z.string().min(1, 'Province is required.'),
  provinceName: z.string().nullable(),
});

export const createLandAndBuildingPMAForm = buildFormSchema(
  allLandAndBuildingPMAFields,
  createLandAndBuildingPMAFormBase,
);
export const createCondoPMAForm = buildFormSchema(allCondoPMAFields, createCondoPMAFormBase);
export const createMachineryForm = buildFormSchema(allMachineryFields);

export const factorDataDto = z
  .object({
    factorId: z.string().uuid().nullable().optional(),
    factorCode: z.string().nullable().optional(),
    value: z.any().nullable().optional(),
    otherRemarks: z.string().nullable().optional(),
    factorName: z.string().nullable().optional(),
    fieldName: z.string().nullable().optional(),
    dataType: z.string().nullable().optional(),
    fieldLength: z.coerce.number().nullable().optional(),
    fieldDecimal: z.coerce.number().nullable().optional(),
    parameterGroup: z.string().nullable().optional(),
    isActive: z.boolean().nullable().optional(),
    displaySeq: z.coerce.number().int().nullable().optional(),
  })
  .passthrough();

export const createMarketComparableForm = z
  .object({
    factorData: z.array(factorDataDto).nullable().optional(),
    notes: z.string().nullable().optional(),
    infoDateTime: z.string().datetime({ local: true, offset: true }).nullable().optional(),
    sourceInfo: z.string().nullable().optional(),
    surveyName: z.string(),
    templateId: z.string().uuid().nullable().optional(),
    templateCode: z.string().nullable().optional(),
    propertyType: z.string().nullable().optional(),
    comparableNumber: z.string().nullable().optional(),
    offerPrice: z.coerce.number().nullable().optional(),
    offerPriceUnit: z.string().nullable().optional(),
    salePrice: z.coerce.number().nullable().optional(),
    salePriceUnit: z.string().nullable().optional(),
    saleDate: z.string().datetime({ local: true, offset: true }).nullable().optional(),
  })
  .passthrough();

export type createCondoFormType = z.infer<typeof createCondoForm>;
export type createBuildingFormType = z.infer<typeof createBuildingForm>;
export type createLandFormType = z.infer<typeof createLandForm>;
export type createLandAndBuildingFormType = z.infer<typeof createLandAndBuildingForm>;
export type createMachineryFormType = z.infer<typeof createMachineryForm>;
export type createLandAndBuildingPMAFormType = z.infer<typeof createLandAndBuildingPMAForm>;
export type createCondoPMAFormType = z.infer<typeof createCondoPMAForm>;
export type createMarketComparableFormType = z.infer<typeof createMarketComparableForm>;

//===============================================================

export const createLandFormDefault: createLandFormType = {
  titles: [],
  propertyName: '',
  latitude: 0,
  longitude: 0,
  subDistrict: '',
  subDistrictName: '',
  district: '',
  districtName: '',
  province: '',
  provinceName: '',
  landOffice: '',
  landDescription: '',
  isOwnerVerified: false,
  ownerName: '',
  hasObligation: false,
  obligationDetails: '',
  isLandLocationVerified: false,
  landCheckMethodType: '',
  landCheckMethodTypeOther: '',
  street: '',
  soi: '',
  distanceFromMainRoad: 0,
  village: '',
  addressLocation: '',
  landShapeType: '',
  urbanPlanningType: '',
  landZoneType: [],
  landZoneTypeOther: '',
  plotLocationType: [],
  plotLocationTypeOther: '',
  landFillType: '',
  landFillTypeOther: '',
  landFillPercent: 0,
  soilLevel: 0,
  accessRoadWidth: 0,
  rightOfWay: 0,
  roadFrontage: 0,
  numberOfSidesFacingRoad: 0,
  roadPassInFrontOfLand: '',
  landAccessibilityType: '',
  landAccessibilityRemark: '',
  roadSurfaceType: '',
  roadSurfaceTypeOther: '',
  publicUtilityType: [],
  publicUtilityTypeOther: '',
  landUseType: [],
  landUseTypeOther: '',
  landEntranceExitType: [],
  landEntranceExitTypeOther: '',
  transportationAccessType: [],
  transportationAccessTypeOther: '',
  propertyAnticipationType: '',
  propertyAnticipationTypeOther: '',
  isExpropriated: false,
  expropriationRemark: '',
  isInExpropriationLine: false,
  expropriationLineRemark: '',
  royalDecree: '',
  isEncroached: false,
  encroachmentRemark: '',
  encroachmentArea: 0,
  hasElectricity: false,
  electricityDistance: 0,
  isLandlocked: false,
  landlockedRemark: '',
  isForestBoundary: false,
  forestBoundaryRemark: '',
  otherLegalLimitations: '',
  evictionType: [],
  evictionTypeOther: '',
  allocationType: '',
  northAdjacentArea: '',
  northBoundaryLength: 0,
  southAdjacentArea: '',
  southBoundaryLength: 0,
  eastAdjacentArea: '',
  eastBoundaryLength: 0,
  westAdjacentArea: '',
  westBoundaryLength: 0,
  pondArea: 0,
  pondDepth: 0,
  hasBuilding: false,
  hasBuildingOther: '',
  remark: '',
};

export const createBuildingFormDefault: createBuildingFormType = {
  ownerName: '',
  propertyName: '',
  buildingNumber: '',
  modelName: '',
  builtOnTitleNumber: '',
  isOwnerVerified: false,
  houseNumber: '',
  buildingConditionType: '',
  buildingConditionTypeOther: '',
  isUnderConstruction: false,
  constructionCompletionPercent: 100,
  constructionLicenseExpirationDate: null,
  isAppraisable: false,
  hasObligation: false,
  obligationDetails: '',
  buildingType: '',
  buildingTypeOther: '',
  numberOfFloors: 0,
  decorationType: '',
  decorationTypeOther: '',
  isEncroachingOthers: false,
  encroachingOthersRemark: '',
  encroachingOthersArea: 0,
  buildingMaterialType: '',
  buildingStyleType: '',
  isResidential: true,
  buildingAge: 0,
  residentialRemark: '',
  constructionStyleRemark: '',
  constructionStyleType: '',
  structureType: [],
  structureTypeOther: '',
  roofFrameType: [],
  roofFrameTypeOther: '',
  roofType: [],
  roofTypeOther: '',
  ceilingType: [],
  ceilingTypeOther: '',
  interiorWallType: [],
  interiorWallTypeOther: '',
  exteriorWallType: [],
  exteriorWallTypeOther: '',
  fenceType: [],
  fenceTypeOther: '',
  constructionType: '',
  constructionTypeOther: '',
  utilizationType: '',
  utilizationTypeOther: '',
  totalBuildingArea: 0,
  buildingInsurancePrice: 0,
  sellingPrice: 0,
  forcedSalePrice: 0,
  remark: '',
  surfaces: [],
  depreciationDetails: [],
  constructionEnterDetail: true,
  constructionSubItems: [],
  constructionSummary: {
    summaryDetail: '',
    summaryPreviousProgressPct: 0,
    summaryPreviousValue: 0,
    summaryCurrentProgressPct: 0,
    summaryCurrentValue: 0,
    documentId: null,
    fileName: null,
    filePath: null,
    fileExtension: null,
    mimeType: null,
    fileSizeBytes: null,
  },
  constructionRemark: '',
};

export const createCondoFormDefault: createCondoFormType = {
  ownerName: '',
  propertyName: '',
  condoName: '',
  buildingNumber: '',
  modelName: '',
  builtOnTitleNumber: '',
  condoRegistrationNumber: '',
  roomNumber: '',
  floorNumber: '',
  usableArea: 0,
  latitude: 0,
  longitude: 0,
  subDistrict: '',
  district: '',
  province: '',
  landOffice: '',
  isOwnerVerified: false,
  buildingConditionType: '',
  buildingConditionTypeOther: '',
  hasObligation: false,
  obligationDetails: '',
  documentValidationResultType: '',
  locationType: '',
  street: '',
  soi: '',
  distanceFromMainRoad: 0,
  accessRoadWidth: 0,
  rightOfWay: 0,
  roadSurfaceType: '',
  publicUtilityType: [],
  publicUtilityTypeOther: '',
  decorationType: '',
  decorationTypeOther: '',
  buildingAge: 0,
  numberOfFloors: 0,
  buildingFormType: '',
  constructionMaterialType: '',
  roomLayoutType: '',
  roomLayoutTypeOther: '',
  locationViewType: [],
  groundFloorMaterialType: '',
  groundFloorMaterialTypeOther: '',
  upperFloorMaterialType: '',
  upperFloorMaterialTypeOther: '',
  bathroomFloorMaterialType: '',
  bathroomFloorMaterialTypeOther: '',
  roofType: [],
  roofTypeOther: '',
  areaDetails: [],
  totalBuildingArea: 0,
  isExpropriated: false,
  expropriationRemark: '',
  isInExpropriationLine: false,
  expropriationLineRemark: '',
  royalDecree: '',
  isForestBoundary: false,
  forestBoundaryRemark: '',
  facilityType: [],
  facilityTypeOther: '',
  environmentType: [],
  buildingInsurancePrice: 0,
  sellingPrice: 0,
  forcedSalePrice: 0,
  remark: '',
};

export const createLandAndBuildingFormDefault: createLandAndBuildingFormType = {
  titles: [],
  propertyName: '',
  latitude: 0,
  longitude: 0,
  subDistrict: '',
  subDistrictName: '',
  district: '',
  districtName: '',
  province: '',
  provinceName: '',
  landOffice: '',
  landDescription: '',
  isOwnerVerified: true,
  ownerName: '',
  hasObligation: false,
  obligationDetails: '',
  isLandLocationVerified: false,
  landCheckMethodType: '',
  landCheckMethodTypeOther: '',
  street: '',
  soi: '',
  distanceFromMainRoad: 0,
  village: '',
  addressLocation: '',
  landShapeType: '',
  urbanPlanningType: '',
  landZoneType: [],
  landZoneTypeOther: '',
  plotLocationType: [],
  plotLocationTypeOther: '',
  landFillType: '',
  landFillTypeOther: '',
  landFillPercent: 0,
  soilLevel: 0,
  accessRoadWidth: 0,
  rightOfWay: 0,
  roadFrontage: 0,
  numberOfSidesFacingRoad: 0,
  roadPassInFrontOfLand: '',
  landAccessibilityType: '',
  landAccessibilityRemark: '',
  roadSurfaceType: '',
  roadSurfaceTypeOther: '',
  publicUtilityType: [],
  publicUtilityTypeOther: '',
  landUseType: [],
  landUseTypeOther: '',
  landEntranceExitType: [],
  landEntranceExitTypeOther: '',
  transportationAccessType: [],
  transportationAccessTypeOther: '',
  propertyAnticipationType: '',
  propertyAnticipationTypeOther: '',
  isExpropriated: false,
  expropriationRemark: '',
  isInExpropriationLine: false,
  expropriationLineRemark: '',
  royalDecree: '',
  isEncroached: false,
  encroachmentRemark: '',
  encroachmentArea: 0,
  hasElectricity: false,
  electricityDistance: 0,
  isLandlocked: false,
  landlockedRemark: '',
  isForestBoundary: false,
  forestBoundaryRemark: '',
  otherLegalLimitations: '',
  evictionType: [],
  evictionTypeOther: '',
  allocationType: '',
  northAdjacentArea: '',
  northBoundaryLength: 0,
  southAdjacentArea: '',
  southBoundaryLength: 0,
  eastAdjacentArea: '',
  eastBoundaryLength: 0,
  westAdjacentArea: '',
  westBoundaryLength: 0,
  pondArea: 0,
  pondDepth: 0,

  //Building
  buildingNumber: '',
  modelName: '',
  builtOnTitleNumber: '',
  houseNumber: '',
  buildingConditionType: '',
  buildingConditionTypeOther: '',
  isUnderConstruction: false,
  constructionCompletionPercent: 100,
  constructionLicenseExpirationDate: null,
  isAppraisable: false,
  buildingType: '',
  buildingTypeOther: '',
  numberOfFloors: 0,
  decorationType: '',
  decorationTypeOther: '',
  isEncroachingOthers: false,
  encroachingOthersRemark: '',
  encroachingOthersArea: 0,
  buildingMaterialType: '',
  buildingStyleType: '',
  isResidential: true,
  buildingAge: 0,
  residentialRemark: '',
  constructionStyleRemark: '',
  constructionStyleType: '',
  structureType: [],
  structureTypeOther: '',
  roofFrameType: [],
  roofFrameTypeOther: '',
  roofType: [],
  roofTypeOther: '',
  ceilingType: [],
  ceilingTypeOther: '',
  interiorWallType: [],
  interiorWallTypeOther: '',
  exteriorWallType: [],
  exteriorWallTypeOther: '',
  fenceType: [],
  fenceTypeOther: '',
  constructionType: '',
  constructionTypeOther: '',
  utilizationType: '',
  utilizationTypeOther: '',
  totalBuildingArea: 0,
  buildingInsurancePrice: 0,
  sellingPrice: 0,
  forcedSalePrice: 0,
  remark: '',
  surfaces: [],
  depreciationDetails: [],
  constructionEnterDetail: true,
  constructionSubItems: [],
  constructionSummary: {
    summaryDetail: '',
    summaryPreviousProgressPct: 0,
    summaryPreviousValue: 0,
    summaryCurrentProgressPct: 0,
    summaryCurrentValue: 0,
    documentId: null,
    fileName: null,
    filePath: null,
    fileExtension: null,
    mimeType: null,
    fileSizeBytes: null,
  },
  constructionRemark: '',
};

export const createMachineryFormDefault: createMachineryFormType = {
  propertyName: null,
  isOwnerVerified: true,
  ownerName: null,
  registrationNo: null,
  isOperational: true,
  machineName: null,
  brand: null,
  model: null,
  series: null,
  yearOfManufacture: null,
  manufacturer: null,
  purchaseDate: null,
  purchasePrice: null,
  quantity: null,
  capacity: null,
  width: null,
  length: null,
  height: null,
  machineDimensions: null,
  energyUse: null,
  location: null,
  conditionUse: null,
  machineCondition: null,
  machineAge: null,
  machineEfficiency: null,
  machineTechnology: null,
  usagePurpose: null,
  machineParts: null,
  replacementValue: null,
  conditionValue: null,
  other: null,
  remark: null,
  appraiserOpinion: null,
};

export const createLandAndBuildingPMAFormDefault: createLandAndBuildingPMAFormType = {
  buildingInsurancePrice: 0,
  sellingPrice: 0,
  forcedSalePrice: 0,
  titleNo: '',
  rawang: '',
  landNo: '',
  surveyNo: '',
  bookNumber: '',
  pageNumber: '',
  areaRai: 0,
  areaNgan: 0,
  areaSquareWa: 0,
  subDistrict: '',
  subDistrictName: '',
  district: '',
  districtName: '',
  province: '',
  provinceName: '',
};

export const createCondoPMAFormDefault: createCondoPMAFormType = {
  buildingInsurancePrice: 0,
  sellingPrice: 0,
  forcedSalePrice: 0,
  builtOnTitleNumber: '',
  condoRegistrationNumber: '',
  roomNumber: '',
  floorNumber: '',
  buildingNumber: '',
  condoName: '',
  subDistrict: '',
  subDistrictName: '',
  district: '',
  districtName: '',
  province: '',
  provinceName: '',
};

export const createMarketComparableFormDefault: createMarketComparableFormType = {
  factorData: [],
  surveyName: '',
  templateId: '',
  templateCode: '',
  notes: '',
  infoDateTime: null,
  sourceInfo: '',
  propertyType: '',
  comparableNumber: '',
  offerPrice: null,
  offerPriceUnit: null,
  salePrice: null,
  salePriceUnit: null,
  saleDate: null,
};

// =============================================================================
// Lease Agreement Form
// =============================================================================

export const createLeaseAgreementForm = buildFormSchema(allLeaseAgreementFields);
export type createLeaseAgreementFormType = z.infer<typeof createLeaseAgreementForm>;

// =============================================================================
// Rental Info Form
// =============================================================================

const upFrontEntryItem = z.object({
  atYear: z.union([z.number(), z.string()]),
  upFrontAmount: z.number(),
});

const growthPeriodEntryItem = z.object({
  fromYear: z.number(),
  toYear: z.number(),
  growthRate: z.number(),
  growthAmount: z.number(),
  totalAmount: z.number(),
});

export const rentalInfoBaseSchema = z.object({
  numberOfYears: z.number().nullable().optional(),
  firstYearStartDate: z.string().nullable().optional(),
  contractRentalFeePerYear: z.number().nullable().optional(),
  upFrontTotalAmount: z.number().nullable().optional(),
  growthRateType: z.string().nullable().optional(),
  growthRatePercent: z.number().nullable().optional(),
  growthIntervalYears: z.number().nullable().optional(),
  upFrontEntries: z.array(upFrontEntryItem).nullable().optional(),
  growthPeriodEntries: z.array(growthPeriodEntryItem).nullable().optional(),
  scheduleEntries: z
    .array(
      z.object({
        year: z.number(),
        contractStart: z.string(),
        contractEnd: z.string(),
        upFront: z.number(),
        contractRentalFee: z.number(),
        totalAmount: z.number(),
        contractRentalFeeGrowthRatePercent: z.number(),
      }),
    )
    .nullable()
    .optional(),
  scheduleOverrides: z
    .array(
      z.object({
        year: z.number(),
        upFront: z.number().nullable().optional(),
        contractRentalFee: z.number().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

const rentalInfoRefinement = (data: any, ctx: z.RefinementCtx) => {
  const ri = data.rentalInfo ?? data; // support both nested and flat
  const numberOfYears = ri.numberOfYears ?? 0;

  const upFrontTotal = ri.upFrontTotalAmount ?? 0;
  const entriesTotal = (ri.upFrontEntries ?? []).reduce(
    (sum: number, e: any) => sum + (e.upFrontAmount ?? 0),
    0,
  );
  if (
    upFrontTotal > 0 &&
    (ri.upFrontEntries ?? []).length > 0 &&
    Math.abs(entriesTotal - upFrontTotal) > 0.01
  ) {
    const path = data.rentalInfo ? ['rentalInfo', 'upFrontEntries'] : ['upFrontEntries'];
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Up front entries total (${entriesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}) does not match Up Front amount (${upFrontTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
      path,
    });
  }

  if (numberOfYears > 0 && ri.growthPeriodEntries?.length) {
    ri.growthPeriodEntries.forEach((entry: any, idx: number) => {
      if (entry.fromYear > numberOfYears) {
        const path = data.rentalInfo
          ? ['rentalInfo', 'growthPeriodEntries', idx, 'fromYear']
          : ['growthPeriodEntries', idx, 'fromYear'];
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `At Year (${entry.fromYear}) exceeds Number of Years (${numberOfYears})`,
          path,
        });
      }
    });
  }
};

export const rentalInfoFormSchema = buildFormSchema(
  rentalScheduleField,
  rentalInfoBaseSchema,
).superRefine(rentalInfoRefinement);
export type RentalInfoFormType = z.infer<typeof rentalInfoFormSchema>;

// =============================================================================
// Combined Lease Agreement Schemas (one form per page)
// =============================================================================

const leaseAgreementExtension = {
  leaseAgreement: createLeaseAgreementForm.nullable().optional(),
  rentalInfo: rentalInfoFormSchema.nullable().optional(),
};

export const createLeaseAgreementBuildingForm = buildFormSchema(
  allBuildingFields,
  createBuildingFormBase.extend(leaseAgreementExtension),
)
  .superRefine(constructionProportionRefinement)
  .superRefine(rentalInfoRefinement);
export type createLeaseAgreementBuildingFormType = z.infer<typeof createLeaseAgreementBuildingForm>;

export const createLeaseAgreementLandForm = buildFormSchema(
  allLandFields,
  createLandFormBase.extend(leaseAgreementExtension),
).superRefine(rentalInfoRefinement);
export type createLeaseAgreementLandFormType = z.infer<typeof createLeaseAgreementLandForm>;

export const createLeaseAgreementLandAndBuildingForm = buildFormSchema(
  allLandBuildingFields,
  createLandAndBuildingFormBase.extend(leaseAgreementExtension),
)
  .superRefine(constructionProportionRefinement)
  .superRefine(rentalInfoRefinement);
export type createLeaseAgreementLandAndBuildingFormType = z.infer<
  typeof createLeaseAgreementLandAndBuildingForm
>;

export const createLeaseAgreementBuildingFormDefault: createLeaseAgreementBuildingFormType = {
  ...createBuildingFormDefault,
  leaseAgreement: null,
  rentalInfo: null,
};

export const createLeaseAgreementLandFormDefault: createLeaseAgreementLandFormType = {
  ...createLandFormDefault,
  leaseAgreement: null,
  rentalInfo: null,
};

export const createLeaseAgreementLandAndBuildingFormDefault: createLeaseAgreementLandAndBuildingFormType =
  {
    ...createLandAndBuildingFormDefault,
    leaseAgreement: null,
    rentalInfo: null,
  };
