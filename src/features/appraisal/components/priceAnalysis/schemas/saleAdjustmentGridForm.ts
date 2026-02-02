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

const adjustValue = z.object({
  factorCode: z.string(),
  factorDiffPct: z.number(),
  factorDiffAmt: z.number(),
  totalAdjValue: z.number(),
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
    landAreaOfDeficient: z.number().nullable(),
    landAreaOfDeficientMeasureUnit: z.number().nullable(),
    landPrice: z.number().nullable(),
    landPriceMeasureUnit: z.number().nullable(),
    landValueIncreaseDecrease: z.number().nullable(),
    usableAreaOfDeficient: z.number().nullable(),
    usableAreaOfDeficientMeasureUnit: z.number().nullable(),
    usableAreaPrice: z.number().nullable(),
    usableAreaPriceMeasureUnit: z.number().nullable(),
    buildingValueIncreaseDecrease: z.number().nullable(),
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
  })
  .passthrough();

export const SaleAdjustmentGridDto = z
  .object({
    methodId: z.string(),
    collateralType: z.string(),
    pricingTemplateCode: z.string(),
    comparativeSurveys: z.array(ComparativeSurveys),
    comparativeFactors: z.array(ComparativeFactors),
    saleAdjustmentGridQualitatives: z.array(SaleAdjustmentGridQualitative),
    saleAdjustmentGridCalculations: z.array(SaleAdjustmentGridCalculation),
    saleAdjustmentGridAdjustmentFactors: z.array(SaleAdjustmentGridAdjustmentFactor),
    saleAdjustmentGridFinalValue: SaleAdjustmentGridFinalValue,
  })
  .passthrough();

export type SaleAdjustmentGridType = z.infer<typeof SaleAdjustmentGridDto>;
