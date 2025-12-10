import { z } from 'zod';

export const AreaDetailDto = z
  .object({
    areaDetail: z.string().optional(),
    area: z.coerce.number(),
  })
  .passthrough();

const ZeroOne = z.enum(['0', '1']);

const CondoDecorationDto = z
  .object({
    type: z.string().optional(),
    other: z.string().optional(),
  })
  .passthrough();

const RoomLayoutDto = z
  .object({
    type: z.string().optional(),
    other: z.string().optional(),
  })
  .passthrough();

const FlooringMaterialsDto = z
  .object({
    type: z.string().optional(),
    other: z.string().optional(),
  })
  .passthrough();

const BathroomFlooringMaterialsDto = z
  .object({
    type: z.string().optional(),
    other: z.string().optional(),
  })
  .passthrough();

const RoofDto = z
  .object({
    type: z.string().optional(),
    other: z.string().optional(),
  })
  .passthrough();

const CondoFacilityDto = z
  .object({
    type: z.string().optional(),
    other: z.string().optional(),
  })
  .passthrough();

const InForestBoundaryDto = z
  .object({
    type: ZeroOne.optional(),
    remarks: z.string().optional(),
  })
  .passthrough();

const checkOwerDto = z
  .object({
    type: ZeroOne,
    ownerName: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === '1' && (val.ownerName == '' || val.ownerName == undefined))
      ctx.addIssue({
        code: 'custom',
        message: 'Owner is required',
        path: ['ownerName'],
      });
  });

// ---------- Main request schema ----------

export const CreateCollateralCondoRequest = z
  .object({
    // --- Condo basic information (condoFields) ---
    propertyName: z.string(),
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

    checkOwner: checkOwerDto,

    condoConditions: z.string().optional(),

    // kept as "0" | "1" (map to boolean in backend if needed)
    isObligation: ZeroOne.optional(),
    obligation: z.string(),

    documentValidation: ZeroOne.optional(), // 0: Matched, 1: Not consistent

    // --- Location (condoLocationFields) ---
    isCondoLocationCorrect: ZeroOne.optional(), // 1: Correct, 0: Incorrect
    street: z.string().optional(),
    soi: z.string().optional(),
    distance: z.coerce.number().optional(),
    width: z.coerce.number().optional(),
    rightOfWay: z.coerce.number().optional(),
    roadSurface: ZeroOne.optional(), // 1: Correct, 0: Incorrect

    permanentElectricity: z.boolean().optional(),
    waterSupply: z.boolean().optional(),

    // --- Decoration (condoDecorationFields) ---
    decoration: CondoDecorationDto,

    // --- Age / Height (ageHeightCondoFields) ---
    buildingYear: z.coerce.number().optional(),
    totalFloor: z.coerce.number().optional(),

    // --- Construction Materials (constructionMaterialsFormFields) ---
    constructionMaterials: z.string().optional(),

    // --- Room Layout (condoRoomLayoutFormFields) ---
    roomLayout: RoomLayoutDto,

    // --- Location View (locationViewFormFields) ---
    locationView: z
      .enum([
        '0', // Pool View
        '1', // River View
        '2', // Clubhouse View
        '3', // Near Elevator
        '4', // Near Trash
        '5', // Corner
        '6', // Garden
        '7', // City
        '8', // Sea
        '9', // Mountain
        '10', // Central
      ])
      .optional(),

    // --- Floor (floorFormFields) ---
    groundFlooringMaterials: FlooringMaterialsDto.optional(),
    upperFlooringMaterials: FlooringMaterialsDto.optional(),
    bathroomFlooringMaterials: BathroomFlooringMaterialsDto.optional(),

    // --- Roof (roofFormFields) ---
    roof: RoofDto.optional(),

    // --- Expropriation (expropriationFields) ---
    expropriation: ZeroOne.optional(),
    royalDecree: z.string().optional(),

    // --- Condo Facility (condoFacilityFields) ---
    condoFacility: CondoFacilityDto.optional(),

    // --- Environment (enviromentFields) ---
    condoEnvironment: ZeroOne.optional(),

    // --- In Forest Boundary (inForestBoundaryFormFields) ---
    inForestBoundary: InForestBoundaryDto.optional(),

    // --- Area details (AreaDetailForm) ---
    areaDetails: z.array(AreaDetailDto).optional(),

    // --- Remarks ---
    remarks: z.string().optional(),
  })
  .passthrough();

export type CreateCollateralCondoRequestType = z.infer<typeof CreateCollateralCondoRequest>;
export type AreaDetailDtoType = z.infer<typeof AreaDetailDto>;

export const CreateCollateralCondoRequestDefaults = {
  areaDetails: [],
  decoration: { type: '', other: '' },
  roomLayout: { type: '', other: '' },
  groundFlooringMaterials: { type: '', other: '' },
  upperFlooringMaterials: { type: '', other: '' },
  bathroomFlooringMaterials: { type: '', other: '' },
  roof: { type: '', other: '' },
  condoFacility: { type: '', other: '' },
};
