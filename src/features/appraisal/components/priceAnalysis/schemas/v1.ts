import z from 'zod';

/** ================================ */
/** GetPropertyGroupById */
/** ================================ */
const PropertyGroupItemDto = z
  .object({ propertyId: z.string(), sequenceInGroup: z.number() })
  .passthrough();

export const GetPropertyGroupByIdRequest = z.object({}).passthrough();
export const GetPropertyGroupByIdResponse = z
  .object({
    id: z.string(),
    groupNumber: z.number(),
    groupName: z.string(),
    description: z.string().nullable().optional(),
    useSystemCalc: z.boolean(),
    properties: z.array(PropertyGroupItemDto),
  })
  .passthrough();
export type GetPropertyGroupByIdRequestType = z.infer<typeof GetPropertyGroupByIdRequest>;
export type GetPropertyGroupByIdResponseType = z.infer<typeof GetPropertyGroupByIdResponse>;

/** ================================ */
/** Add price analysis approach */
/** ================================ */
const AddPriceAnalysisApproachRequest = z.object({ approachType: z.string() }).passthrough();
const AddPriceAnalysisApproachResponse = z
  .object({ id: z.string(), approachType: z.string(), status: z.string() })
  .passthrough();

export type AddPriceAnalysisApproachRequestType = z.infer<typeof AddPriceAnalysisApproachRequest>;
export type AddPriceAnalysisApproachResponseType = z.infer<typeof AddPriceAnalysisApproachResponse>;

/** ================================ */
/** Save comparative analysis method */
/** ================================ */

export const ComparativeFactorInputDto = z
  .object({
    id: z.string().nullable().optional(),
    factorId: z.string(),
    displaySequence: z.number(),
    isSelectedForScoring: z.boolean(),
    remarks: z.string().nullable().optional(),
  })
  .passthrough();
export const FactorScoreInputDto = z
  .object({
    id: z.string().nullable().optional(),
    factorId: z.string(),
    marketComparableId: z.string().nullable().optional(),
    factorWeight: z.number(),
    displaySequence: z.number(),
    value: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
    adjustmentPct: z.number().nullable().optional(),
    remarks: z.string().nullable().optional(),
  })
  .passthrough();
const CalculationInputDto = z
  .object({
    marketComparableId: z.string(),
    offeringPrice: z.number().nullable().optional(),
    offeringPriceUnit: z.string().nullable().optional(),
    adjustOfferPricePct: z.number().nullable().optional(),
    sellingPrice: z.number().nullable().optional(),
    buySellYear: z.number().nullable().optional(),
    buySellMonth: z.number().nullable().optional(),
    adjustedPeriodPct: z.number().nullable().optional(),
    cumulativeAdjPeriod: z.number().nullable().optional(),
    totalAdjustedValue: z.number().nullable().optional(),
    weight: z.number().nullable().optional(),
  })
  .passthrough();

const SaveComparativeAnalysisRequest = z
  .object({
    comparativeFactors: z.array(ComparativeFactorInputDto),
    factorScores: z.array(FactorScoreInputDto),
    calculations: z.array(CalculationInputDto),
  })
  .passthrough();
const SaveComparativeAnalysisResponse = z
  .object({
    pricingAnalysisId: z.string(),
    methodId: z.string(),
    comparativeFactorsCount: z.number(),
    factorScoresCount: z.number(),
    calculationsCount: z.number(),
    success: z.boolean(),
  })
  .passthrough();
export type SaveComparativeAnalysisRequestType = z.infer<typeof SaveComparativeAnalysisRequest>;
export type SaveComparativeAnalysisResponseType = z.infer<typeof SaveComparativeAnalysisResponse>;

/** ================================ */
/** Add price analysis method */
/** ================================ */
const AddPriceAnalysisMethodRequest = z.object({ methodType: z.string() }).passthrough();
const AddPriceAnalysisMethodResponse = z
  .object({ id: z.string(), methodType: z.string(), status: z.string() })
  .passthrough();

export type AddPriceAnalysisMethodRequestType = z.infer<typeof AddPriceAnalysisMethodRequest>;
export type AddPriceAnalysisMethodResponseType = z.infer<typeof AddPriceAnalysisMethodResponse>;

