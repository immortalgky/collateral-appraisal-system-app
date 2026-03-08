import type { UseFormGetValues, UseFormReset } from 'react-hook-form';
import type {
  FactorDataType,
  MarketComparableDetailType,
} from '@features/pricingAnalysis/schemas';
import type { DirectComparisonType } from '@features/pricingAnalysis/schemas/directComparisonForm.ts';
import { readFactorValue, toNum, yearDiffFromToday } from '@features/pricingAnalysis/domain/readFactorValue.ts';

interface SetDirectComparisonInitialValueOnSelectSurveyProps {
  comparativeSurveys: MarketComparableDetailType[];
  reset: UseFormReset<DirectComparisonType>;
  getValues: UseFormGetValues<DirectComparisonType>;
}
export function syncDirectComparisonFormSurveys({
  comparativeSurveys,
  reset,
  getValues,
}: SetDirectComparisonInitialValueOnSelectSurveyProps) {
  const current = getValues();

  const prev = current.directComparisonQualitatives ?? [];

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

    directComparisonQualitatives: mergedQuals,

    directComparisonCalculations: (() => {
      const prevCalcMap = new Map<string, (typeof current.directComparisonCalculations)[number]>();
      for (const c of current.directComparisonCalculations ?? []) {
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
          offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
          offeringPriceAdjustmentPct: survey.offerPriceAdjustmentPercent ?? 0,
          offeringPriceAdjustmentAmt: survey.offerPriceAdjustmentAmount ?? 0,
          sellingPrice: survey.salePrice ?? 0,
          sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
          sellingDate: survey.saleDate ?? '',
          sellingPriceAdjustmentYear: toNum(surveyMap.get('23'), 3),
          numberOfYears: yearDiffFromToday(survey.saleDate),
          adjustedValue: 0,
          weight: 0,
        };
      });
    })(),
    directComparisonAdjustmentFactors: (() => {
      const prevAdjMap = new Map<string, Map<string, { adjustPercent: number; adjustAmount: number }>>();
      for (const af of current.directComparisonAdjustmentFactors ?? []) {
        const inner = new Map<string, { adjustPercent: number; adjustAmount: number }>();
        for (const s of af.surveys ?? []) inner.set(s.marketId, { adjustPercent: s.adjustPercent, adjustAmount: s.adjustAmount });
        prevAdjMap.set(af.factorCode, inner);
      }
      const prevRemarkMap = new Map<string, string | null | undefined>();
      for (const af of current.directComparisonAdjustmentFactors ?? []) {
        prevRemarkMap.set(af.factorCode, af.remark);
      }
      return (current.directComparisonQualitatives ?? []).map(q => ({
        factorId: q.factorId,
        factorCode: q.factorCode,
        remark: prevRemarkMap.get(q.factorCode) ?? null,
        surveys: comparativeSurveys.map(survey => {
          const prev = prevAdjMap.get(q.factorCode)?.get(survey.id);
          return {
            marketId: survey.id,
            adjustPercent: prev?.adjustPercent ?? 0,
            adjustAmount: prev?.adjustAmount ?? 0,
          };
        }),
      }));
    })(),
  };
  reset(next, { keepDirty: true, keepTouched: true });
}
