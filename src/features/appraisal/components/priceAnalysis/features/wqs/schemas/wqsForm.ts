import { z } from 'zod';

/** select surveys section */
const ComparativeFactors = z
  .object({
    factorCode: z.string(),
  })
  .passthrough();

const ComparativeSurveys = z.object({ marketId: z.string(), displaySeq: z.number() }).passthrough();

/** WQS scoring section */
const WQSSurveyScore = z
  .object({
    marketId: z.string(),
    surveyScore: z.number(),
    weightedSurveyScore: z.number(),
  })
  .passthrough();

const WQSScore = z
  .object({
    factorCode: z.string(),
    weight: z.number(),
    intensity: z.number(),
    weightedIntensity: z.number(),
    surveys: z.array(WQSSurveyScore),
    collateral: z.number(),
    collateralWeightedScore: z.number(),
  })
  .partial();

/** WQS calculation section */
const WQSCalculation = z
  .object({
    marketId: z.string(),
    offeringPrice: z.number().nullable(),
    offeringPriceMeasurementUnit: z.string().nullable(),
    offeringPriceAdjustmentPct: z.number().nullable(),
    offeringPriceAdjustmentAmt: z.number().nullable(),
    sellingPrice: z.number().nullable(),
    sellingPriceMeasurementUnit: z.string().nullable(),
    // sellingDate: z.date(), TODO
    sellingPriceAdjustmentYear: z.number().nullable(),
    totalAdjustedSellingPrice: z.number().nullable(),
    numberOfYears: z.number().nullable(),
    adjustedValue: z.number(),
  })
  .passthrough();

/** Adjust final price section */
const WQSFinalValue = z
  .object({
    finalValue: z.number(),
    finalValueRounded: z.number(),
    coefficientOfDecision: z.number(),
    standardError: z.number(),
    intersectionPoint: z.number(),
    slope: z.number(),
    lowestEstimate: z.number(),
    highestEstimate: z.number(),
    hasBuildingCost: z.boolean().optional(),
    includeLandArea: z.boolean().optional(),
    landArea: z.number().optional(),
    appraisalPrice: z.number(),
    appraisalPriceRounded: z.number(),
  })
  .passthrough();

export const TotalSurveyScore = z
  .object({
    marketId: z.string(),
    totalScore: z.number(),
    totalWeightedScore: z.number(),
  })
  .passthrough();

export const WQSTotalScore = z
  .object({
    totalWeight: z.number(),
    totalIntensity: z.number(),
    totalWeightedIntensity: z.number(),
    surveys: z.array(TotalSurveyScore),
    totalCollateralScore: z.number(),
    totalWeightedCollateralScore: z.number(),
  })
  .passthrough();

export const WQSDto = z
  .object({
    methodId: z.string(),
    collateralType: z.string(),
    pricingTemplateCode: z.string(),
    comparativeSurveys: z.array(ComparativeSurveys),
    comparativeFactors: z.array(ComparativeFactors),
    WQSScores: z.array(WQSScore),
    WQSTotalScores: WQSTotalScore,
    WQSCalculations: z.array(WQSCalculation),
    WQSFinalValue: WQSFinalValue,

    generateAt: z.string(),
  })
  .passthrough();

export type WQSSurveyScoreFormType = z.infer<typeof WQSSurveyScore>;
export type WQSScoreFormType = z.infer<typeof WQSScore>;
export type WQSCalculationFormType = z.infer<typeof WQSCalculation>;
export type WQSFinalValueFormType = z.infer<typeof WQSFinalValue>;
export type TotalSurveyScoreFormType = z.infer<typeof TotalSurveyScore>;
export type WQSTotalScoreFormType = z.infer<typeof WQSTotalScore>;

export type ComparativeFactorFormType = z.infer<typeof ComparativeFactors>;
export type WQSCalculationType = z.infer<typeof WQSCalculation>;
export type WQSFormType = z.infer<typeof WQSDto>;
