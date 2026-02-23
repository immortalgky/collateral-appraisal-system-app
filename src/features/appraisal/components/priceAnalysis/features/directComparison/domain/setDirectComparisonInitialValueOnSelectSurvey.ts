import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import type {
  DirectComparisonQualitativeFormType,
  DirectComparisonType,
} from '../../../schemas/directComparisonForm';
import { directComparisonPath } from '../adapters/directComparisonFieldPath';
import { toFactorMap } from '../../../domain/toFactorMap';
import type { MarketComparableDetailType } from '../../../schemas/v1';
import type { SaleAdjustmentGridQualitativeFormType } from '../../../schemas/saleAdjustmentGridForm';

interface SetDirectComparisonInitialValueOnSelectSurveyProps {
  comparativeSurveys: MarketComparableDetailType[];
  setValue: UseFormSetValue<DirectComparisonType>;
  getValues: UseFormGetValues<DirectComparisonType>;
}
export function setDirectComparisonInitialValueOnSelectSurvey({
  comparativeSurveys,
  setValue,
  getValues,
}: SetDirectComparisonInitialValueOnSelectSurveyProps) {
  const {
    calculations: calculationsPath,
    adjustmentFactors: adjustmentFactorsPath,
    qualitatives: qualitativesPath,
    comparativeSurveys: comparativeSurveysPath,
  } = directComparisonPath;
  const qualitativeFactors =
    (getValues(qualitativesPath()) as DirectComparisonQualitativeFormType[]) ?? [];

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
      ...qualitativeFactors.map((factor: SaleAdjustmentGridQualitativeFormType) => {
        return {
          factorCode: factor.factorCode,
          qualitatives: comparativeSurveys.map((survey: MarketComparableDetailType) => ({
            marketId: survey.id,
            qualitativeLevel: 'E', // TODO: can config
          })),
        };
      }),
    ],
    { shouldDirty: false },
  );

  setValue(
    calculationsPath(),
    [
      ...comparativeSurveys.map(survey => {
        const surveyMap = toFactorMap(survey.factorData ?? []);
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
      ...(qualitativeFactors ?? []).map((factor: SaleAdjustmentGridQualitativeFormType) => ({
        factorCode: factor.factorCode,
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
