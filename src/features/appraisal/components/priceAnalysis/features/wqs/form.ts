import { z } from 'zod';

const WQSCalculation = z
  .object({
    marketId: z.string(),
    offeringPrice: z.number(),
    offeringPriceMeasurementUnit: z.string(),
    offeringPriceAdjustmentPct: z.number(),
    offeringPriceAdjustmentAmt: z.number(),
    sellingPrice: z.number(),
    sellingPriceMeasurementUnit: z.string(),
    sellingDate: z.date(),
    sellingPriceAdjustmentYear: z.number(),
    numberOfYears: z.number(),
  })
  .passthrough();

const WQSSurveyScore = z.object({
  marketId: z.string(),
  surveyScore: z.number(),
});

const WQSScore = z
  .object({
    factorCode: z.string(),
    weight: z.number(),
    intensity: z.number(),
    surveys: z.array(WQSSurveyScore),
    collateral: z.number(),
  })
  .passthrough();

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
    hasBuildingCost: z.boolean().nullable(),
    includeLandArea: z.boolean().nullable(),
    landArea: z.number().nullable(),
    appraisalPriceRounded: z.number(),
  })
  .passthrough();

export const WQSDto = z
  .object({
    methodId: z.string(),
    collateralType: z.string(),
    pricingTemplateCode: z.string(),
    finalValue: z.number(),
    comparativeSurveys: z.array(ComparativeSurveys),
    comparativeFactors: z.array(ComparativeFactors),
    WQSScores: z.array(WQSScore),
    WQSCalculations: z.array(WQSCalculation),
    WQSFinalValue: WQSFinalValue,
  })
  .passthrough();

export type WQSRequestType = z.infer<typeof WQSDto>;
