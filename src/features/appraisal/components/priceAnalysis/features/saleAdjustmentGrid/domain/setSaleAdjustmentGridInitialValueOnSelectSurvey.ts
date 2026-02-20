import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { saleGridFieldPath } from '@/features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/adapters/saleAdjustmentGridfieldPath';
import type {
  SaleAdjustmentGridQualitativeFormType,
  SaleAdjustmentGridType,
} from '../../../schemas/saleAdjustmentGridForm';
import type { FactorDataType, MarketComparableDetailType } from '../../../schemas/v1';
import { readFactorValue } from '../../../domain/readFactorValue';

interface SetSaleAdjustmentGridInitialValueOnSelectSurveyProps {
  comparativeSurveys: MarketComparableDetailType[];
  setValue: UseFormSetValue<SaleAdjustmentGridType>;
  getValues: UseFormGetValues<SaleAdjustmentGridType>;
}
export function setSaleAdjustmentGridInitialValueOnSelectSurvey({
  comparativeSurveys,
  setValue,
  getValues,
}: SetSaleAdjustmentGridInitialValueOnSelectSurveyProps) {
  const {
    qualitatives: qualitativesPath,
    comparativeSurveys: comparativeSurveysPath,
    calculations: calculationsPath,
    adjustmentFactors: adjustmentFactorsPath,
  } = saleGridFieldPath;

  const qualitativeFactors =
    (getValues(qualitativesPath()) as SaleAdjustmentGridQualitativeFormType[]) ?? [];

  setValue(
    comparativeSurveysPath(),
    (comparativeSurveys ?? []).map((survey, index) => ({
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
          ...factor,
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
      ...(comparativeSurveys ?? []).map((survey: MarketComparableDetailType) => {
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
        console.log('set offring price: ', surveyMap.get('17'));
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