/** ================================ */
/** Query price analysis approaches & methods */
/** ================================ */
const MethodDto = z
  .object({
    id: z.string(),
    methodType: z.string(),
    isCandidated: z.boolean(),
    appraisalValue: z.number().nullable().optional(),
  })
  .passthrough();

const ApproachDto = z
  .object({
    id: z.string(),
    approachType: z.string(),
    appraisalValue: z.number().nullable().optional(),
    isCandidated: z.boolean(),
    methods: z.array(MethodDto),
  })
  .passthrough();

export const GetPricingAnalysisRequest = z.object({ id: z.string() }).passthrough();
export const GetPricingAnalysisResponse = z
  .object({
    id: z.string(),
    propertyGroupId: z.string(),
    status: z.string(),
    finalMarketValue: z.number().nullable().optional(), // not sure
    finalAppraisedValue: z.number().nullable().optional(),
    finalForcedSaleValue: z.number().nullable().optional(), // not sure
    valuationDate: z.string().datetime().nullable().optional(),
    approaches: z.array(ApproachDto),
  })
  .passthrough();

/** ================================ */
/** Query comparative factor bu method id */
/** ================================ */
export const linkedComparableDto = z
  .object({
    linkId: z.string(),
    marketComparableId: z.string(),
    displaySequence: z.number(),
    comparableName: z.string().nullable().optional(),
    comparableCode: z.string().nullable().optional(),
  })
  .passthrough();

export const ComparativeFactorDto = z
  .object({
    id: z.string(),
    factorId: z.string(),
    factorName: z.string().nullable().optional(),
    factorCode: z.string().nullable().optional(),
    displaySequence: z.number(),
    isSelectedForScoring: z.boolean(),
    remarks: z.string().nullable().optional(),
  })
  .passthrough();

export const FactorScoreDto = z
  .object({
    id: z.string(),
    factorId: z.string(),
    factorName: z.string().nullable().optional(),
    marketComparableId: z.string().nullable().optional(),
    comparableName: z.string().nullable().optional(),
    factorWeight: z.number(),
    displaySequence: z.number(),
    value: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
    weightedScore: z.number().nullable().optional(),
    adjustmentPct: z.number().nullable().optional(),
    remarks: z.string().nullable().optional(),
  })
  .passthrough();

export const CalculationDto = z
  .object({
    id: z.string(),
    marketComparableId: z.string(),
    comparableName: z.string().nullable().optional(),
    offeringPrice: z.number().nullable().optional(),
    offeringPriceUnit: z.string().nullable().optional(),
    adjustOfferPricePct: z.number().nullable().optional(),
    sellingPrice: z.number().nullable().optional(),
    buySellYear: z.number().nullable().optional(),
    buySellMonth: z.number().nullable().optional(),
    adjustedPeriodPct: z.number().nullable().optional(),
    cumulativeAdjPeriod: z.number().nullable().optional(),
    totalFactorDiffPct: z.number().nullable().optional(),
    totalAdjustedValue: z.number().nullable().optional(),
  })
  .passthrough();

export const GetComparativeFactorsRequest = z.object({}).passthrough();
export const GetComparativeFactorsResponse = z
  .object({
    priceAnalysisId: z.string(),
    methodId: z.string(),
    methodType: z.string(),
    linkedComparables: z.array(linkedComparableDto),
    comparativeFactors: z.array(ComparativeFactorDto),
    factorScores: z.array(FactorScoreDto),
    calculations: z.array(CalculationDto),
  })
  .passthrough();
export type GetComparativeFactorsRequestType = z.infer<typeof GetComparativeFactorsRequest>;
export type GetComparativeFactorsResponseType = z.infer<typeof GetComparativeFactorsResponse>;

export type ApproachDtoType = z.infer<typeof ApproachDto>;
export type MethodDtoType = z.infer<typeof MethodDto>;
export type GetPricingAnalysisRequestType = z.infer<typeof GetPricingAnalysisRequest>;
export type GetPricingAnalysisResponseType = z.infer<typeof GetPricingAnalysisResponse>;
