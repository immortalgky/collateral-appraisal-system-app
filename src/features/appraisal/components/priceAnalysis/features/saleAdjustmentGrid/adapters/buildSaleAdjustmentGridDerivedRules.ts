import { qualitativeDefaultPercent } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/domain/qualitativeDefault.ts';
import {
  calcAdjustedValue,
  calcAdjustedValueFromSellingPrice,
  calcAdjustValueFromSellingPrice,
  calcDiff,
  calcFinalValueRoundedValue,
  calcIncreaseDecrease,
  calcSum,
  calcTotalAdjustValue,
  calcTotalSecondRevision,
  calcWeightedAdjustValue,
} from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/domain/calculations.ts';
import { shouldAutoDefault } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/domain/shouldAutoDefault.ts';
import type { DerivedFieldRule } from '@features/appraisal/components/priceAnalysis/components/useDerivedFieldArray.tsx';
import { saleGridFieldPath } from '@/features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/adapters/saleAdjustmentGridfieldPath';
import { getPropertyValueByFactorCode } from '../../../domain/getPropertyValueByFactorCode';
import type { MarketComparableDetailType } from '../../../schemas/v1';
import type { SaleAdjustmentGridQualitativeFormType } from '../../../schemas/saleAdjustmentGridForm';
import { readFactorValue } from '../../../domain/readFactorValue';
type SurveyFactor = { id: string; value?: number | string | null };
type Survey = { factors?: SurveyFactor[] };

export function buildSaleGridQualitativeDerivedRules(args: {
  surveys: MarketComparableDetailType[];
  qualitativeRows: SaleAdjustmentGridQualitativeFormType[];
}): DerivedFieldRule[] {
  const { qualitativeRows, surveys } = args;

  const { adjustmentFactorsFactorCode, qualitativeMarketId } = saleGridFieldPath;

  const rules: DerivedFieldRule[] = [];

  return rules;
}

