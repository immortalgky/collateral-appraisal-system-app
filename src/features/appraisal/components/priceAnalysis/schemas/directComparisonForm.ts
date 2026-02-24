import { z } from 'zod';

const ComparativeFactors = z
  .object({
    factorCode: z.string(),
  })
  .passthrough();

const ComparativeSurveys = z
  .object({
    linkId: z.string().optional().nullable(),
    marketId: z.string(),
    displaySeq: z.number(),
  })
  .passthrough();

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
    offeringPriceMeasurementUnit: z.string().nullable(),
    offeringPriceAdjustmentPct: z.number().nullable(),
    offeringPriceAdjustmentAmt: z.number().nullable(),
    sellingPrice: z.number().nullable(),
    sellingPriceMeasurementUnit: z.string().nullable(),
    // sellingDate: z.date(), TODO
    sellingPriceAdjustmentYear: z.number().nullable(),
    numberOfYears: z.number().nullable(),
    adjustedValue: z.number(),

    // 2nd revision
    landAreaOfDeficient: z.number().nullable().optional(),
    landAreaOfDeficientMeasureUnit: z.number().nullable().optional(),
    landPrice: z.number().nullable().optional(),
    landPriceMeasureUnit: z.number().nullable().optional(),
    landValueIncreaseDecrease: z.number().nullable().optional(),
    usableAreaOfDeficient: z.number().nullable().optional(),
    usableAreaOfDeficientMeasureUnit: z.number().nullable().optional(),
    usableAreaPrice: z.number().nullable().optional(),
    usableAreaPriceMeasureUnit: z.number().nullable().optional(),
    buildingValueIncreaseDecrease: z.number().nullable().optional(),
    totalSecondRevision: z.number().nullable().optional(),

    // adjusted value
    factorDiffPct: z.number(),
    factorDiffAmt: z.number(),
    totalAdjustValue: z.number(),
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
    remark: z.string().nullable().optional(),
  })
  .passthrough();

export const DirectComparisonDto = z
  .object({
    methodId: z.string(),
    collateralType: z.string().nullable().optional(), // remove nullable and optional if this field is required.
    pricingTemplateCode: z.string().nullable().optional(), // remove nullable and optional if this field is required.
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

export type DirectComparisonCalculationFormType = z.infer<typeof DirectComparisonCalculation>;
export type DirectComparisonQualitativeSurveyFormType = z.infer<
  typeof DirectComparisonQualitativeSurvey
>;
export type ComparativeFactorsFormType = z.infer<typeof ComparativeFactors>;
export type DirectComparisonQualitativeFormType = z.infer<typeof DirectComparisonQualitative>;
export type DirectComparisonType = z.infer<typeof DirectComparisonDto>;
