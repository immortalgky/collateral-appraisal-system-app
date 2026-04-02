import type { UseFormGetValues, UseFormReset } from 'react-hook-form';
import type { WQSFormType } from '../schemas/wqsForm';
import type {
  FactorDataType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '@features/pricingAnalysis/schemas';
import {
  readFactorValue,
  toNum,
  yearDiffFromToday,
} from '@features/pricingAnalysis/domain/readFactorValue.ts';
import type { WQSCalculation } from '../types/wqs';

interface WQSInitialValueOnSelectSurveyProps {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: TemplateDetailType;
  comparativeSurveys: MarketComparableDetailType[];
  reset: UseFormReset<WQSFormType>;
  getValues: UseFormGetValues<WQSFormType>;
}
export function syncWQSFormSurveys({
  collateralType,
  methodId,
  methodType,
  property,
  template,
  comparativeSurveys,
  reset,
  getValues,
}: WQSInitialValueOnSelectSurveyProps) {
  if (!methodId || !methodType || !property || !comparativeSurveys || !reset) return;

  const currentFormValue = getValues();
  if (!currentFormValue) return;

  reset(
    {
      ...currentFormValue,
      comparativeSurveys: comparativeSurveys?.map((survey, index) => ({
        marketId: survey.id,
        displaySeq: index + 1,
      })),
      WQSScores:
        getValues('WQSScores')?.map(score => {
          // Build lookup of existing survey scores by marketId
          const prevScoreMap = new Map<string, number>();
          for (const s of score.surveys ?? []) prevScoreMap.set(s.marketId, s.surveyScore);
          return {
            ...score,
            surveys: comparativeSurveys.map(survey => ({
              marketId: survey.id,
              surveyScore: prevScoreMap.get(survey.id) ?? 0,
            })),
          };
        }) ?? [],
      WQSTotalScores: {
        ...currentFormValue.WQSTotalScores,
        surveys: comparativeSurveys.map(survey => ({
          marketId: survey.id.toString(),
        })),
      },
      WQSCalculations: (() => {
        const prevCalcMap = new Map<string, WQSCalculation>();
        for (const c of currentFormValue.WQSCalculations ?? []) {
          prevCalcMap.set(c.marketId, c);
        }
        return comparativeSurveys.map((survey: MarketComparableDetailType) => {
          const existing = prevCalcMap.get(survey.id.toString());
          if (existing) return existing;

          const surveyMap = new Map(
            survey.factorData?.map((s: FactorDataType) => [
              s.factorCode,
              readFactorValue({
                dataType: s.dataType,
                value: s.value,
                fieldDecimal: s.fieldDecimal,
              }),
            ]),
          );
          return {
            marketId: survey.id.toString(),
            offeringPrice: survey.offerPrice ?? 0,
            offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
            offeringPriceAdjustmentPct: survey.offerPriceAdjustmentPercent ?? 5,
            offeringPriceAdjustmentAmt: survey.offerPriceAdjustmentAmount ?? 0,
            sellingPrice: survey.salePrice ?? 0,
            sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
            sellingPriceAdjustmentYear: toNum(surveyMap.get('23'), 3),
            numberOfYears: yearDiffFromToday(survey.saleDate),
          };
        }) as WQSCalculation[];
      })(),
    },
    { isDirty: true },
  );
}