export function buildSaleGridCalculationDerivedRules(args: {
  surveys: MarketComparableDetailType[];
  property: Record<string, any>;
}): DerivedFieldRule[] {
  /** Calculation section */
  const { surveys = [], property } = args;
  const {
    adjustmentFactors: adjustmentFactorsPath,
    calculation: calculationPath,
    calculationAdjustedValue: calculationAdjustedValuePath,
    calculationTotalAdjustValue: calculationTotalAdjustValuePath,
    calculationOfferingPriceAdjustmentPct: calculationOfferingPriceAdjustmentPctPath,
    calculationOfferingPriceAdjustmentAmt: calculationOfferingPriceAdjustmentAmtPath,
    calculationTotalSecondRevision: calculationTotalSecondRevisionPath,
    calculationAdjustmentYear: calculationAdjustmentYearPath,
    calculationNumberOfYears: calculationNumberOfYearsPath,
    calculationLandAreaDiff: calculationLandAreaDiffPath,
    calculationLandValueIncreaseDecrease: calculationLandValueIncreaseDecreasePath,
    calculationLandPrice: calculationLandPricePath,
    calculationUsableAreaDiff: calculationUsableAreaDiffPath,
    calculationBuildingValueIncreaseDecrease: calculationBuildingValueIncreaseDecreasePath,
    calculationSumFactorPct: calculationSumFactorPctPath,
    calculationSumFactorAmt: calculationSumFactorAmtPath,
    calculationTotalAdjustedSellingPrice: calculationTotalAdjustedSellingPricePath,
    calculationWeight: calculationWeightPath,
    calculationWeightAdjustValue: calculationWeightAdjustValuePath,
    calculationUsableAreaPrice: calculationUsableAreaPricePath,
  } = saleGridFieldPath;

  const rules: DerivedFieldRule[] = surveys
    .map((survey: MarketComparableDetailType, columnIndex: number) => {
      return [
        {
          targetPath: calculationAdjustedValuePath({ column: columnIndex }),
          deps: [
            calculationOfferingPriceAdjustmentPctPath({ column: columnIndex }),
            calculationOfferingPriceAdjustmentAmtPath({ column: columnIndex }),
            calculationAdjustmentYearPath({ column: columnIndex }),
          ],
          compute: ({ getValues }) => {
            const offeringPrice = survey.factorData?.find(f => f.factorCode === '17');
            const offeringPriceValue = offeringPrice
              ? readFactorValue({
                  dataType: offeringPrice.dataType,
                  fieldDecimal: offeringPrice.fieldDecimal,
                  value: offeringPrice.value,
                })
              : undefined;
            if (offeringPriceValue) {
              const offeringPriceAdjustmentPct =
                getValues(calculationOfferingPriceAdjustmentPctPath({ column: columnIndex })) ?? 0;
              const offeringPriceAdjustmentAmt =
                getValues(calculationOfferingPriceAdjustmentAmtPath({ column: columnIndex })) ?? 0;
              console.log(offeringPriceValue);
              return calcAdjustedValue(
                offeringPriceValue,
                offeringPriceAdjustmentPct,
                offeringPriceAdjustmentAmt,
              );
            }
            const sellingPrice = survey.factorData?.find(f => f.factorCode === '21');
            const sellingPriceValue = sellingPrice
              ? readFactorValue({
                  dataType: sellingPrice.dataType,
                  fieldDecimal: sellingPrice.fieldDecimal,
                  value: sellingPrice.value,
                })
              : undefined;
            if (sellingPriceValue) {
              const numberOfYears =
                getValues(calculationNumberOfYearsPath({ column: columnIndex })) ?? 0;
              const sellingPriceAdjustmentYearPct =
                getValues(calculationAdjustmentYearPath({ column: columnIndex })) ?? 0;
              return calcAdjustedValueFromSellingPrice(
                sellingPriceValue,
                numberOfYears,
                sellingPriceAdjustmentYearPct,
              );
            }
            return 0;
          },
        },
        {
          targetPath: calculationTotalAdjustedSellingPricePath({ column: columnIndex }),
          compute: ({ getValues }) => {
            const calculationNumberOfYears =
              getValues(calculationNumberOfYearsPath({ column: columnIndex })) ?? 0;
            const adjustPercent =
              getValues(calculationAdjustmentYearPath({ column: columnIndex })) ?? 0;
            const totalAdjustSellingPricePercent = calcAdjustValueFromSellingPrice(
              calculationNumberOfYears,
              adjustPercent,
            );
            return totalAdjustSellingPricePercent;
          },
        },
        {
          targetPath: calculationLandAreaDiffPath({ column: columnIndex }),
          deps: [],
          compute: () => {
            const propertyLandArea = getPropertyValueByFactorCode('05', property) ?? 0;
            const findSurveyLandArea = survey.factorData?.find(f => f.id === '05');
            const surveyLandArea = findSurveyLandArea
              ? readFactorValue({
                  dataType: findSurveyLandArea.dataType,
                  fieldDecimal: findSurveyLandArea.fieldDecimal,
                  value: findSurveyLandArea.value,
                })
              : 0;
            const landDiff = calcDiff(propertyLandArea, surveyLandArea);
            return landDiff;
          },
        },
        {
          targetPath: calculationLandValueIncreaseDecreasePath({ column: columnIndex }),
          deps: [calculationLandPricePath()],
          compute: ({ getValues }) => {
            const landPrice = getValues('landPrice') ?? 0;
            const landDiff = getValues(calculationLandAreaDiffPath({ column: columnIndex })) ?? 0;
            const landValueIncreaseDecrease = calcIncreaseDecrease(landPrice, landDiff);
            return landValueIncreaseDecrease;
          },
        },
        {
          targetPath: calculationUsableAreaDiffPath({ column: columnIndex }),
          deps: [],
          compute: () => {
            const propertyUsableArea = getPropertyValueByFactorCode('12', property) ?? 0;
            const findSurveyUsableArea = survey.factorData?.find(f => f.id === '12');
            const surveyUsableArea = findSurveyUsableArea
              ? readFactorValue({
                  dataType: findSurveyUsableArea.dataType,
                  fieldDecimal: findSurveyUsableArea.fieldDecimal,
                  value: findSurveyUsableArea.value,
                })
              : 0;
            const usableAreaDiff = calcDiff(propertyUsableArea, surveyUsableArea);

            return usableAreaDiff;
          },
        },
        {
          targetPath: calculationBuildingValueIncreaseDecreasePath({ column: columnIndex }),
          deps: [calculationUsableAreaPricePath()],
          compute: ({ getValues }) => {
            const usableAreaPrice = getValues('usableAreaPrice') ?? 0;
            const usableAreaDiff =
              getValues(calculationUsableAreaDiffPath({ column: columnIndex })) ?? 0;
            const buildingValueIncreaseDecrease = calcIncreaseDecrease(
              usableAreaPrice,
              usableAreaDiff,
            );
            return buildingValueIncreaseDecrease;
          },
        },
        {
          targetPath: calculationTotalSecondRevisionPath({ column: columnIndex }),
          deps: [
            calculationBuildingValueIncreaseDecreasePath({ column: columnIndex }),
            calculationLandValueIncreaseDecreasePath({ column: columnIndex }),
            calculationAdjustedValuePath({ column: columnIndex }),
          ],
          compute: ({ getValues }) => {
            const adjustedValue =
              getValues(calculationAdjustedValuePath({ column: columnIndex })) ?? 0;
            const buildingValueIncreaseDecrease =
              getValues(calculationBuildingValueIncreaseDecreasePath({ column: columnIndex })) ?? 0;
            const landValueIncreaseDecrease =
              getValues(calculationLandValueIncreaseDecreasePath({ column: columnIndex })) ?? 0;
            const totalSecondRevision = calcTotalSecondRevision(
              adjustedValue,
              buildingValueIncreaseDecrease,
              landValueIncreaseDecrease,
            );
            return totalSecondRevision;
          },
        },
        {
          targetPath: calculationSumFactorPctPath({ column: columnIndex }),
          deps: [adjustmentFactorsPath()],
          compute: ({ getValues }) => {
            const saleAdjustmentGridAdjustmentFactors =
              getValues(adjustmentFactorsPath())?.map(
                factor => factor.surveys?.[columnIndex]?.adjustPercent ?? 0,
              ) ?? [];
            const totalDiffPct = calcSum(saleAdjustmentGridAdjustmentFactors);

            return Number.isFinite(totalDiffPct) ? parseFloat(totalDiffPct.toFixed(2)) : 0;
          },
        },
        {
          targetPath: calculationSumFactorAmtPath({ column: columnIndex }),
          deps: [adjustmentFactorsPath()],
          compute: ({ getValues }) => {
            const saleAdjustmentGridAdjustmentFactors =
              getValues(adjustmentFactorsPath())?.map(
                factor => factor.surveys?.[columnIndex]?.adjustAmount ?? 0,
              ) ?? [];
            const totalDiffAmt = calcSum(saleAdjustmentGridAdjustmentFactors);
            return totalDiffAmt;
          },
        },
        {
          targetPath: calculationTotalAdjustValuePath({ column: columnIndex }),
          deps: [adjustmentFactorsPath(), calculationPath({ column: columnIndex })],
          compute: ({ getValues }) => {
            const totalDiffAmt =
              getValues(calculationSumFactorAmtPath({ column: columnIndex })) ?? 0;
            const totalSecondRevision =
              getValues(calculationTotalSecondRevisionPath({ column: columnIndex })) ?? 0;
            const totalAdjustValue = calcTotalAdjustValue(totalSecondRevision, totalDiffAmt);
            return totalAdjustValue;
          },
        },
        {
          targetPath: calculationWeightPath({ column: columnIndex }),
          deps: [],
          when: ({ getValues, getFieldState, formState }) => {
            const target = calculationWeightPath({ column: columnIndex });
            const weight = getValues(calculationWeightPath({ column: columnIndex })) ?? 0;
            const curr = getValues(target);
            const { isDirty } = getFieldState(target, formState);
            return shouldAutoDefault({ value: curr, isDirty }) || weight > 1 || weight < 0;
          },
          compute: () => {
            const numberOfSurveys = surveys.length ?? 0;
            return 1 / numberOfSurveys;
          },
        },
        {
          targetPath: calculationWeightAdjustValuePath({ column: columnIndex }),
          deps: [
            calculationTotalAdjustValuePath({ column: columnIndex }),
            calculationWeightPath({ column: columnIndex }),
          ],
          compute: ({ getValues }) => {
            const totalAdjustValue =
              getValues(calculationTotalAdjustValuePath({ column: columnIndex })) ?? 0;
            const weight = getValues(calculationWeightPath({ column: columnIndex })) ?? 0;
            const weightedAdjustValue = calcWeightedAdjustValue(totalAdjustValue, weight);
            return weightedAdjustValue;
          },
        },
      ];
    })
    .flat() as DerivedFieldRule[];
  return rules;
}

