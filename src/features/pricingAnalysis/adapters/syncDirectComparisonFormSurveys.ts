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

    directComparisonCalculations: comparativeSurveys.map((survey: MarketComparableDetailType) => {
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
    }),
    directComparisonAdjustmentFactors: (current.directComparisonQualitatives ?? []).map(q => ({
      factorId: q.factorId,
      factorCode: q.factorCode,
      surveys: comparativeSurveys.map(survey => ({
        marketId: survey.id,
        adjustPercent: 0,
        adjustAmount: 0,
      })),
    })),
  };
  reset(next, { keepDirty: true, keepTouched: true });
}
