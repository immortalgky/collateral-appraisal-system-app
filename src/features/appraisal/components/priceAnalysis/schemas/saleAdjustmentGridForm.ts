import { z } from 'zod';

const ComparativeFactors = z
  .object({
    factorCode: z.string(),
  })
  .passthrough();

const ComparativeSurveys = z.object({ marketId: z.string(), displaySeq: z.number() }).passthrough();

const SaleAdjustmentGridQualitativeSurvey = z
  .object({
    marketId: z.string(),
    qualitativeLevel: z.string(),
  })
  .passthrough();

const SaleAdjustmentGridQualitative = z.object({
  factorCode: z.string(),
  qualitatives: z.array(SaleAdjustmentGridQualitativeSurvey),
});

const SaleAdjustmentGridCalculation = z
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
    totalSecondRevision: z.number().nullable().optional(),

    // adjusted value
    factorDiffPct: z.number(),
    factorDiffAmt: z.number(),
    totalAdjustValue: z.number(),

    // adjust weight
    weight: z.number(),
    weightedAdjustValue: z.number(),
  })
  .passthrough();

const SaleAdjustmentGridFinalValue = z
  .object({
    finalValue: z.number(),
    finalValueRounded: z.number(),
  })
  .passthrough();

const SaleAdjustmentGridAdjustmentPct = z
  .object({
    marketId: z.string(),
    adjustPercent: z.number(),
    adjustAmount: z.number(),
  })
  .passthrough();

const SaleAdjustmentGridAdjustmentFactor = z
  .object({
    factorCode: z.string(),
    surveys: z.array(SaleAdjustmentGridAdjustmentPct),
    remark: z.string().nullable().optional(),
  })
  .passthrough();

export const SaleAdjustmentGridDto = z
  .object({
    methodId: z.string(),
    collateralType: z.string(),
    pricingTemplateCode: z.string(),
    comparativeSurveys: z.array(ComparativeSurveys),
    comparativeFactors: z.array(ComparativeFactors),
    /** Qualitative section */
    saleAdjustmentGridQualitatives: z.array(SaleAdjustmentGridQualitative),
    /** Calculation section */
    saleAdjustmentGridCalculations: z.array(SaleAdjustmentGridCalculation),
    /** Adjustment Factors (adjust percentage) section */
    saleAdjustmentGridAdjustmentFactors: z.array(SaleAdjustmentGridAdjustmentFactor),
    /** Final value section */
    saleAdjustmentGridFinalValue: SaleAdjustmentGridFinalValue,
    /** Apprisal price section */
    saleAdjustmentGridAppraisalPrice: z.object({
      appraisalPrice: z.number(),
      appraisalPriceRounded: z.number(),
    }),
  })
  .passthrough();

export type SaleAdjustmentGridCalculationFormType = z.infer<typeof SaleAdjustmentGridCalculation>;
export type SaleAdjustmentGridQualitativeSurveyFormType = z.infer<
  typeof SaleAdjustmentGridQualitativeSurvey
>;
export type ComparativeFactorsFormType = z.infer<typeof ComparativeFactors>;
export type SaleAdjustmentGridQualitativeFormType = z.infer<typeof SaleAdjustmentGridQualitative>;
export type SaleAdjustmentGridType = z.infer<typeof SaleAdjustmentGridDto>;
