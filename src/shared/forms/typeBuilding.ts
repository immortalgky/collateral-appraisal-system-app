import { z } from 'zod';

export const SurfaceDto = z.object({
  fromFloorNumber: z.coerce.number(),
  toFloorNumber: z.coerce.number(),
  floorType: z.string(),
  floorStructure: z.string(),
  floorSurface: z.string(),
});

export const BuildingDepreciationMethodDto = z.object({
  fromYear: z.coerce.number().max(30, { message: 'Max value must not exceed 30' }),
  toYear: z.coerce.number(),
  depreciationPercentPerYear: z.coerce.number(),
  totalDepreciationPercent: z.coerce.number(),
  depreciationPrice: z.coerce.number(),
});

export const BuildingDepreciationDetail = z.object({
  seq: z.coerce.number(),
  areaDescription: z.string().nullable(),
  area: z.coerce.number(),
  isBuilding: z.boolean(),
  pricePerSqMeterBeforeDepreciation: z.coerce.number(),
  totalPriceBeforeDepreciation: z.coerce.number(),
  year: z.coerce.number(),
  totalDepreciationPercentPerYear: z.coerce.number(),
  totalDepreciationPercent: z.coerce.number(),
  depreciationMethod: z.string(),
  totalDepreciationPrice: z.coerce.number(),
  pricePerSqMeterAfterDepreciation: z.coerce.number(),
  totalPriceAfterDepreciation: z.coerce.number(),
  buildingDepreciationMethods: z.array(BuildingDepreciationMethodDto),
});

export const BuildingDetailDto = z
  .object({
    verifiableOwner: z.boolean(),
    owner: z.string().nullable(),
    noHouseNumber: z.string().nullable(),
    buildingCondition: z.string().nullable(),
    underConst: z.string().nullable(),
    constCompletionPct: z.coerce.number(),
    licenseExpirationDate: z.string().datetime({ offset: true }).nullable(),
    isAppraise: z.boolean(),
    isObligation: z.string(),
    obligation: z.string().nullable(),
    buildingType: z.string(),
    buidingTypeOther: z.string().nullable(),
    totalFloor: z.coerce.number(),
    decoration: z.string(),
    decorationOther: z.string(),
    isEncroachingOthers: z.boolean(),
    encroachingOthersRemark: z.string(),
    encroachingOthersArea: z.coerce.number(),
    buildingMaterial: z.string().nullable(),
    buildingStyle: z.string().nullable(),
    isResidential: z.boolean(),
    buildingAge: z.coerce.number(),
    dueTo: z.string().nullable(),
    constStyle: z.string().nullable(),
    constStyleRemark: z.string().nullable(),
    generalStructure: z.array(z.string()),
    generalStructureOther: z.string().nullable(),
    roofFrame: z.array(z.string()),
    roofFrameOther: z.string(),
    roof: z.array(z.string()),
    roofOther: z.string().nullable(),
    ceiling: z.array(z.string()),
    ceilingOther: z.string().nullable(),
    interiorWall: z.array(z.string()),
    interiorWallOther: z.string().nullable(),
    exteriorWall: z.array(z.string()),
    exteriorWallOther: z.string().nullable(),
    surface: SurfaceDto.nullable(),
    fence: z.array(z.string()),
    fenceOther: z.string().nullable(),
    constType: z.string().nullable(),
    constTypeOther: z.string().nullable(),
    utilization: z.string().nullable(),
    buildingArea: z.coerce.number(),
    buildingDepreciationDetails: z.array(BuildingDepreciationDetail),
    useForOtherPurpose: z.string().nullable(),
    remark: z.string().nullable(),
  })
  .partial()
  .passthrough();

export const CreateBuildingRequest = z
  .object({
    ownerName: z.string(),

    propertyName: z.string(),
    buildingNumber: z.string(),
    modelName: z.string(),
    builtOnTitleNumber: z.string(),

    isOwnerVerified: z.boolean(),
    houseNumber: z.string(),

    buildingCondition: z.string(),
    isUnderConstruction: z.boolean(),
    constructionCompletionPercent: z.coerce.number(),
    constructionLicenseExpirationDate: z.string().datetime({ offset: true }),
    isAppraisable: z.boolean(),
    hasObligation: z.boolean(),
    obligationDetails: z.string(),

    buildingType: z.string(),
    buildingTypeOther: z.string(),
    numberOfFloors: z.coerce.number(),
    decorationType: z.string(),
    decorationtypeOther: z.string(),
    isEncroachingOthers: z.boolean(),
    encroachingOthersRemark: z.string(),
    encroachingOthersArea: z.coerce.number(),

    buildingMaterial: z.string(),
    buildingStyle: z.string(),
    isResidential: z.boolean(),
    buildingAge: z.coerce.number(),
    isResidentialRemark: z.string(),
    constructionStyleRemark: z.string(),
    constructionStyleType: z.string(),

    structureType: z.array(z.string()),
    structureTypeOther: z.string(),
    roofFrameType: z.array(z.string()),
    roofFrameTypeOther: z.string(),
    roofType: z.array(z.string()),
    roofTypeOther: z.string(),
    ceilingType: z.array(z.string()),
    ceilingTypeOther: z.string(),
    interiorWallType: z.array(z.string()),
    interiorWallTypeOther: z.string(),
    exteriorWallType: z.array(z.string()),
    exteriorWallTypeOther: z.string(),
    surface: SurfaceDto.nullable(),
    fenceType: z.array(z.string()),
    fenceTypeOther: z.string(),
    constructionType: z.string(),
    constructionTypeOther: z.string(),

    utilizationType: z.string(),
    otherPurposeUsage: z.string(),

    buildingDepreciationDetails: z.array(BuildingDepreciationDetail),

    totalBuildingArea: z.coerce.number(),
    buildingInsurancePrice: z.coerce.number(),
    sellingPrice: z.coerce.number(),
    forcedSalePrice: z.coerce.number(),

    remark: z.string(),
  })
  .passthrough();

