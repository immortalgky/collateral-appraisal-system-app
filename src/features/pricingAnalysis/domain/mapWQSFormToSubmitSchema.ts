import type { WQSFormType } from '../schemas/wqsForm';
import type { SaveComparativeAnalysisRequestType } from '../schemas';

interface MapWQSFormToSubmitSchemaProps {
  WQSForm: WQSFormType;
}

export function mapWQSFormToSubmitSchema({
  WQSForm,
}: MapWQSFormToSubmitSchemaProps): SaveComparativeAnalysisRequestType {
  return {
    comparativeFactors: (WQSForm.comparativeFactors ?? []).map((cf, index) => ({
      id: cf.id || null,
      factorId: cf.factorId || null,
      displaySequence: index,
      isSelectedForScoring:
        WQSForm.WQSScores?.some(score => score.factorId === cf.factorId) ?? false,
      remarks: null,
    })),

    factorScores: WQSForm.WQSScores.flatMap((score, index) => {
      const entries: SaveComparativeAnalysisRequestType['factorScores'] = [];
      const fid = score.factorId || null;

      // One entry per survey for this factor
      for (const survey of score.surveys ?? []) {
        entries.push({
          id: survey.id || null,
          factorId: fid,
          marketComparableId: survey.marketId || null,
          factorWeight: score.weight ?? 0,
          displaySequence: index,
          score: survey.surveyScore,
        });
      }

      // Collateral (subject property) score entry — no marketComparableId
      entries.push({
        id: score.collateralScoreId || null,
        factorId: fid,
        marketComparableId: null,
        factorWeight: score.weight ?? 0,
        displaySequence: index,
        score: score.collateral ?? 0,
      });

      return entries;
    }),

    calculations: (WQSForm.WQSCalculations ?? []).map(calc => ({
      marketComparableId: calc.marketId,
      offeringPrice: calc.offeringPrice ?? null,
      offeringPriceUnit: calc.offeringPriceMeasurementUnit ?? null,
      adjustOfferPricePct: calc.offeringPriceAdjustmentPct ?? null,
      sellingPrice: calc.sellingPrice ?? null,
      buySellYear: calc.numberOfYears != null ? Math.trunc(calc.numberOfYears) : null,
      buySellMonth: null,
      adjustedPeriodPct: calc.sellingPriceAdjustmentYear ?? null,
      cumulativeAdjPeriod: calc.totalAdjustedSellingPrice ?? null,
      totalAdjustedValue: calc.adjustedValue ?? null,
      weight: null,
    })),
  };
}
