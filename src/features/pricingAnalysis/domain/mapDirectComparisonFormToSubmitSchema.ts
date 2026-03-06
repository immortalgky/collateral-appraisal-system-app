import type { DirectComparisonType } from '../schemas/directComparisonForm';
import type { SaveComparativeAnalysisRequestType } from '../schemas';

interface MapDirectComparisonFormToSubmitSchemaProps {
  DirectComparisonForm: DirectComparisonType;
}

export function mapDirectComparisonFormToSubmitSchema({
  DirectComparisonForm,
}: MapDirectComparisonFormToSubmitSchemaProps): SaveComparativeAnalysisRequestType {
  return {
    comparativeFactors: (DirectComparisonForm.comparativeFactors ?? []).map((cf, index) => ({
      id: cf.id || null,
      factorId: cf.factorId || null,
      displaySequence: index,
      isSelectedForScoring:
        DirectComparisonForm.directComparisonQualitatives?.some(q => q.factorId === cf.factorId) ??
        false,
      remarks: null,
    })),

    factorScores: [],

    calculations: (DirectComparisonForm.directComparisonCalculations ?? []).map(calc => ({
      marketComparableId: calc.marketId,
      offeringPrice: calc.offeringPrice ?? null,
      offeringPriceUnit: calc.offeringPriceMeasurementUnit ?? null,
      adjustOfferPricePct: calc.offeringPriceAdjustmentPct ?? null,
      sellingPrice: calc.sellingPrice ?? null,
      buySellYear: calc.numberOfYears != null ? Math.trunc(calc.numberOfYears) : null,
      buySellMonth: null,
      adjustedPeriodPct: calc.sellingPriceAdjustmentYear ?? null,
      cumulativeAdjPeriod: null,
      totalAdjustedValue: calc.adjustedValue ?? null,
      weight: null,
    })),
  };
}
