import type { UseFormGetValues, UseFormReset } from 'react-hook-form';
import type { WQSCalculationType, WQSFormType } from '../schemas/wqsForm';
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
        getValues('WQSScores')?.map(score => ({
          ...score,
          surveys: comparativeSurveys.map(survey => ({ marketId: survey.id, surveyScore: 0 })),
        })) ?? [],
      WQSTotalScores: {
        totalWeight: 0,
        totalIntensity: 0,
        totalWeightedIntensity: 0,
        surveys: comparativeSurveys.map(survey => ({
          marketId: survey.id.toString(),
        })),
        totalCollateralScore: 0,
        totalWeightedCollateralScore: 0,
      },
      WQSCalculations: comparativeSurveys.map((survey: MarketComparableDetailType) => {
        const surveyMap = new Map(
          survey.factorData?.map((s: FactorDataType) => [
            s.factorCode,
            readFactorValue({ dataType: s.dataType, value: s.value, fieldDecimal: s.fieldDecimal }),
          ]),
        );
        return {
          marketId: survey.id.toString(),
          offeringPrice: survey.offerPrice ?? 0,
          offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
          offeringPriceAdjustmentPct: survey.offerPriceAdjustmentPercent ?? 0,
          offeringPriceAdjustmentAmt: survey.offerPriceAdjustmentAmount ?? 0,
          sellingPrice: survey.salePrice ?? 0,
          sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
          sellingPriceAdjustmentYear: toNum(surveyMap.get('23'), 3),
          numberOfYears: yearDiffFromToday(survey.saleDate),
        };
      }) as WQSCalculationType[],
    },
    { isDirty: true },
  );
}
