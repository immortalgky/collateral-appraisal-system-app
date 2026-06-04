import { z } from 'zod';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

/** Coerce null/undefined to 0 for number fields set by RHFInputCell */
const num = z.coerce.number().default(0);

export type LandGrowthPeriodFormType = {
  id?: string;
  fromYear: number;
  toYear: number;
  growthRatePercent: number;
};

export const makeLeaseholdFormSchema = (t: TFunction<'pricingAnalysis'>) => {
  const req = (msg: string) => ({ required_error: msg, invalid_type_error: msg });

  const LandGrowthPeriodSchema = z.object({
    id: z.string().optional(),
    fromYear: z.number(req(t('validation.leasehold.fromYearRequired'))).min(0),
    toYear: z.number(req(t('validation.leasehold.toYearRequired'))).min(0),
    growthRatePercent: z.number(req(t('validation.leasehold.growthRateRequired'))),
  });

  return z
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
};

// Static export (function stand-in, never an object) — for type inference + the
// schemas/index re-export. The translated schema is used at runtime via the hook.
export const LeaseholdFormSchema = makeLeaseholdFormSchema(
  ((key: string) => key) as unknown as TFunction<'pricingAnalysis'>,
);

export type LeaseholdFormType = z.infer<typeof LeaseholdFormSchema>;

/** Component-side hook: rebuilds the schema with the active translations. */
export const useLeaseholdFormSchema = () => {
  const { t } = useTranslation('pricingAnalysis');
  return makeLeaseholdFormSchema(t);
};

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
