import type { SaleAdjustmentGridType } from '../schemas/saleAdjustmentGridForm';
import type { SaveComparativeAnalysisRequestType } from '../schemas';

interface MapSaleAdjustmentGridFormToSubmitSchemaProps {
  SaleAdjustmentGridForm: SaleAdjustmentGridType;
}

export function mapSaleAdjustmentGridFormToSubmitSchema({
  SaleAdjustmentGridForm,
}: MapSaleAdjustmentGridFormToSubmitSchemaProps): SaveComparativeAnalysisRequestType {
  return {
    comparativeFactors: (SaleAdjustmentGridForm.comparativeFactors ?? []).map((cf, index) => ({
      id: cf.id || null,
      factorId: cf.factorId || null,
      displaySequence: index,
      isSelectedForScoring: true,
      remarks: null,
    })),

    factorScores: [],

    calculations: (SaleAdjustmentGridForm.saleAdjustmentGridCalculations ?? []).map(calc => ({
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
      weight: calc.weight ?? null,
    })),
  };
}
