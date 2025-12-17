import { z } from 'zod';

export const SurfaceDto = z.object({
  fromFloorNumber: z.coerce.number(),
  toFloorNumber: z.coerce.number(),
  floorType: z.string(),
  floorStructure: z.string(),
  floorSurface: z.string(),
});

export const BuildingDetailDto = z
  .object({
    verifiableOwner: z.boolean(),
    owner: z.string(),
    noHouseNumber: z.string(),
    buildingCondition: z.string(),
    underConst: z.string(),
    constCompletionPct: z.coerce.number(),
    licenseExpirationDate: z.string().datetime({ offset: true }),
    isAppraise: z.boolean(),
    isObligation: z.string(),
    obligation: z.string(),
    buildingType: z.string(),
    buidingTypeOther: z.string(),
    totalFloor: z.coerce.number(),
    decoration: z.string(),
    decorationOther: z.string(),
    isEncroached: z.boolean(),
    isEncroachedRemark: z.string(),
    encroachArea: z.coerce.number(),
    buildingMaterial: z.string(),
    buildingStyle: z.string(),
    isResidential: z.boolean(),
    buildingAge: z.coerce.number(),
    dueTo: z.string(),
    constStyle: z.string(),
    constStyleRemark: z.string(),
    generalStructure: z.array(z.string()),
    generalStructureOther: z.string(),
    roofFrame: z.array(z.string()),
    roofFrameOther: z.string(),
    roof: z.array(z.string()),
    roofOther: z.string(),
    ceiling: z.array(z.string()),
    ceilingOther: z.string(),
    interiorWall: z.array(z.string()),
    interiorWallOther: z.string(),
    exteriorWall: z.array(z.string()),
    exteriorWallOther: z.string(),
    surface: SurfaceDto.nullable(),
    fence: z.array(z.string()),
    fenceOther: z.string(),
    constType: z.string(),
    constTypeOther: z.string(),
    utilization: z.string(),
    useForOtherPurpose: z.string(),
    buildingArea: z.coerce.number(),
    remark: z.string(),
  })
  .partial()
  .passthrough();

export const CreateBuidlingRequest = z
  .object({
    propertyName: z.string(),
    buildingNumber: z.string(),
    modelName: z.string(),
    houseNumber: z.string(),
    builtOnTitleNumber: z.string(),
    buildingDetail: BuildingDetailDto,
  })
  .passthrough();

export const CreateBuidlingResponse = z.object({ id: z.coerce.number().int() }).passthrough();

export type CreateBuildingRequestType = z.infer<typeof CreateBuidlingRequest>;
export type CreateBuildingResponseType = z.infer<typeof CreateBuidlingResponse>;
