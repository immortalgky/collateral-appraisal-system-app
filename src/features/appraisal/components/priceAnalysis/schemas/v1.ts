import z from 'zod';

/** ================================ */
/** GetPropertyGroupById */
/** ================================ */
const PropertyGroupItemDto = z
  .object({ propertyId: z.string().uuid(), sequenceInGroup: z.number() })
  .passthrough();

export const GetPropertyGroupByIdRequest = z.object({}).passthrough();
export const GetPropertyGroupByIdResponse = z
  .object({
    id: z.string().uuid(),
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

const ComparativeFactorInputDto = z
  .object({
    id: z.string().uuid().nullable().optional(),
    factorId: z.string().uuid(),
    displaySequence: z.number(),
    isSelectedForScoring: z.boolean(),
    remarks: z.string().nullable().optional(),
  })
  .passthrough();
const FactorScoreInputDto = z
  .object({
    id: z.string().uuid().nullable().optional(),
    factorId: z.string().uuid(),
    marketComparableId: z.string().uuid().nullable().optional(),
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
    marketComparableId: z.string().uuid(),
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

export const SaveComparativeAnalysisRequest = z
  .object({
    comparativeFactors: z.array(ComparativeFactorInputDto),
    factorScores: z.array(FactorScoreInputDto),
    calculations: z.array(CalculationInputDto),
  })
  .passthrough();
export const SaveComparativeAnalysisResponse = z
  .object({
    pricingAnalysisId: z.string().uuid(),
    methodId: z.string().uuid(),
    comparativeFactorsCount: z.number(),
    factorScoresCount: z.number(),
    calculationsCount: z.number(),
    success: z.boolean(),
  })
  .passthrough();

export type ComparativeFactorInputType = z.infer<typeof ComparativeFactorInputDto>;
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
    id: z.string().uuid(),
    methodType: z.string(),
    isCandidated: z.boolean(),
    appraisalValue: z.number().nullable().optional(),
  })
  .passthrough();

const ApproachDto = z
  .object({
    id: z.string().uuid(),
    approachType: z.string(),
    appraisalValue: z.number().nullable().optional(),
    isCandidated: z.boolean(),
    methods: z.array(MethodDto),
  })
  .passthrough();

export const GetPricingAnalysisRequest = z.object({ id: z.string() }).passthrough();
export const GetPricingAnalysisResponse = z
  .object({
    id: z.string().uuid(),
    propertyGroupId: z.string().uuid(),
    status: z.string(),
    finalMarketValue: z.number().nullable().optional(), // not sure
    finalAppraisedValue: z.number().nullable().optional(),
    finalForcedSaleValue: z.number().nullable().optional(), // not sure
    valuationDate: z.string().datetime().nullable().optional(),
    approaches: z.array(ApproachDto),
  })
  .passthrough();

export type ApproachType = z.infer<typeof ApproachDto>;
export type MethodType = z.infer<typeof MethodDto>;
export type GetPricingAnalysisRequestType = z.infer<typeof GetPricingAnalysisRequest>;
export type GetPricingAnalysisResponseType = z.infer<typeof GetPricingAnalysisResponse>;

/** ================================ */
/** Query comparative factor bu method id */
/** ================================ */
export const linkedComparableDto = z
  .object({
    linkId: z.string().uuid(),
    marketComparableId: z.string().uuid(),
    displaySequence: z.number(),
    comparableName: z.string().nullable().optional(),
    comparableCode: z.string().nullable().optional(),
  })
  .passthrough();

export const ComparativeFactorDto = z
  .object({
    id: z.string().uuid().nullable().optional(),
    factorId: z.string().uuid(),
    factorName: z.string().nullable().optional(),
    factorCode: z.string().nullable().optional(),
    displaySequence: z.number(),
    isSelectedForScoring: z.boolean(),
    remarks: z.string().nullable().optional(),
  })
  .passthrough();

export const FactorScoreDto = z
  .object({
    id: z.string().uuid().nullable().optional(),
    factorId: z.string().uuid(),
    factorName: z.string().nullable().optional(),
    marketComparableId: z.string().uuid().nullable().optional(),
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
    id: z.string().uuid(),
    marketComparableId: z.string().uuid(),
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
    priceAnalysisId: z.string().uuid(),
    methodId: z.string().uuid(),
    methodType: z.string(),
    linkedComparables: z.array(linkedComparableDto),
    comparativeFactors: z.array(ComparativeFactorDto),
    factorScores: z.array(FactorScoreDto),
    calculations: z.array(CalculationDto),
  })
  .passthrough();
export type FactorScoreType = z.infer<typeof FactorScoreDto>;
export type GetComparativeFactorsRequestType = z.infer<typeof GetComparativeFactorsRequest>;
export type GetComparativeFactorsResponseType = z.infer<typeof GetComparativeFactorsResponse>;

/** ================================ */
/** Query method's template by method type */
/** ================================ */
const TemplateComparativeFactorDto = z.object({
  id: z.string().uuid(),
  factorCode: z.string(),
});
const TemplateCalculationFactorDto = z
  .object({
    id: z.string().uuid(),
    factorCode: z.string(),
    weight: z.number().nullable().optional(),
    intensity: z.number().nullable().optional(),
  })
  .passthrough();

const TemplateDetailDto = z
  .object({
    templateCode: z.string(),
    templateName: z.string(),
    collateralType: z.string(),
    comparativeFactors: z.array(TemplateComparativeFactorDto).optional().nullable(),
    calculationFactors: z.array(TemplateCalculationFactorDto).optional().nullable(),
  })
  .optional();

export const GetPricingTemplateByMethodRequest = z.object({}).passthrough();
export const GetPricingTemplateByMethodResponse = z
  .object({
    templates: z.array(TemplateDetailDto).nullable().optional(),
  })
  .passthrough();

export type TemplateComparativeFactorType = z.infer<typeof TemplateComparativeFactorDto>;
export type TemplateCalculationFactorType = z.infer<typeof TemplateCalculationFactorDto>;
export type TemplateDetailType = z.infer<typeof TemplateDetailDto>;
export type GetPricingTemplatesByMethodRequestType = z.infer<
  typeof GetPricingTemplateByMethodRequest
>;
export type GetPricingTemplatesByMethodResponseType = z.infer<
  typeof GetPricingTemplateByMethodResponse
>;

/** ================================ */
/** Query market comparables */
/** ================================ */
const MarketComparableDataDto = z
  .object({
    id: z.string().uuid(),
    comparableNumber: z.string(),
    propertyType: z.string(),
    surveyName: z.string(),
    infoDateTime: z.string().datetime().nullable().optional(),
    sourceInfo: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    createdOn: z.string().datetime().nullable().optional(),
  })
  .passthrough();

export const GetMarketComparablesRequest = z.object({}).passthrough();
export const GetMarketComparablesResponse = z
  .object({
    marketComparables: z.array(MarketComparableDataDto),
  })
  .passthrough();

export type MarketComparableDataType = z.infer<typeof MarketComparableDataDto>;
export type GetMarketComparablesRequestType = z.infer<typeof GetMarketComparablesRequest>;
export type GetMarketComparablesResponseType = z.infer<typeof GetMarketComparablesResponse>;

/** ================================ */
/** Query market comparable by Id */
/** GET /market-comparables/{id:guid} */
/** ================================ */
const FactorDataDto = z
  .object({
    id: z.string().uuid(),
    factorCode: z.string(),
    factorName: z.string(),
    fieldName: z.string(),
    dataType: z.string(),
    fieldLength: z.number().nullable().optional(),
    fieldDecimal: z.number().nullable().optional(),
    parameterGroup: z.string().nullable().optional(),
    value: z.string().nullable().optional(),
    otherRemarks: z.string().nullable().optional(),
  })
  .passthrough();
export type FactorDataType = z.infer<typeof FactorDataDto>;

const MarketComparableDetailDto = z
  .object({
    id: z.string().uuid(),
    comparableNumber: z.string(),
    propertyType: z.string(),
    surveyName: z.string(),

    // Data Information
    infoDateTime: z.string().datetime().nullable().optional(),
    sourceInfo: z.string().nullable().optional(),

    // Notes
    notes: z.string().nullable().optional(),

    // Template Reference
    templateId: z.string().uuid().nullable().optional(),

    // Audit
    createdOn: z.string().datetime().nullable().optional(),
    createdBy: z.string().nullable().optional(),
    updatedOn: z.string().datetime().nullable().optional(),
    updatedBy: z.string().nullable().optional(),

    // Child collections
    factorData: z.array(FactorDataDto).nullable().optional(),
    //  List<ImageDto> Images;
  })
  .passthrough();

export const GetMarketComparableByIdRequest = z.object({}).passthrough();
export const GetMarketComparableByIdResponse = MarketComparableDetailDto;

export type MarketComparableDetailType = z.infer<typeof MarketComparableDetailDto>;
export type GetMarketComparableByIdRequestType = z.infer<typeof GetMarketComparableByIdRequest>;
export type GetMarketComparableByIdResponseType = z.infer<typeof GetMarketComparableByIdResponse>;

/** ================================ */
/** Query pricing analysis configuration */
/** ================================ */
const PriceAnalysisConfigDto = z
  .object({
    id: z.string(),
    approachType: z.string(),
    label: z.string(),
    icon: z.string(),
    appraisalValue: z.number().nullable().optional(),
    methods: z.array(
      z
        .object({
          id: z.string(),
          methodType: z.string(),
          icon: z.string(),
          label: z.string(),
          appraisalValue: z.number().nullable().optional(),
          configurations: z.array(
            z
              .object({
                type: z.string(),

                // sale grid & direct configs
                showQualitativeSection: z.boolean().nullable().optional(),
                showInitialPriceSection: z.boolean().nullable().optional(),
                showSecondRevisionSection: z.boolean().nullable().optional(),
                showAdjustedValueSection: z.boolean().nullable().optional(),
                showAdjustedWeightSection: z.boolean().nullable().optional(),
                showAdjustFinalValueSection: z.boolean().nullable().optional(),
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
  })
  .passthrough();
export const PriceAnalysisConfigResponse = z.object({
  approaches: z.array(PriceAnalysisConfigDto),
});
export type PriceAnalysisConfigType = z.infer<typeof PriceAnalysisConfigDto>;
export type PriceAnalysisConfigResponseType = z.infer<typeof PriceAnalysisConfigResponse>;
