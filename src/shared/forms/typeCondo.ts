import { z } from 'zod';

export const AreaDetailDto = z
  .object({
    areaDetail: z.string().optional(),
    area: z.coerce.number(),
  })
  .passthrough();

export const BuildingDetailDto = z.object({
  detail: z.string().optional(),
  isBuilding: z.string().optional(),
  area: z.string().optional(),
});

const ZeroOne = z.enum(['0', '1']);

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
    hasObligation: z.boolean(),
    obligationDetails: z.string(),
    isDocumentValidated: z.boolean(),

    locationType: z.string(),
    street: z.string(),
    soi: z.string(),
    distanceFromMainRoad: z.coerce.number(),
    accessRoadWidth: z.coerce.number(),
    rightOfWay: z.coerce.number(),
    roadSurfaceType: z.string(),
    publicUtilityType: z.array(z.string()),
    publicUtilityTypeOther: z.string(),

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

    buildingInsurancePrice: z.coerce.number(),
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
    hasObligation: z.boolean(),
    obligationDetails: z.string(),
    isDocumentValidated: z.boolean(),

    locationType: z.string(),
    street: z.string(),
    soi: z.string(),
    distanceFromMainRoad: z.coerce.number(),
    accessRoadWidth: z.coerce.number(),
    rightOfWay: z.coerce.number(),
    roadSurfaceType: z.string(),
    publicUtilityType: z.array(z.string()),
    publicUtilityTypeOther: z.string(),

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

    buildingInsurancePrice: z.coerce.number(),
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
    hasObligation: z.boolean(),
    obligationDetails: z.string(),
    isDocumentValidated: z.boolean(),

    locationType: z.string(),
    street: z.string(),
    soi: z.string(),
    distanceFromMainRoad: z.coerce.number(),
    accessRoadWidth: z.coerce.number(),
    rightOfWay: z.coerce.number(),
    roadSurfaceType: z.string(),
    publicUtilityType: z.array(z.string()),
    publicUtilityTypeOther: z.string(),

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

    buildingInsurancePrice: z.coerce.number(),
    sellingPrice: z.coerce.number(),
    forcedSalePrice: z.coerce.number(),

    remark: z.string(),
  })
  .passthrough();

export const CreateCondoResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const UpdateCondoResponse = z.object({ isSuccess: z.boolean() }).passthrough();

export type CreateCondoResponseType = z.infer<typeof CreateCondoResponse>;
export type CreateCondoRequestType = z.infer<typeof CreateCondoRequest>;
export type AreaDetailDtoType = z.infer<typeof AreaDetailDto>;
export type UpdateCondoRequestType = z.infer<typeof UpdateCondoRequest>;
export type UpdateCondoResponseType = z.infer<typeof UpdateCondoResponse>;
export type GetCondoPropertyByIdResultType = z.infer<typeof GetCondoPropertyByIdResult>;
