import { z } from 'zod';

export const AreaDetailDto = z
  .object({
    areaDescription: z.string().optional(),
    areaSize: z.coerce.number(),
  })
  .passthrough();

export const BuildingDetailDto = z.object({
  detail: z.string().optional(),
  isBuilding: z.string().optional(),
  area: z.string().optional(),
});

export const CreateCondoRequest = z
  .object({
    ownerName: z.string(),

    propertyName: z.string(),
    condoName: z.string(),
    buildingNumber: z.string(),
    modelName: z.string(),
    builtOnTitleNumber: z.string(),
    condoRegistrationNumber: z.string(),
    roomNumber: z.string(),
    floorNumber: z.coerce.number(),
    usableArea: z.coerce.number(),

    latitude: z.coerce.number(),
    longitude: z.coerce.number(),

    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),
    landOffice: z.string(),

    isOwnerVerified: z.boolean(),
    buildingConditionType: z.string(),
    obligationType: z.array(z.string()),
    mortgageDetails: z.string(),
    obligationDetails: z.string(),
    documentValidationResultType: z.string(),

    locationType: z.string(),
    street: z.string(),
    soi: z.string(),
    distanceFromMainRoad: z.coerce.number(),
    carriagewayWidth: z.coerce.number(),
    rightOfWayWidth: z.coerce.number(),
    numberOfLanes: z.coerce.number(),
    roadSurfaceType: z.string(),
    publicUtilityType: z.array(z.string()),
    publicUtilityTypeOther: z.string(),
    urbanPlanningType: z.string(),
    urbanPlanningColor: z.string(),
    urbanPlanningColorOther: z.string(),
    landFillType: z.string(),
    landFillTypeOther: z.string(),
    landUseType: z.array(z.string()),
    landUseTypeOther: z.string(),
    landEntranceExitType: z.array(z.string()),
    landEntranceExitTypeOther: z.string(),
    locationRemark: z.string(),
    otherLegalLimitations: z.string(),
    roadPassInFrontOfLand: z.string(),
    transportationAccessType: z.array(z.string()),
    transportationAccessTypeOther: z.string(),
    governmentPricePerSqm: z.coerce.number(),
    governmentPrice: z.coerce.number(),

    decorationType: z.string(),
    decorationTypeOther: z.string(),
    buildingAge: z.coerce.number(),
    numberOfFloors: z.coerce.number(),
    buildingFormType: z.string(),
    constructionMaterialType: z.string(),

    roomLayoutType: z.string(),
    roomLayoutTypeOther: z.string(),
    locationViewType: z.array(z.string()),
    groundFloorMaterialType: z.string(),
    groundFloorMaterialTypeOther: z.string(),
    upperFloorMaterialType: z.string(),
    upperFloorMaterialTypeOther: z.string(),
    bathroomFloorMaterialType: z.string(),
    bathroomFloorMaterialTypeOther: z.string(),
    roofType: z.string(),
    roofTypeOther: z.string(),

    totalBuildingArea: z.coerce.number(),

    isExpropriated: z.boolean(),
    expropriationRemark: z.string(),
    isInExpropriationLine: z.boolean(),
    expropriationLineRemark: z.string(),
    royalDecree: z.string(),
    isForestBoundary: z.boolean(),
    forestBoundaryRemark: z.string(),

    facilityType: z.array(z.string()),
    facilityTypeOther: z.string(),
    environmentType: z.array(z.string()),
    hasFloodProblem: z.boolean(),
    floodProblemRemark: z.string(),
    hasPollutionProblem: z.boolean(),
    pollutionType: z.array(z.string()),
    pollutionTypeOther: z.string(),
    pollutionProblemRemark: z.string(),
    hasOtherEnvironmentProblem: z.boolean(),
    otherEnvironmentProblemRemark: z.string(),

    buildingInsurancePrice: z.coerce.number(),
    buildingInsurancePriceOverride: z.coerce.number().nullable().optional(),
    sellingPrice: z.coerce.number(),
    forcedSalePrice: z.coerce.number(),

    remark: z.string(),
  })
  .passthrough();

