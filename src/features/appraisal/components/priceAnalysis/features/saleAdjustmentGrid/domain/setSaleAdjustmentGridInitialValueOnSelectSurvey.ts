import type { UseFormGetValues, UseFormReset } from 'react-hook-form';
import type { WQSRequestType } from '@features/appraisal/components/priceAnalysis/features/wqs/schemas/wqsForm.ts';
import { saleGridFieldPath } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/adapters/fieldPath.ts';

interface SetSaleAdjustmentGridInitialValueOnSelectSurveyProps {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: Record<string, unknown>;
  comparativeSurveys: Record<string, unknown>[];
  reset: UseFormReset<WQSRequestType>;
  getValues: UseFormGetValues<WQSRequestType>;
}
export function setSaleAdjustmentGridInitialValueOnSelectSurvey({}: SetSaleAdjustmentGridInitialValueOnSelectSurveyProps) {
  const {
    qualitatives: qualitativesPath,
    comparativeSurveys: comparativeSurveysPath,
    calculations: calculationsPath,
    adjustmentFactors: adjustmentFactorsPath,
  } = saleGridFieldPath;
  const qualitativeFactors = getValues(qualitativesPath()) ?? [];

  setValue(
    comparativeSurveysPath(),
    comparativeSurveys.map((survey, index) => ({
      marketId: survey.id,
      displaySeq: index + 1,
    })),
    { shouldDirty: false },
  );

  setValue(
    qualitativesPath(),
    [
      ...qualitativeFactors.map(f => ({
        ...f,
        qualitatives: comparativeSurveys.map(survey => ({
          marketId: survey.id,
          qualitativeLevel: 'E', // TODO: can config
        })),
      })),
    ],
    { shouldDirty: false },
  );

  setValue(
    calculationsPath(),
    [
      ...comparativeSurveys.map(survey => {
        const surveyMap = new Map(survey.factors.map(s => [s.id, s.value]));
        return {
          marketId: survey.id,
          offeringPrice: surveyMap.get('17') ?? 0,
          offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
          offeringPriceAdjustmentPct: surveyMap.get('18') ?? 5,
          offeringPriceAdjustmentAmt: surveyMap.get('19') ?? null,
          sellingPrice: surveyMap.get('21') ?? 0,
          sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
          sellingDate: surveyMap.get('22') ?? '',
          sellingPriceAdjustmentYear: surveyMap.get('23') ?? 3,
          numberOfYears: 10, // TODO: convert selling date to number of year
          adjustedValue: 0,
          weight: 0,
        };
      }),
    ],
    { shouldDirty: false },
  );

  setValue(
    adjustmentFactorsPath(),
    [
      ...qualitativeFactors.map(f => ({
        factorCode: f.factorCode,
        surveys: comparativeSurveys.map(survey => ({
          marketId: survey.id,
          adjustPercent: 0,
          adjustAmount: 0,
        })),
      })),
    ],
    { shouldDirty: false },
  );
}
