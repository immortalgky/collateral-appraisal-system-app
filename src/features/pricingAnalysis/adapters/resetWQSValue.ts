import type { UseFormGetValues, UseFormReset } from 'react-hook-form';
import type { MarketComparableDetailType, TemplateDetailType } from '../schemas';
import type { WQSCalculationType, WQSFormType } from '../schemas/wqsForm';
import { calculateDuration } from '../domain/utils/dateUtils';
import { readFactorValue } from '../domain/readFactorValue';

interface resetWQSValueArgs {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: TemplateDetailType;
  comparativeSurveys: MarketComparableDetailType[];
  reset: UseFormReset<WQSFormType>;
  getValues: UseFormGetValues<WQSFormType>;
}

export function resetWQSValue({
  collateralType,
  methodId,
  methodType,
  property,
  template,
  comparativeSurveys,
  reset,
  getValues,
}: resetWQSValueArgs) {
  if (!methodId || !methodType || !property || !comparativeSurveys || !reset) return;

  const currentFormValue = getValues();
  if (!currentFormValue) return;

  reset({
    ...currentFormValue,
    comparativeSurveys: comparativeSurveys?.map((survey, index) => ({
      marketId: survey.id,
      displaySeq: index + 1,
    })),
    WQSScores:
      getValues('WQSScores')?.map(score => ({
        ...score,
        surveys: comparativeSurveys.map(survey => ({ marketId: survey.id, surveyScore: 0 })),
        collateral: 0,
        collateralWeightedScore: 0,
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
      const { years, months } = calculateDuration(
        surveyMap.get('84')?.toString() ?? '',
        new Date(),
      );
      const numberOfYears = years + Math.round(months);
      return {
        marketId: survey.id.toString(),
        offeringPrice: surveyMap.get('25') ?? 0,
        offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
        offeringPriceAdjustmentPct: surveyMap.get('18') ?? 5,
        offeringPriceAdjustmentAmt: surveyMap.get('19') ?? null,
        sellingPrice: surveyMap.get('47') ?? 0,
        sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
        sellingDate: surveyMap.get('84') ?? '',
        numberOfYears: numberOfYears,
        sellingPriceAdjustmentYear: surveyMap.get('23') ?? 3,
      };
    }) as WQSCalculationType[],
  });
}
