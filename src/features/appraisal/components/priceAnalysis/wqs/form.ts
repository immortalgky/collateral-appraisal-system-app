import { z } from 'zod';

const WQSScore = z.object({
  id: z.string(),
  factorCode: z.number(),
  surveyScore: z.number(),
  surveyWeightedScore: z.number(),
});

const WQSMarket = z.object({
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
});

const WQSDto = z.object({
  collateralType: z.string(),
  template: z.string(),
  finalValue: z.number(),
  WQSMarkets: z.array(WQSMarket),
});
