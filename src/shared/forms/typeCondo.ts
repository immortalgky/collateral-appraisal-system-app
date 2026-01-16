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

export const CondoDetailDto = z.object({
  verifiableOwner: z.boolean(),
  owner: z.string(),

  condoConditions: z.string().optional(),

  isObligation: z.string(),
  obligation: z.string(),

  documentValidation: ZeroOne.optional(),

  isCondoLocationCorrect: ZeroOne.optional(),
  street: z.string().optional(),
  soi: z.string().optional(),
  distance: z.coerce.number().optional(),
  width: z.coerce.number().optional(),
  rightOfWay: z.coerce.number().optional(),
  roadSurface: ZeroOne.optional(),
  publicUtility: z.string().optional(),
  publicUtilityOther: z.string().optional(),

  permanentElectricity: z.boolean().optional(),
  waterSupply: z.boolean().optional(),

  decoration: z.string(),
  decorationOther: z.string().optional(),

  buildingYear: z.coerce.number().optional(),
  totalFloor: z.coerce.number().optional(),

  buildingForm: z.string().optional(),

  constructionMaterials: z.string().optional(),

  roomLayout: z.string().optional(),
  roomLayoutOther: z.string().optional(),

  locationView: z.string().optional(),

  groundFlooringMaterial: z.string().optional(),
  groundFlooringMaterialOther: z.string().optional(),
  upperFlooringMaterial: z.string().optional(),
  bathroomFlooringMaterials: z.string().optional(),

  roof: z.string().optional(),
  roofOther: z.string().optional(),

  expropriation: ZeroOne.optional(),
  royalDecree: z.string().optional(),

  condoFacility: z.string().optional(),
  condoFacilityOther: z.string().optional(),

  condoEnvironment: z.string().optional(),

  inForestBoundary: z.boolean().optional(),
  inForestBoundaryRemark: z.string().optional(),

  areaDetails: z.array(AreaDetailDto).optional(),

  remarks: z.string().optional(),

  isBuilding: z.array(BuildingDetailDto).optional(),
});

export const CreateCondoRequest = z
  .object({
    ownerName: z.string(),

    propertyName: z.string(),
    condoName: z.string(),
    buildingNumber: z.string(),
    modelName: z.string(),
    builtOnTitleNo: z.string(),
    condoRegisNo: z.string(),
    roomNo: z.string(),
    floorNo: z.coerce.number(),
    usableArea: z.coerce.number(),

    latitude: z.coerce.number(),
    longitude: z.coerce.number(),

    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),
    landOffice: z.string(),

    isOwnerVerified: z.boolean(),
    buildingCondition: z.string(),
    hasObligation: z.boolean(),
    obligationDetails: z.string(),
    docValidate: z.boolean(),

    locationType: z.string(),
    street: z.string(),
    soi: z.string(),
    distanceFromMainRoad: z.coerce.number(),
    accessRoadWidth: z.coerce.number(),
    rightOfWay: z.string(),
    roadSurfaceType: z.string(),
    publicUtility: z.array(z.string()),
    publicUtilityOther: z.string(),

    decoration: z.string(),
    decorationOther: z.string(),
    buildingAge: z.coerce.number(),
    numberOfFloor: z.coerce.number(),
    buildingForm: z.string(),
    constructionMaterialType: z.string(),

    roomLayoutType: z.string(),
    roomLayoutTypeOther: z.string(),
    locationView: z.array(z.string()),
    groundFloorMaterial: z.string(),
    groundFloorMaterialOther: z.string(),
    upperFloorMaterial: z.string(),
    upperFloorMaterialOther: z.string(),
    bathroomFloorMaterial: z.string(),
    bathroomFloorMaterialOther: z.string(),
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
    builtOnTitleNo: z.string(),
    condoRegisNo: z.string(),
    roomNo: z.string(),
    floorNo: z.coerce.number(),
    usableArea: z.coerce.number(),

    latitude: z.coerce.number(),
    longitude: z.coerce.number(),

    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),
    landOffice: z.string(),

    isOwnerVerified: z.boolean(),
    buildingCondition: z.string(),
    hasObligation: z.boolean(),
    obligationDetails: z.string(),
    docValidate: z.boolean(),

    locationType: z.string(),
    street: z.string(),
    soi: z.string(),
    distanceFromMainRoad: z.coerce.number(),
    accessRoadWidth: z.coerce.number(),
    rightOfWay: z.string(),
    roadSurfaceType: z.string(),
    publicUtility: z.array(z.string()),
    publicUtilityOther: z.string(),

    decoration: z.string(),
    decorationOther: z.string(),
    buildingAge: z.coerce.number(),
    numberOfFloor: z.coerce.number(),
    buildingForm: z.string(),
    constructionMaterialType: z.string(),

    roomLayoutType: z.string(),
    roomLayoutTypeOther: z.string(),
    locationView: z.array(z.string()),
    groundFloorMaterial: z.string(),
    groundFloorMaterialOther: z.string(),
    upperFloorMaterial: z.string(),
    upperFloorMaterialOther: z.string(),
    bathroomFloorMaterial: z.string(),
    bathroomFloorMaterialOther: z.string(),
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
    builtOnTitleNo: z.string(),
    condoRegisNo: z.string(),
    roomNo: z.string(),
    floorNo: z.coerce.number(),
    usableArea: z.coerce.number(),

    latitude: z.coerce.number(),
    longitude: z.coerce.number(),

    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),
    landOffice: z.string(),

    isOwnerVerified: z.boolean(),
    buildingCondition: z.string(),
    hasObligation: z.boolean(),
    obligationDetails: z.string(),
    docValidate: z.boolean(),

    locationType: z.string(),
    street: z.string(),
    soi: z.string(),
    distanceFromMainRoad: z.coerce.number(),
    accessRoadWidth: z.coerce.number(),
    rightOfWay: z.string(),
    roadSurfaceType: z.string(),
    publicUtility: z.array(z.string()),
    publicUtilityOther: z.string(),

    decoration: z.string(),
    decorationOther: z.string(),
    buildingAge: z.coerce.number(),
    numberOfFloor: z.coerce.number(),
    buildingForm: z.string(),
    constructionMaterialType: z.string(),

    roomLayoutType: z.string(),
    roomLayoutTypeOther: z.string(),
    locationView: z.array(z.string()),
    groundFloorMaterial: z.string(),
    groundFloorMaterialOther: z.string(),
    upperFloorMaterial: z.string(),
    upperFloorMaterialOther: z.string(),
    bathroomFloorMaterial: z.string(),
    bathroomFloorMaterialOther: z.string(),
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
