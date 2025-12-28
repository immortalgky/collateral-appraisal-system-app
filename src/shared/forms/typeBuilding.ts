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
    isEncroached: z.boolean(),
    isEncroachedRemark: z.string(),
    encroachArea: z.coerce.number().nullable(),
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
    propertyName: z.string().nullable(),
    buildingNumber: z.string().nullable(),
    modelName: z.string().nullable(),
    houseNumber: z.string().nullable(),
    builtOnTitleNumber: z.string().nullable(),
    buildingDetail: BuildingDetailDto,
  })
  .passthrough();

export const CreateBuildingResponse = z.object({ isSuccess: z.boolean() }).passthrough();

export type CreateBuildingRequestType = z.infer<typeof CreateBuildingRequest>;
export type CreateBuildingResponseType = z.infer<typeof CreateBuildingResponse>;
