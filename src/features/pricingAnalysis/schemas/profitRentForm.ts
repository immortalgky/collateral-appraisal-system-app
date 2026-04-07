import { z } from 'zod';

const GrowthPeriodSchema = z.object({
  id: z.string().optional(),
  fromYear: z.number().min(0),
  toYear: z.number().min(0),
  growthRatePercent: z.number(),
});

const num = z.coerce.number().default(0);

export const ProfitRentFormSchema = z.object({
  marketRentalFeePerSqWa: num,
  growthRateType: z.enum(['Frequency', 'Period']).default('Frequency'),
  growthRatePercent: num,
  growthIntervalYears: z.coerce.number().default(1),
  discountRate: num,
  includeBuildingCost: z.boolean().default(false),
  growthPeriods: z.array(GrowthPeriodSchema).default([]),
  estimatePriceRounded: z.number().nullable().default(null),
  totalBuildingCost: z.number().nullable().default(null),
  appraisalPriceWithBuilding: z.number().nullable().default(null),
  appraisalPriceWithBuildingRounded: z.number().nullable().default(null),
  remark: z.string().nullable().optional(),
});

export type ProfitRentFormType = z.infer<typeof ProfitRentFormSchema>;
export type GrowthPeriodFormType = z.infer<typeof GrowthPeriodSchema>;

export const profitRentFormDefaults: ProfitRentFormType = {
  marketRentalFeePerSqWa: 0,
  growthRateType: 'Frequency',
  growthRatePercent: 0,
  growthIntervalYears: 1,
  discountRate: 0,
  includeBuildingCost: false,
  growthPeriods: [],
  estimatePriceRounded: null,
  totalBuildingCost: null,
  appraisalPriceWithBuilding: null,
  appraisalPriceWithBuildingRounded: null,
  remark: null,
};