export function buildSaleGridAdjustmentFactorDefaultPercentRules(args: {
  surveys: MarketComparableDetailType[];
  qualitativeRows: SaleAdjustmentGridQualitativeFormType[];
}): DerivedFieldRule[] {
  const { surveys = [], qualitativeRows } = args;

  const {
    qualitativeLevel: qualitativeLevelPath,
    adjustmentFactorAdjustPercent: adjustmentFactorAdjustPercentPath,
  } = saleGridFieldPath;

  return qualitativeRows
    .map((_, rowIndex: number) =>
      surveys.map((_, columnIndex: number) => {
        return {
          targetPath: adjustmentFactorAdjustPercentPath({ row: rowIndex, column: columnIndex }),
          deps: [qualitativeLevelPath({ row: rowIndex, column: columnIndex })],
          compute: ({ getValues }) => {
            const level =
              getValues(qualitativeLevelPath({ row: rowIndex, column: columnIndex })) ?? null;
            return qualitativeDefaultPercent(level) ?? null;
          },
        };
      }),
    )
    .flat(2);
}

export function buildSaleGridAdjustmentFactorAmountRules(args: {
  surveys: MarketComparableDetailType[];
  qualitativeRows: SaleAdjustmentGridQualitativeFormType[];
}): DerivedFieldRule[] {
  const { surveys = [], qualitativeRows } = args;

  const {
    adjustmentFactorAdjustAmount: adjustmentFactorAdjustAmountPath,
    adjustmentFactorAdjustPercent: adjustmentFactorAdjustPercentPath,
    calculationTotalSecondRevision: calculationTotalSecondRevisionPath,
  } = saleGridFieldPath;

  return qualitativeRows
    .map((_, rowIndex) =>
      surveys.map((_, columnIndex) => ({
        targetPath: adjustmentFactorAdjustAmountPath({ row: rowIndex, column: columnIndex }),
        deps: [
          adjustmentFactorAdjustPercentPath({ row: rowIndex, column: columnIndex }),
          calculationTotalSecondRevisionPath({ column: columnIndex }),
        ],
        compute: ({ getValues }) => {
          const totalSecondRevision =
            getValues(calculationTotalSecondRevisionPath({ column: columnIndex })) ?? 0;
          const adjustPercent =
            getValues(adjustmentFactorAdjustPercentPath({ row: rowIndex, column: columnIndex })) ??
            0;

          const adjustAmount = (totalSecondRevision * adjustPercent) / 100;
          return Number.isFinite(adjustAmount) ? parseFloat(adjustAmount.toFixed(2)) : 0;
        },
      })),
    )
    .flat();
}

