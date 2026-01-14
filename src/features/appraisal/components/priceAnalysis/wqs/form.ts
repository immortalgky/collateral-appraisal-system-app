import { z } from 'zod';

const WQSScore = z
  .object({
    id: z.string(),
    factorCode: z.number(),
    surveyScore: z.number(),
    surveyWeightedScore: z.number(),
  })
  .passthrough();

const WQSMarketSurvey = z
  .object({
    id: z.string(),
    offeringPrice: z.number(),
    offeringPriceMeasureUnit: z.string(),
    offeringPriceAdjustmentPct: z.number(),
    offeringPriceAdjustmentAmt: z.number(),
    sellingPrice: z.number(),
    sellingPriceMeasureUnit: z.string(),
    sellingDate: z.date(),
    sellingPriceAdjustmentYear: z.number(),
    numberOfYears: z.number(),
    WQSScores: z.array(WQSScore),
  })
  .passthrough();

export const WQSDto = z
  .object({
    collateralType: z.string(),
    template: z.string(),
    finalValue: z.number(),
    WQSMarketSurveys: z.array(WQSMarketSurvey),
  })
  .passthrough();

export type WQSRequestType = z.infer<typeof WQSDto>;
