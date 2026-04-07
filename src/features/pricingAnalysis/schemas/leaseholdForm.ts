import { z } from 'zod';

const requireMsg = (fieldName: string, msg: string = 'is required.') => ({
  required_error: `${fieldName} ${msg}`,
  invalid_type_error: `${fieldName} ${msg}`,
});

const LandGrowthPeriodSchema = z.object({
  id: z.string().optional(),
  fromYear: z.number(requireMsg('From year')).min(0),
  toYear: z.number(requireMsg('To year')).min(0),
  growthRatePercent: z.number(requireMsg('Growth rate')),
});

/** Coerce null/undefined to 0 for number fields set by RHFInputCell */
const num = z.coerce.number().default(0);

export const LeaseholdFormSchema = z
  .object({
    landValuePerSqWa: num,
    landGrowthRateType: z.enum(['Frequency', 'Period']).default('Frequency'),
    landGrowthRatePercent: num,
    landGrowthIntervalYears: z.coerce.number().default(1),
    constructionCostIndex: num,
    initialBuildingValue: num,
    depreciationRate: num,
    depreciationIntervalYears: z.coerce.number().default(1),
    buildingCalcStartYear: num,
    discountRate: num,
    landGrowthPeriods: z.array(LandGrowthPeriodSchema).default([]),
    isPartialUsage: z.boolean().default(false),
    partialRai: z.number().nullable().default(null),
    partialNgan: z.number().nullable().default(null),
    partialWa: z.number().nullable().default(null),
    pricePerSqWa: z.number().nullable().default(null),
    estimatePriceRounded: z.number().nullable().default(null),
    remark: z.string().nullable().optional(),
  })
  .passthrough();

export type LeaseholdFormType = z.infer<typeof LeaseholdFormSchema>;
export type LandGrowthPeriodFormType = z.infer<typeof LandGrowthPeriodSchema>;

export const leaseholdFormDefaults: LeaseholdFormType = {
  landValuePerSqWa: 0,
  landGrowthRateType: 'Frequency',
  landGrowthRatePercent: 0,
  landGrowthIntervalYears: 1,
  constructionCostIndex: 0,
  initialBuildingValue: 0,
  depreciationRate: 0,
  depreciationIntervalYears: 1,
  buildingCalcStartYear: 0,
  discountRate: 0,
  landGrowthPeriods: [],
  isPartialUsage: false,
  partialRai: null,
  partialNgan: null,
  partialWa: null,
  pricePerSqWa: null,
  estimatePriceRounded: null,
  remark: null,
};
