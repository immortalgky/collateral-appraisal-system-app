import type { UseFormGetValues, UseFormReset } from 'react-hook-form';
import type { WQSRequestType } from '../schemas/wqsForm';

export function setWQSInitialValueOnSelectSurvey({
  collateralType,
  methodId,
  methodType,
  property,
  template,
  comparativeSurveys,
  reset,
  getValues,
}: {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: Record<string, unknown>;
  comparativeSurveys: Record<string, unknown>[];
  reset: UseFormReset<WQSRequestType>;
  getValues: UseFormGetValues<WQSRequestType>;
}) {
  if (!methodId && !methodType && !property && !comparativeSurveys && !reset) return;

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
      WQSCalculations: comparativeSurveys.map(survey => {
        const surveyMap = new Map(survey.factors.map(s => [s.id, s.value]));
        return {
          marketId: survey.id.toString(),
          offeringPrice: surveyMap.get('17') ?? 0,
          offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
          offeringPriceAdjustmentPct: surveyMap.get('18') ?? 5,
          offeringPriceAdjustmentAmt: surveyMap.get('19') ?? null,
          sellingPrice: surveyMap.get('21') ?? 0,
          sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
          sellingDate: surveyMap.get('22') ?? '',
          sellingPriceAdjustmentYear: surveyMap.get('23') ?? 3,
          numberOfYears: 10, // TODO: convert selling date to number of year
        };
      }),
    },
    { isDirty: true },
  );
}
