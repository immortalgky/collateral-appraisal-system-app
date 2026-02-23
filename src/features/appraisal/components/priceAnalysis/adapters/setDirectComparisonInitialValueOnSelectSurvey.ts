import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import type {
  FactorDataType,
  MarketComparableDetailType,
} from '@features/appraisal/components/priceAnalysis/schemas/v1.ts';
import type {
  DirectComparisonQualitativeFormType,
  DirectComparisonType,
} from '@features/appraisal/components/priceAnalysis/schemas/directComparisonForm.ts';
import { directComparisonPath } from '@features/appraisal/components/priceAnalysis/adapters/directComparisonFieldPath.ts';
import type { SaleAdjustmentGridQualitativeFormType } from '@features/appraisal/components/priceAnalysis/schemas/saleAdjustmentGridForm.ts';
import { readFactorValue } from '@features/appraisal/components/priceAnalysis/domain/readFactorValue.ts';

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
    qualitatives: qualitativesPath,
    comparativeSurveys: comparativeSurveysPath,
    calculations: calculationsPath,
    adjustmentFactors: adjustmentFactorsPath,
  } = directComparisonPath;

  const qualitativeFactors =
    (getValues(qualitativesPath()) as DirectComparisonQualitativeFormType[]) ?? [];

  setValue(
    comparativeSurveysPath(),
    comparativeSurveys.map((survey, index) => ({
      linkId: '',
      marketId: survey.id,
      displaySeq: index + 1,
    })),
    { shouldDirty: false },
  );

  setValue(
    qualitativesPath(),
    [
      ...qualitativeFactors.map((factor: DirectComparisonQualitativeFormType) => {
        return {
          factorId: factor.factorId,
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
        factorId: factor.factorId,
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