export function buildSaleGridFinalValueRules(arg: {
  surveys: MarketComparableDetailType[];
}): DerivedFieldRule[] {
  const {
    finalValue: finalValuePath,
    finalValueRounded: finalValueRoundedPath,
    calculationWeightAdjustValue: calculationWeightAdjustValuePath,
  } = saleGridFieldPath;
  const { surveys = [] } = arg;

  const rules: DerivedFieldRule[] = [
    {
      targetPath: finalValuePath(),
      deps: [
        ...surveys.map((_, columnIndex: number) =>
          calculationWeightAdjustValuePath({ column: columnIndex }),
        ),
      ],
      compute: ({ getValues }) => {
        const totalWeightedAdjustValue = surveys.reduce(
          (acc: number, curr, columnIndex: number) => {
            const weightedAdjustValue =
              getValues(calculationWeightAdjustValuePath({ column: columnIndex })) ?? 0;
            return acc + weightedAdjustValue;
          },
          0,
        );
        return Number.isFinite(totalWeightedAdjustValue)
          ? parseFloat(totalWeightedAdjustValue.toFixed(2))
          : 0;
      },
    },
    {
      targetPath: finalValueRoundedPath(),
      deps: [finalValuePath()],
      when: ({ getValues, getFieldState, formState }) => {
        const target = finalValueRoundedPath();
        const curr = getValues(target) ?? 0;
        const { isDirty } = getFieldState(target, formState);
        return shouldAutoDefault({ value: curr, isDirty });
      },
      compute: ({ getValues }) => {
        const finalValue = getValues(finalValuePath()) ?? 0;
        const finalValueRounded = calcFinalValueRoundedValue(finalValue);
        return finalValueRounded;
      },
    },
  ].flat();

  return rules;
}