export const UpdateBuildingRequest = z
  .object({
    ownerName: z.string(),

    propertyName: z.string(),
    buildingNumber: z.string(),
    modelName: z.string(),
    builtOnTitleNumber: z.string(),

    isOwnerVerified: z.boolean(),
    houseNumber: z.string(),

    buildingCondition: z.string(),
    isUnderConstruction: z.boolean(),
    constructionCompletionPercent: z.coerce.number(),
    constructionLicenseExpirationDate: z.string().datetime({ offset: true }),
    isAppraisable: z.boolean(),
    hasObligation: z.boolean(),
    obligationDetails: z.string(),

    buildingType: z.string(),
    buildingTypeOther: z.string(),
    numberOfFloors: z.coerce.number(),
    decorationType: z.string(),
    decorationtypeOther: z.string(),
    isEncroachingOthers: z.boolean(),
    encroachingOthersRemark: z.string(),
    encroachingOthersArea: z.coerce.number(),

    buildingMaterial: z.string(),
    buildingStyle: z.string(),
    isResidential: z.boolean(),
    buildingAge: z.coerce.number(),
    isResidentialRemark: z.string(),
    constructionStyleRemark: z.string(),
    constructionStyleType: z.string(),

    structureType: z.array(z.string()),
    structureTypeOther: z.string(),
    roofFrameType: z.array(z.string()),
    roofFrameTypeOther: z.string(),
    roofType: z.array(z.string()),
    roofTypeOther: z.string(),
    ceilingType: z.array(z.string()),
    ceilingTypeOther: z.string(),
    interiorWallType: z.array(z.string()),
    interiorWallTypeOther: z.string(),
    exteriorWallType: z.array(z.string()),
    exteriorWallTypeOther: z.string(),
    surface: SurfaceDto.nullable(),
    fenceType: z.array(z.string()),
    fenceTypeOther: z.string(),
    constructionType: z.string(),
    constructionTypeOther: z.string(),

    utilizationType: z.string(),
    otherPurposeUsage: z.string(),

    buildingDepreciationDetails: z.array(BuildingDepreciationDetail),

    totalBuildingArea: z.coerce.number(),
    buildingInsurancePrice: z.coerce.number(),
    sellingPrice: z.coerce.number(),
    forcedSalePrice: z.coerce.number(),

    remark: z.string(),
  })
  .passthrough();

export const GetBuildingPropertyByIdResult = z
  .object({
    ownerName: z.string(),

    propertyName: z.string(),
    buildingNumber: z.string(),
    modelName: z.string(),
    builtOnTitleNumber: z.string(),

    isOwnerVerified: z.boolean(),
    houseNumber: z.string(),

    buildingConditionType: z.string(),
    isUnderConstruction: z.boolean(),
    constructionCompletionPercent: z.coerce.number(),
    constructionLicenseExpirationDate: z.string().datetime({ local: true }),
    isAppraisable: z.boolean(),
    hasObligation: z.boolean(),
    obligationDetails: z.string(),

    buildingType: z.string(),
    buildingTypeOther: z.string(),
    numberOfFloors: z.coerce.number(),
    decorationType: z.string(),
    decorationtypeOther: z.string(),
    isEncroachingOthers: z.boolean(),
    encroachingOthersRemark: z.string(),
    encroachingOthersArea: z.coerce.number(),

    buildingMaterialType: z.string(),
    buildingStyleType: z.string(),
    isResidential: z.boolean(),
    buildingAge: z.coerce.number(),
    constructionYear: z.coerce.number(),
    residentialRemark: z.string(),
    constructionStyleRemark: z.string(),
    constructionStyleType: z.string(),

    structureType: z.array(z.string()),
    structureTypeOther: z.string(),
    roofFrameType: z.array(z.string()),
    roofFrameTypeOther: z.string(),
    roofType: z.array(z.string()),
    roofTypeOther: z.string(),
    ceilingType: z.array(z.string()),
    ceilingTypeOther: z.string(),
    interiorWallType: z.array(z.string()),
    interiorWallTypeOther: z.string(),
    exteriorWallType: z.array(z.string()),
    exteriorWallTypeOther: z.string(),
    surface: SurfaceDto.nullable(),
    fenceType: z.array(z.string()),
    fenceTypeOther: z.string(),
    constructionType: z.string(),
    constructionTypeOther: z.string(),

    utilizationType: z.string(),
    utilizationTypeOther: z.string(),

    buildingDepreciationDetails: z.array(BuildingDepreciationDetail),

    totalBuildingArea: z.coerce.number(),
    buildingInsurancePrice: z.coerce.number(),
    sellingPrice: z.coerce.number(),
    forcedSalePrice: z.coerce.number(),

    remark: z.string(),
  })
  .passthrough();

export const CreateBuildingResponse = z.object({ isSuccess: z.boolean() }).passthrough();
export const UpdateBuildingResponse = z.object({ isSuccess: z.boolean() }).passthrough();

export type GetBuildingPropertyByIdResultType = z.infer<typeof GetBuildingPropertyByIdResult>;
export type CreateBuildingRequestType = z.infer<typeof CreateBuildingRequest>;
export type CreateBuildingResponseType = z.infer<typeof CreateBuildingResponse>;
export type UpdateBuildingRequestType = z.infer<typeof UpdateBuildingRequest>;
export type UpdateBuildingResponseType = z.infer<typeof UpdateBuildingResponse>;