export const UpdateCondoRequest = z
  .object({
    ownerName: z.string(),

    propertyName: z.string(),
    condoName: z.string(),
    buildingNumber: z.string(),
    modelName: z.string(),
    builtOnTitleNumber: z.string(),
    condoRegistrationNumber: z.string(),
    roomNumber: z.string(),
    floorNumber: z.coerce.number(),
    usableArea: z.coerce.number(),

    latitude: z.coerce.number(),
    longitude: z.coerce.number(),

    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),
    landOffice: z.string(),

    isOwnerVerified: z.boolean(),
    buildingConditionType: z.string(),
    obligationType: z.array(z.string()),
    mortgageDetails: z.string(),
    obligationDetails: z.string(),
    documentValidationResultType: z.string(),

    locationType: z.string(),
    street: z.string(),
    soi: z.string(),
    distanceFromMainRoad: z.coerce.number(),
    carriagewayWidth: z.coerce.number(),
    rightOfWayWidth: z.coerce.number(),
    numberOfLanes: z.coerce.number(),
    roadSurfaceType: z.string(),
    publicUtilityType: z.array(z.string()),
    publicUtilityTypeOther: z.string(),
    urbanPlanningType: z.string(),
    urbanPlanningColor: z.string(),
    urbanPlanningColorOther: z.string(),
    landFillType: z.string(),
    landFillTypeOther: z.string(),
    landUseType: z.array(z.string()),
    landUseTypeOther: z.string(),
    landEntranceExitType: z.array(z.string()),
    landEntranceExitTypeOther: z.string(),
    locationRemark: z.string(),
    otherLegalLimitations: z.string(),
    roadPassInFrontOfLand: z.string(),
    transportationAccessType: z.array(z.string()),
    transportationAccessTypeOther: z.string(),
    governmentPricePerSqm: z.coerce.number(),
    governmentPrice: z.coerce.number(),

    decorationType: z.string(),
    decorationTypeOther: z.string(),
    buildingAge: z.coerce.number(),
    numberOfFloors: z.coerce.number(),
    buildingFormType: z.string(),
    constructionMaterialType: z.string(),

    roomLayoutType: z.string(),
    roomLayoutTypeOther: z.string(),
    locationViewType: z.array(z.string()),
    groundFloorMaterialType: z.string(),
    groundFloorMaterialTypeOther: z.string(),
    upperFloorMaterialType: z.string(),
    upperFloorMaterialTypeOther: z.string(),
    bathroomFloorMaterialType: z.string(),
    bathroomFloorMaterialTypeOther: z.string(),
    roofType: z.string(),
    roofTypeOther: z.string(),

    totalBuildingArea: z.coerce.number(),

    isExpropriated: z.boolean(),
    expropriationRemark: z.string(),
    isInExpropriationLine: z.boolean(),
    expropriationLineRemark: z.string(),
    royalDecree: z.string(),
    isForestBoundary: z.boolean(),
    forestBoundaryRemark: z.string(),

    facilityType: z.array(z.string()),
    facilityTypeOther: z.string(),
    environmentType: z.array(z.string()),
    hasFloodProblem: z.boolean(),
    floodProblemRemark: z.string(),
    hasPollutionProblem: z.boolean(),
    pollutionType: z.array(z.string()),
    pollutionTypeOther: z.string(),
    pollutionProblemRemark: z.string(),
    hasOtherEnvironmentProblem: z.boolean(),
    otherEnvironmentProblemRemark: z.string(),

    buildingInsurancePrice: z.coerce.number(),
    buildingInsurancePriceOverride: z.coerce.number().nullable().optional(),
    sellingPrice: z.coerce.number(),
    forcedSalePrice: z.coerce.number(),

    remark: z.string(),
  })
  .passthrough();

