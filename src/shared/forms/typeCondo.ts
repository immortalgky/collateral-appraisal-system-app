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

// ---------- Main request schema ----------

export const CreateCollateralCondoRequest = z
  .object({
    // --- Condo basic information (condoFields) ---
    propertyName: z.string().max(10),
    condoName: z.string(),
    roomNo: z.string(),
    floorNo: z.string(),
    buildingNo: z.string(),
    modelName: z.string(),
    constructionOnTitleDeedNo: z.string(),
    condominiumRegistrationNo: z.string(),

    usableArea: z.coerce.number(),

    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),

    latitude: z.coerce.number(),
    longitude: z.coerce.number(),

    landOffice: z.string(),

    verifiableOwner: z.string(),
    owner: z.string(),

    condoConditions: z.string().optional(),

    isObligation: z.string(),
    obligation: z.string(),

    documentValidation: ZeroOne.optional(),

    // --- Location (condoLocationFields) ---
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

    // --- Decoration (condoDecorationFields) ---
    decoration: z.string(),
    decorationOther: z.string(),

    // --- Age / Height (ageHeightCondoFields) ---
    buildingYear: z.coerce.number().optional(),
    totalFloor: z.coerce.number().optional(),

    // --- Construction Materials (constructionMaterialsFormFields) ---
    constructionMaterials: z.string().optional(),

    // --- Room Layout (condoRoomLayoutFormFields) ---
    roomLayout: z.string().optional(),
    roomLayoutOther: z.string().optional(),

    // --- Location View (locationViewFormFields) ---
    locationView: z.string().optional(),

    // --- Floor (floorFormFields) ---
    groundFlooringMaterial: z.string().optional(),
    groundFlooringMaterialOther: z.string().optional(),
    upperFlooringMaterial: z.string().optional(),
    bathroomFlooringMaterials: z.string().optional(),

    // --- Roof (roofFormFields) ---
    roof: z.string().optional(),
    roofOther: z.string().optional(),

    // --- Expropriation (expropriationFields) ---
    expropriation: ZeroOne.optional(),
    royalDecree: z.string().optional(),

    // --- Condo Facility (condoFacilityFields) ---
    condoFacility: z.string().optional(),
    condoFacilityOther: z.string().optional(),

    // --- Environment (enviromentFields) ---
    condoEnvironment: z.string().optional(),

    // --- In Forest Boundary (inForestBoundaryFormFields) ---
    inForestBoundary: z.string().optional(),
    inForestBoundaryRemark: z.string().optional(),

    // --- Area details (AreaDetailForm) ---
    areaDetails: z.array(AreaDetailDto).optional(),

    // --- Remarks ---
    remarks: z.string().optional(),

    isBuilding: z.array(BuildingDetailDto).optional(),
  })
  .passthrough();

export type CreateCollateralCondoRequestType = z.infer<typeof CreateCollateralCondoRequest>;
export type AreaDetailDtoType = z.infer<typeof AreaDetailDto>;

export const CreateCollateralCondoRequestDefaults = {
  areaDetails: [],
  isBuilding: [],
  verifiableOwner: '',
};
