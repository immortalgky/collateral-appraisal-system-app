import { z } from 'zod';

const ComparativeFactors = z
  .object({
    factorCode: z.string(),
  })
  .passthrough();

const ComparativeSurveys = z.object({ marketId: z.string(), displaySeq: z.number() }).passthrough();

const DirectComparisonQualitativeSurvey = z
  .object({
    marketId: z.string(),
    qualitativeLevel: z.string(),
  })
  .passthrough();

const DirectComparisonQualitative = z.object({
  factorCode: z.string(),
  qualitatives: z.array(DirectComparisonQualitativeSurvey),
});

const DirectComparisonCalculation = z
  .object({
    marketId: z.string(),
    offeringPrice: z.number().nullable(),
    // offeringPriceMeasurementUnit: z.string().nullable(),
    offeringPriceAdjustmentPct: z.number().nullable(),
    offeringPriceAdjustmentAmt: z.number().nullable(),
    sellingPrice: z.number().nullable(),
    // sellingPriceMeasurementUnit: z.string().nullable(),
    // sellingDate: z.date(), TODO
    sellingPriceAdjustmentYear: z.number().nullable(),
    numberOfYears: z.number().nullable(),
    adjustedValue: z.number(),

    // 2nd revision
    landAreaOfDeficient: z.number().nullable().optional(),
    // landAreaOfDeficientMeasureUnit: z.number().nullable(),
    landPrice: z.number().nullable().optional(),
    landPriceMeasureUnit: z.number().nullable().optional(),
    landValueIncreaseDecrease: z.number().nullable().optional(),
    usableAreaOfDeficient: z.number().nullable().optional(),
    // usableAreaOfDeficientMeasureUnit: z.number().nullable(),
    usableAreaPrice: z.number().nullable().optional(),
    usableAreaPriceMeasureUnit: z.number().nullable().optional(),
    buildingValueIncreaseDecrease: z.number().nullable().optional(),
    totalSecondRevision: z.number().nullable(),

    // adjusted value
    factorDiffPct: z.number(),
    factorDiffAmt: z.number(),
    totalAdjustValue: z.number(),

    // adjust weight
    weight: z.number(),
    weightedAdjustValue: z.number(),
  })
  .passthrough();

const DirectComparisonFinalValue = z
  .object({
    finalValue: z.number(),
    finalValueRounded: z.number(),
  })
  .passthrough();

const DirectComparisonAdjustmentPct = z
  .object({
    marketId: z.string(),
    adjustPercent: z.number(),
    adjustAmount: z.number(),
  })
  .passthrough();

const DirectComparisonAdjustmentFactor = z
  .object({
    factorCode: z.string(),
    surveys: z.array(DirectComparisonAdjustmentPct),
  })
  .passthrough();

export const DirectComparisonDto = z
  .object({
    methodId: z.string(),
    collateralType: z.string(),
    pricingTemplateCode: z.string(),
    comparativeSurveys: z.array(ComparativeSurveys),
    comparativeFactors: z.array(ComparativeFactors),
    /** Qualitative section */
    directComparisonQualitatives: z.array(DirectComparisonQualitative),
    /** Calculation section */
    directComparisonCalculations: z.array(DirectComparisonCalculation),
    /** Adjustment Factors (adjust percentage) section */
    directComparisonAdjustmentFactors: z.array(DirectComparisonAdjustmentFactor),
    /** Final value section */
    directComparisonFinalValue: DirectComparisonFinalValue,
    /** Apprisal price section */
    directComparisonAppraisalPrice: z.object({
      appraisalPrice: z.number(),
      appraisalPriceRounded: z.number(),
    }),
  })
  .passthrough();

export type DirectComparisonType = z.infer<typeof DirectComparisonDto>;
