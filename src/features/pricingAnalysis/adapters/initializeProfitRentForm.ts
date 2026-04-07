import type { UseFormReset } from 'react-hook-form';
import { profitRentFormDefaults, type ProfitRentFormType } from '../schemas/profitRentForm';
import type { ProfitRentAnalysis } from '../types/profitRent';

export function initializeProfitRentForm(
  analysis: ProfitRentAnalysis | null | undefined,
  remark: string | null | undefined,
  reset: UseFormReset<ProfitRentFormType>,
) {
  if (!analysis) {
    reset(profitRentFormDefaults, { keepDirty: false, keepDirtyValues: false, keepTouched: false });
    return;
  }

  reset(
    {
      marketRentalFeePerSqWa: analysis.marketRentalFeePerSqWa,
      growthRateType: analysis.growthRateType,
      growthRatePercent: analysis.growthRatePercent,
      growthIntervalYears: analysis.growthIntervalYears,
      discountRate: analysis.discountRate,
      includeBuildingCost: analysis.includeBuildingCost,
      growthPeriods: (analysis.growthPeriods ?? []).map((p) => ({
        id: p.id,
        fromYear: p.fromYear,
        toYear: p.toYear,
        growthRatePercent: p.growthRatePercent,
      })),
      estimatePriceRounded: analysis.estimatePriceRounded,
      totalBuildingCost: analysis.totalBuildingCost ?? null,
      appraisalPriceWithBuilding: analysis.appraisalPriceWithBuilding ?? null,
      appraisalPriceWithBuildingRounded: analysis.appraisalPriceWithBuildingRounded ?? null,
      remark: remark ?? null,
    },
    { keepDirty: false, keepDirtyValues: false, keepTouched: false },
  );
}
