import { z } from 'zod';

const WQSCalculation = z
  .object({
    id: z.string(),
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

const WQSScore = z
  .object({
    id: z.string(),
    factorCode: z.string(),
    weight: z.number(),
    intensity: z.number(),
  })
  .passthrough();

const ComparativeData = z
  .object({
    id: z.string(),
    factorCode: z.string(),
    value: z.string(),
  })
  .passthrough();

export const WQSDto = z
  .object({
    collateralType: z.string(),
    template: z.string(),
    finalValue: z.number(),
    ComparativeData: z.array(ComparativeData),
    WQSScores: z.array(WQSScore),
    WQSCalculations: z.array(WQSCalculation),
  })
  .passthrough();

export type WQSRequestType = z.infer<typeof WQSDto>;