export const GetCondoPropertyByIdResult = z
  .object({
    ownerName: z.string(),

    propertyName: z.string(),
    condoName: z.string(),
    buildingNumber: z.string(),
    modelName: z.string(),
    builtOnTitleNumber: z.string(),
    condoRegistrationNumber: z.string(),
    roomNumber: z.string(),
    floorNumber: z.coerce.number(),
    usableArea: z.coerce.number(),

    latitude: z.coerce.number(),
    longitude: z.coerce.number(),

    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),
    landOffice: z.string(),

    isOwnerVerified: z.boolean(),
    buildingConditionType: z.string(),
    obligationType: z.array(z.string()),
    mortgageDetails: z.string(),
    obligationDetails: z.string(),
    documentValidationResultType: z.string(),

    locationType: z.string(),
    street: z.string(),
    soi: z.string(),
    distanceFromMainRoad: z.coerce.number(),
    carriagewayWidth: z.coerce.number(),
    rightOfWayWidth: z.coerce.number(),
    numberOfLanes: z.coerce.number(),
    roadSurfaceType: z.string(),
    publicUtilityType: z.array(z.string()),
    publicUtilityTypeOther: z.string(),
    urbanPlanningType: z.string(),
    urbanPlanningColor: z.string(),
    urbanPlanningColorOther: z.string(),
    landFillType: z.string(),
    landFillTypeOther: z.string(),
    landUseType: z.array(z.string()),
    landUseTypeOther: z.string(),
    landEntranceExitType: z.array(z.string()),
    landEntranceExitTypeOther: z.string(),
    locationRemark: z.string(),
    otherLegalLimitations: z.string(),
    roadPassInFrontOfLand: z.string(),
    transportationAccessType: z.array(z.string()),
    transportationAccessTypeOther: z.string(),
    governmentPricePerSqm: z.coerce.number(),
    governmentPrice: z.coerce.number(),

    decorationType: z.string(),
    decorationTypeOther: z.string(),
    buildingAge: z.coerce.number(),
    numberOfFloors: z.coerce.number(),
    buildingFormType: z.string(),
    constructionMaterialType: z.string(),

    roomLayoutType: z.string(),
    roomLayoutTypeOther: z.string(),
    locationViewType: z.array(z.string()),
    groundFloorMaterialType: z.string(),
    groundFloorMaterialTypeOther: z.string(),
    upperFloorMaterialType: z.string(),
    upperFloorMaterialTypeOther: z.string(),
    bathroomFloorMaterialType: z.string(),
    bathroomFloorMaterialTypeOther: z.string(),
    roofType: z.string(),
    roofTypeOther: z.string(),

    totalBuildingArea: z.coerce.number(),

    isExpropriated: z.boolean(),
    expropriationRemark: z.string(),
    isInExpropriationLine: z.boolean(),
    expropriationLineRemark: z.string(),
    royalDecree: z.string(),
    isForestBoundary: z.boolean(),
    forestBoundaryRemark: z.string(),

    facilityType: z.array(z.string()),
    facilityTypeOther: z.string(),
    environmentType: z.array(z.string()),
    hasFloodProblem: z.boolean(),
    floodProblemRemark: z.string(),
    hasPollutionProblem: z.boolean(),
    pollutionType: z.array(z.string()),
    pollutionTypeOther: z.string(),
    pollutionProblemRemark: z.string(),
    hasOtherEnvironmentProblem: z.boolean(),
    otherEnvironmentProblemRemark: z.string(),

    buildingInsurancePrice: z.coerce.number(),
    buildingInsurancePriceOverride: z.coerce.number().nullable().optional(),
    sellingPrice: z.coerce.number(),
    forcedSalePrice: z.coerce.number(),

    remark: z.string(),
  })
  .passthrough();

export const GetCondoPMAPropertyByIdResult = z.object({
  buildingInsurancePrice: z.coerce.number(),
  sellingPrice: z.coerce.number(),
  forcedSalePrice: z.coerce.number(),
  builtOnTitleNumber: z.string(),
  condoRegistrationNumber: z.string(),
  roomNumber: z.string(),
  floorNumber: z.coerce.number(),
  buildingNumber: z.string(),
  condoName: z.string(),
  subDistrict: z.string(),
  subDistrictName: z.string(),
  district: z.string(),
  districtName: z.string(),
  province: z.string(),
  provinceName: z.string(),
  externalSyncStatus: z.enum(['NotSynced', 'Pending', 'Delivered', 'Failed']).nullish(),
  externalSyncError: z.string().nullish(),
  externalSyncedAt: z.string().nullish(),
});

export const UpdateCondoPMARequest = z.object({
  buildingInsurancePrice: z.coerce.number(),
  sellingPrice: z.coerce.number(),
  forcedSalePrice: z.coerce.number(),
  builtOnTitleNumber: z.string(),
  condoRegistrationNumber: z.string(),
  roomNumber: z.string(),
  floorNumber: z.coerce.number(),
  buildingNumber: z.string(),
  condoName: z.string(),
  subDistrict: z.string(),
  subDistrictName: z.string(),
  district: z.string(),
  districtName: z.string(),
  province: z.string(),
  provinceName: z.string(),
});

export const CreateCondoResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const UpdateCondoResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const UpdateCondoPMAResponse = z.object({ isSuccess: z.boolean() }).passthrough();

export type CreateCondoResponseType = z.infer<typeof CreateCondoResponse>;
export type CreateCondoRequestType = z.infer<typeof CreateCondoRequest>;
export type AreaDetailDtoType = z.infer<typeof AreaDetailDto>;
export type UpdateCondoRequestType = z.infer<typeof UpdateCondoRequest>;
export type UpdateCondoResponseType = z.infer<typeof UpdateCondoResponse>;
export type UpdateCondoPMARequestType = z.infer<typeof UpdateCondoPMARequest>;
export type UpdateCondoPMAResponseType = z.infer<typeof UpdateCondoPMAResponse>;
export type GetCondoPropertyByIdResultType = z.infer<typeof GetCondoPropertyByIdResult>;
export type GetCondoPMAPropertyByIdResultType = z.infer<typeof GetCondoPMAPropertyByIdResult>;
