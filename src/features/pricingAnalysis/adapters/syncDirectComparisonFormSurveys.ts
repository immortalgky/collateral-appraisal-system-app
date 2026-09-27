import type { UseFormGetValues, UseFormReset } from 'react-hook-form';
import type { FactorDataType, MarketComparableDetailType } from '@features/pricingAnalysis/schemas';
import type { DirectComparisonType } from '@features/pricingAnalysis/schemas/directComparisonForm.ts';
import {
  readFactorValue,
  toNum,
  yearDiffFromToday,
} from '@features/pricingAnalysis/domain/readFactorValue.ts';

interface SetDirectComparisonInitialValueOnSelectSurveyProps {
  comparativeSurveys: MarketComparableDetailType[];
  reset: UseFormReset<DirectComparisonType>;
  getValues: UseFormGetValues<DirectComparisonType>;
}
export function syncDirectComparisonFormSurveys({
  comparativeSurveys = [],
  reset,
  getValues,
}: SetDirectComparisonInitialValueOnSelectSurveyProps) {
  const current = getValues();

  const prev = current.directComparisonQualitatives ?? [];

  // Each row keeps its own levels. This used to go through a factorCode -> marketId map built from
  // this same array, which meant two rows with no factor picked yet shared one key and read back
  // each other's levels -- handleAddRow leaves factorCode unset on both sides here.
  const mergedQuals = prev.map(row => {
    const prevLevels = new Map<string, string>();
    for (const cell of row.qualitatives ?? []) prevLevels.set(cell.marketId, cell.qualitativeLevel);

    return {
      ...row,
      qualitatives: comparativeSurveys.map(s => ({
        marketId: s.id!,
        qualitativeLevel: prevLevels.get(s.id!) ?? 'E',
      })),
    };
  });

  const next = {
    ...current,
    comparativeSurveys: comparativeSurveys.map((survey, columnIndex) => ({
      marketId: survey.id!,
      displaySeq: columnIndex + 1,
    })),

    directComparisonQualitatives: mergedQuals,

    directComparisonCalculations: (() => {
      const prevCalcMap = new Map<string, (typeof current.directComparisonCalculations)[number]>();
      for (const c of current.directComparisonCalculations ?? []) {
        prevCalcMap.set(c.marketId, c);
      }
      return comparativeSurveys.map((survey: MarketComparableDetailType) => {
        const existing = prevCalcMap.get(survey.id!);
        if (existing) return existing;

        const surveyMap = new Map(
          (survey.factorData ?? []).map((factor: FactorDataType) => [
            factor.factorCode,
            readFactorValue({
              dataType: factor.dataType,
              fieldDecimal: factor.fieldDecimal,
              value: factor.value,
            }),
          ]),
        );
        return {
          marketId: survey.id!,
          offeringPrice: survey.offerPrice ?? 0,
          offeringPriceMeasurementUnit: (survey as any).offerPriceUnit ?? '',
          offeringPriceAdjustmentPct: survey.offerPriceAdjustmentPercent ?? 0,
          offeringPriceAdjustmentAmt: survey.offerPriceAdjustmentAmount ?? 0,
          sellingPrice: survey.salePrice ?? 0,
          sellingPriceMeasurementUnit: (survey as any).salePriceUnit ?? '',
          sellingDate: survey.saleDate ?? '',
          sellingPriceAdjustmentYear: toNum(surveyMap.get('23'), 3),
          numberOfYears: yearDiffFromToday(survey.saleDate),
          adjustedValue: 0,
          weight: 0,
        };
      });
    })(),
    directComparisonAdjustmentFactors: (() => {
      // Matched by position, not by factorCode. The two arrays are built and mutated as a pair
      // everywhere -- initializeDirectComparisonForm and restoreDirectComparisonFromSavedData map
      // both over the same factor list, handleAddRow appends to both, handleRemoveRow removes the
      // same index from both -- and this function rebuilds the adjustments by walking the
      // qualitatives in order. factorCode is unset until the user picks a factor, so keying on it
      // made every such row share one key and inherit another row's remark and percentages.
      const prevAdjustments = current.directComparisonAdjustmentFactors ?? [];
      return (current.directComparisonQualitatives ?? []).map((q, rowIndex) => {
        const prevRow = prevAdjustments[rowIndex];
        const prevBySurvey = new Map<string, { adjustPercent: number; adjustAmount: number }>();
        for (const s of prevRow?.surveys ?? [])
          prevBySurvey.set(s.marketId, {
            adjustPercent: s.adjustPercent,
            adjustAmount: s.adjustAmount,
          });

        return {
          factorId: q.factorId,
          factorCode: q.factorCode,
          remark: prevRow?.remark ?? null,
          surveys: comparativeSurveys.map(survey => {
            const prev = prevBySurvey.get(survey.id!);
            return {
              marketId: survey.id!,
              adjustPercent: prev?.adjustPercent ?? 0,
              adjustAmount: prev?.adjustAmount ?? 0,
            };
          }),
        };
      });
    })(),
  };
  reset(next, { keepDirty: true, keepTouched: true });
}
