import type { UseFormReset } from 'react-hook-form';
import { leaseholdFormDefaults, type LeaseholdFormType } from '../schemas/leaseholdForm';
import type { LeaseholdAnalysis } from '../types/leasehold';

export function initializeLeaseholdForm(
  analysis: LeaseholdAnalysis | null | undefined,
  remark: string | null | undefined,
  reset: UseFormReset<LeaseholdFormType>,
) {
  if (!analysis) {
    reset(leaseholdFormDefaults, { keepDirty: false, keepDirtyValues: false, keepTouched: false });
    return;
  }

  reset(
    {
      landValuePerSqWa: analysis.landValuePerSqWa,
      landGrowthRateType: analysis.landGrowthRateType,
      landGrowthRatePercent: analysis.landGrowthRatePercent,
      landGrowthIntervalYears: analysis.landGrowthIntervalYears,
      constructionCostIndex: analysis.constructionCostIndex,
      initialBuildingValue: analysis.initialBuildingValue,
      depreciationRate: analysis.depreciationRate,
      depreciationIntervalYears: analysis.depreciationIntervalYears,
      buildingCalcStartYear: analysis.buildingCalcStartYear,
      discountRate: analysis.discountRate,
      landGrowthPeriods: (analysis.landGrowthPeriods ?? []).map((p) => ({
        id: p.id,
        fromYear: p.fromYear,
        toYear: p.toYear,
        growthRatePercent: p.growthRatePercent,
      })),
      isPartialUsage: analysis.isPartialUsage,
      partialRai: analysis.partialRai,
      partialNgan: analysis.partialNgan,
      partialWa: analysis.partialWa,
      pricePerSqWa: analysis.pricePerSqWa,
      estimatePriceRounded: analysis.estimatePriceRounded,
      remark: remark ?? null,
    },
    { keepDirty: false, keepDirtyValues: false, keepTouched: false },
  );
}
