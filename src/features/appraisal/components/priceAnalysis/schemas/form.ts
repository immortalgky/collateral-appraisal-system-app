import { z } from 'zod';

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
    numberOfYears: z.number().nullable(),
  })
  .passthrough();

const WQSSurveyScore = z
  .object({
    marketId: z.string(),
    surveyScore: z.number(),
  })
  .passthrough();

const WQSScore = z
  .object({
    factorCode: z.string(),
    weight: z.number(),
    intensity: z.number(),
    surveys: z.array(WQSSurveyScore),
    collateral: z.number(),
  })
  .partial();

const ComparativeFactors = z
  .object({
    factorCode: z.string(),
  })
  .passthrough();

const ComparativeSurveys = z.object({ marketId: z.string(), displaySeq: z.number() }).passthrough();

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

export const WQSDto = z
  .object({
    methodId: z.string(),
    collateralType: z.string(),
    pricingTemplateCode: z.string(),
    comparativeSurveys: z.array(ComparativeSurveys),
    comparativeFactors: z.array(ComparativeFactors),
    WQSScores: z.array(WQSScore),
    WQSCalculations: z.array(WQSCalculation),
    WQSFinalValue: WQSFinalValue,
  })
  .passthrough();

export type WQSRequestType = z.infer<typeof WQSDto>;
