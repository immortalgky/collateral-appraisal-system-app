import type { UseFormGetValues, UseFormReset } from 'react-hook-form';
import type { FactorDataType, MarketComparableDetailType } from '@features/pricingAnalysis/schemas';
import type { SaleAdjustmentGridType } from '@features/pricingAnalysis/schemas/saleAdjustmentGridForm.ts';
import {
  readFactorValue,
  toNum,
  yearDiffFromToday,
} from '@features/pricingAnalysis/domain/readFactorValue.ts';

interface SetSaleAdjustmentGridInitialValueOnSelectSurveyProps {
  comparativeSurveys: MarketComparableDetailType[];
  reset: UseFormReset<SaleAdjustmentGridType>;
  getValues: UseFormGetValues<SaleAdjustmentGridType>;
}
export function syncSaleAdjustmentGridFormSurveys({
  comparativeSurveys = [],
  reset,
  getValues,
}: SetSaleAdjustmentGridInitialValueOnSelectSurveyProps) {
  const current = getValues();

  const prev = current.saleAdjustmentGridQualitatives ?? [];

  // factorCode -> marketId -> qualitativeLevel
  const prevMap = new Map<string, Map<string, string>>();
  for (const row of prev) {
    const inner = new Map<string, string>();
    for (const cell of row.qualitatives ?? []) inner.set(cell.marketId, cell.qualitativeLevel);
    prevMap.set(row.factorCode, inner);
  }

  const mergedQuals = prev.map(row => ({
    ...row,
    qualitatives: comparativeSurveys.map(s => ({
      marketId: s.id,
      qualitativeLevel: prevMap.get(row.factorCode)?.get(s.id) ?? 'E',
    })),
  }));

  const next = {
    ...current,
    comparativeSurveys: comparativeSurveys.map((survey, columnIndex) => ({
      marketId: survey.id,
      displaySeq: columnIndex + 1,
    })),

    saleAdjustmentGridQualitatives: mergedQuals,

    saleAdjustmentGridCalculations: (() => {
      // Build lookup of existing calculations by marketId
      const prevCalcMap = new Map<
        string,
        (typeof current.saleAdjustmentGridCalculations)[number]
      >();
      for (const c of current.saleAdjustmentGridCalculations ?? []) {
        prevCalcMap.set(c.marketId, c);
      }
      return comparativeSurveys.map((survey: MarketComparableDetailType) => {
        const existing = prevCalcMap.get(survey.id);
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
          marketId: survey.id,
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
    saleAdjustmentGridAdjustmentFactors: (() => {
      // Matched by position, not by factorCode. The two arrays are built and mutated as a pair
      // everywhere — initializeSaleAdjustmentGridForm and restoreSaleAdjustmentGridFromSavedData
      // map both over the same factor list, handleAddRow appends to both, handleRemoveRow removes
      // the same index from both, and this function rebuilds the adjustments by walking the
      // qualitatives in order. factorCode is the wrong key: it is null or '' until the user picks
      // a factor, so every unpicked row shares one key and they read back each other's remarks and
      // percentages.
      const prevAdjustments = current.saleAdjustmentGridAdjustmentFactors ?? [];
      return (current.saleAdjustmentGridQualitatives ?? []).map((q, rowIndex) => {
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
            const prev = prevBySurvey.get(survey.id);
            return {
              marketId: survey.id,
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
