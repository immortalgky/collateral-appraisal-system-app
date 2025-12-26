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
export const CreateCollateralCondoRequest = z
  .object({
    propertyName: z.string().max(10),
    condoName: z.string(),
    roomNo: z.string(),
    floorNo: z.string(),
    buildingNo: z.string(),
    modelName: z.string(),
    builtOnTitleNumber: z.string(),
    condoRegistrationNumber: z.string(),

    usableArea: z.coerce.number(),

    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),

    latitude: z.coerce.number(),
    longitude: z.coerce.number(),

    landOffice: z.string(),
    condoDetail: CondoDetailDto,
  })
  .passthrough();

export const CreateCondoResponseType = z.object({ isSuccess: z.boolean() }).passthrough();

export type CreateCondoRequestType = z.infer<typeof CreateCollateralCondoRequest>;
export type AreaDetailDtoType = z.infer<typeof AreaDetailDto>;

export const CreateCollateralCondoRequestDefaults = {
  condoDetail: {
    areaDetails: [],
    verifiableOwner: false,
    isObligation: '0',
    decoration: '0',
    condoConditions: '0',
  },
};
