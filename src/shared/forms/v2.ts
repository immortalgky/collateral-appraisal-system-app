import { z } from 'zod';
import { pl } from 'zod/v4/locales';

export const LandTitleDto = z
  .object({
    titleDeedNo: z.string(),
    bookNo: z.string(),
    pageNo: z.string(),
    landNo: z.string(),
    surveyNo: z.string(),
    sheetNo: z.string(),
    rai: z.coerce.number(),
    ngan: z.coerce.number(),
    wa: z.coerce.number(),
    totalSqWa: z.coerce.number(),
    documentType: z.string(),
    rawang: z.string(),
    aerialPhotoNo: z.string(),
    aerialPhotoName: z.string(),
    boundaryMarker: z.string().nullable(),
    boundartMakerOther: z.string().nullable(),
    docValidate: z.string(),
    isMissedOutSurvey: z.boolean(),
    pricePerSquareWa: z.coerce.number(),
    governmentPrice: z.coerce.number(),
  })
  .partial()
  .passthrough();

export const LandDetailPageDto = z
  .object({
    verifiableOwner: z.boolean(),
    owner: z.string(),
    isObligation: z.string(),
    obligation: z.string(),
    landLocationVerification: z.boolean(),
    landCheckMethod: z.string(),
    landCheckOther: z.string(),
    street: z.string(),
    soi: z.string(),
    distance: z.string(),
    village: z.string(),
    addressLocation: z.string(),
    landShape: z.string(),
    urbanPlanningType: z.string(),
    location: z.array(z.string()),
    plotLocation: z.array(z.string()),
    plotLocationOther: z.string(),
    landFill: z.array(z.string()),
    landFillOther: z.string(),
    landFillPct: z.coerce.number(),
    soilLevel: z.coerce.number(),
    roadWidth: z.string(),
    rightOfWay: z.string(),
    wideFrontageOfLand: z.coerce.number(),
    noOfSideFacingRoad: z.coerce.number(),
    roadPassInFrontOfLand: z.string(),
    landAccessibility: z.string(),
    landAccessibilityDesc: z.string(),
    roadSurface: z.string(),
    roadSurfaceOther: z.string(),
    publicUtility: z.array(z.string()),
    publicUtilityOther: z.string(),
    landUse: z.array(z.string()),
    landUseOther: z.string(),
    landEntranceExit: z.array(z.string()),
    landEntranceExitOther: z.string(),
    transportation: z.array(z.string()),
    transportationOther: z.string(),
    anticipationOfProp: z.array(z.string()),
    isExpropriate: z.string(),
    isExpropriateRemark: z.string(),
    isLineExpropriate: z.string(),
    inLineExpropriateRemark: z.string(),
    royalDecree: z.string(),
    isEncroached: z.string(),
    isEncroachedRemark: z.string(),
    encroachArea: z.coerce.number(),
    electricity: z.string(),
    electricityDistance: z.coerce.number(),
    isLandlocked: z.string(),
    isLandlockedRemark: z.string(),
    isForestBoundary: z.string(),
    isForestBoundaryRemark: z.string(),
    limitationOther: z.string(),
    eviction: z.array(z.string()),
    evictionOther: z.string(),
    allocation: z.string(),
    n_ConsecutiveArea: z.string(),
    n_EstimateLength: z.coerce.number(),
    s_ConsecutiveArea: z.string(),
    s_EstimateLength: z.coerce.number(),
    e_ConsecutiveArea: z.string(),
    e_EstimateLength: z.coerce.number(),
    w_ConsecutiveArea: z.string(),
    w_EstimateLength: z.coerce.number(),
    pondArea: z.coerce.number(),
    depthPit: z.coerce.number(),
    hasBuilding: z.string(),
    hasBuildingOther: z.string(),
    remark: z.string(),
  })
  .partial()
  .passthrough();

export const CreateLandRequest = z
  .object({
    landTitle: z.array(LandTitleDto),
    propertyName: z.string(),
    latitude: z.string(),
    longitude: z.string(),
    subDistrict: z.string(),
    district: z.string(),
    province: z.string(),
    landOffice: z.string(),
    landDescription: z.string(),
    landDetail: LandDetailPageDto,
  })
  .passthrough();
export const CreateLandResponse = z.object({ id: z.coerce.number().int() }).passthrough();

export const schemas = {
  CreateLandRequest,
  LandTitleDto,
  LandDetailPageDto,
};

export type CreateLandRequestType = z.infer<typeof CreateLandRequest>;
export type CreateLandResponseType = z.infer<typeof CreateLandResponse>;
export type LandTitleDtoType = z.infer<typeof LandTitleDto>;
export type LandDetailPageDtoType = z.infer<typeof LandDetailPageDto>;
