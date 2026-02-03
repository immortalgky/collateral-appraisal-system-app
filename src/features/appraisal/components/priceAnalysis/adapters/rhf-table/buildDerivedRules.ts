import type { DerivedFieldRule } from '../../components/useDerivedFieldArray';
import { getPropertyValueByFactorCode } from '../../domain/getPropertyValueByFactorCode';
import { saleGridFieldPath } from '../../features/saleAdjustmentGrid/adapters/fieldPath';
import {
  qualitativeDefault,
  qualitativeDefaultPercent,
} from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/domain/qualitativeDefault.ts';
import { shouldAutoDefault } from '../../features/saleAdjustmentGrid/domain/shouldAutoDefault';
import {
  calcAdjustedValueFromOfferingPrice,
  calcAdjustedValueFromSellingPrice,
  calcDiff,
  calcIncreaseDecrease,
  calcSum,
  calcTotalSecondRevision,
  calcWeightedAdjustValue,
} from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/domain/calculations.ts';
type SurveyFactor = { id: string; value?: number | string | null };
type Survey = { factors?: SurveyFactor[] };

export function buildSaleGridQualitativeDerivedRules(args: {
  surveys: Survey[];
  qualitativeRows: any[];
}): DerivedFieldRule[] {
  const { qualitativeRows, surveys } = args;

  const { adjustmentFactorsFactorCode, qualitativeMarketId } = saleGridFieldPath;

  const rules: DerivedFieldRule[] = [];

  return rules;
}

export function buildSaleGridCalculationDerivedRules(args: {
  surveys: Survey[];
  property: Record<string, any>;
}): DerivedFieldRule[] {
  /** Calculation section */
  const { surveys = [], property } = args;
  const {
    adjustmentFactors: adjustmentFactorsPath,
    calculationAdjustedValue: calculationAdjustedValuePath,
    calculationOfferingPriceAdjustmentPct: calculationOfferingPriceAdjustmentPctPath,
    calculationOfferingPriceAdjustmentAmt: calculationOfferingPriceAdjustmentAmtPath,
    calculationTotalSecondRevision: calculationTotalSecondRevisionPath,
    calculationAdjustmentYear: calculationAdjustmentYearPath,
    calculationLandAreaDiff: calculationLandAreaDiffPath,
    calculationLandValueIncreaseDecrease: calculationLandValueIncreaseDecreasePath,
    calculationUsableAreaDiff: calculationUsableAreaDiffPath,
    calculationBuildingValueIncreaseDecrease: calculationBuildingValueIncreaseDecreasePath,
    calculationSumFactorPct: calculationSumFactorPctPath,
    calculationSumFactorAmt: calculationSumFactorAmtPath,
    calculationTotalAdjustValue: calculationTotalAdjustValuePath,
    calculationWeight: calculationWeightPath,
    calculationWeightAdjustValue: calculationWeightAdjustValuePath,
  } = saleGridFieldPath;

  const rules: DerivedFieldRule[] = surveys
    .map((s, columnIndex) => {
      return [
        {
          targetPath: calculationAdjustedValuePath({ column: columnIndex }),
          deps: [
            calculationOfferingPriceAdjustmentPctPath({ column: columnIndex }),
            calculationOfferingPriceAdjustmentAmtPath({ column: columnIndex }),
            calculationAdjustmentYearPath({ column: columnIndex }),
          ],
          compute: ({ getValues }) => {
            const offeringPrice = s.factors?.find(f => f.id === '17')?.value;
            if (offeringPrice) {
              const offeringPriceAdjustmentPct =
                getValues(calculationOfferingPriceAdjustmentPctPath({ column: columnIndex })) ?? 0;
              const offeringPriceAdjustmentAmt =
                getValues(calculationOfferingPriceAdjustmentAmtPath({ column: columnIndex })) ?? 0;
              return calcAdjustedValueFromOfferingPrice(
                offeringPrice,
                offeringPriceAdjustmentPct,
                offeringPriceAdjustmentAmt,
              );
            }
            const sellingPrice = s.factors?.find(f => f.id === '21')?.value;
            if (sellingPrice) {
              const numberOfYears = 5; // TODO: replacing by number of from selling date to current date, if month > 6, round up
              const sellingPriceAdjustmentYearPct =
                getValues(calculationAdjustmentYearPath({ column: columnIndex })) ?? 0;
              return calcAdjustedValueFromSellingPrice(
                sellingPrice,
                numberOfYears,
                sellingPriceAdjustmentYearPct,
              );
            }
            return 0;
          },
        },
        {
          targetPath: calculationLandAreaDiffPath({ column: columnIndex }),
          deps: [],
          compute: () => {
            const propertyLandArea = getPropertyValueByFactorCode('05', property) ?? 0;
            const surveyLandArea = s.factors?.find(f => f.id === '05')?.value ?? 0;
            const landDiff = calcDiff(propertyLandArea, surveyLandArea);

            return landDiff;
          },
        },
        {
          targetPath: calculationLandValueIncreaseDecreasePath({ column: columnIndex }),
          deps: ['landPrice'],
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
            const surveyUsableArea = s.factors?.find(f => f.id === '12')?.value ?? 0;
            const usableAreaDiff = calcDiff(propertyUsableArea, surveyUsableArea);

            return usableAreaDiff;
          },
        },
        {
          targetPath: calculationBuildingValueIncreaseDecreasePath({ column: columnIndex }),
          deps: ['usableAreaPrice'],
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
          deps: [adjustmentFactorsPath()],
          compute: ({ getValues }) => {
            const totalDiffAmt =
              getValues(calculationSumFactorAmtPath({ column: columnIndex })) ?? 0;
            const totalSecondRevision =
              getValues(calculationTotalSecondRevisionPath({ column: columnIndex })) ?? 0;
            const totalAdjustValue = calcDiff(totalSecondRevision, totalDiffAmt);
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
            return shouldAutoDefault({ value: curr, isDirty }) || weight > 1;
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
    .flat();
  return rules;
}

export function buildSaleGridAdjustmentFactorRules(args: {
  surveys: Survey[];
  qualitativeRows: any[];
}): DerivedFieldRule[] {
  const { surveys = [], qualitativeRows } = args;

  const {
    qualitativeLevel: qualitativeLevelPath,
    adjustmentFactorAdjustAmount: adjustmentFactorAdjustAmountPath,
    adjustmentFactorAdjustPercent: adjustmentFactorAdjustPercentPath,
    calculationTotalSecondRevision: calculationTotalSecondRevisionPath,
  } = saleGridFieldPath;

  /** Adjustment factors which initial by Qualitative part */
  const rules: DerivedFieldRule[] = qualitativeRows
    .map((f, rowIndex) => {
      return surveys.map((_, columnIndex) => {
        /** set adjustment factors section to be 1:1 with a qualitative section */
        return [
          {
            targetPath: adjustmentFactorAdjustPercentPath({ row: rowIndex, column: columnIndex }),
            deps: [qualitativeLevelPath({ row: rowIndex, column: columnIndex })],
            when: ({ getValues }) => {
              const target = adjustmentFactorAdjustPercentPath({
                row: rowIndex,
                column: columnIndex,
              });

              return qualitativeDefault.includes(
                getValues(
                  adjustmentFactorAdjustPercentPath({ row: rowIndex, column: columnIndex }),
                ),
              );
            },
            compute: ({ getValues }) => {
              const level =
                getValues(qualitativeLevelPath({ row: rowIndex, column: columnIndex })) ?? '';
              return qualitativeDefaultPercent(level);
            },
          },
          {
            targetPath: adjustmentFactorAdjustAmountPath({ row: rowIndex, column: columnIndex }),
            deps: [
              adjustmentFactorAdjustPercentPath({ row: rowIndex, column: columnIndex }),
              calculationTotalSecondRevisionPath({ column: columnIndex }),
            ],
            compute: ({ getValues }) => {
              const totalSecondRevision =
                getValues(calculationTotalSecondRevisionPath({ column: columnIndex })) ?? 0;
              const adjustPercent =
                getValues(
                  adjustmentFactorAdjustPercentPath({ row: rowIndex, column: columnIndex }),
                ) ?? 0;

              const adjustAmount = (totalSecondRevision * adjustPercent) / 100;
              return Number.isFinite(adjustAmount) ? parseFloat(adjustAmount.toFixed(2)) : 0;
            },
          },
        ];
      });
    })
    .flat(2);

  return rules;
}

export function buildSaleGridFinalValueRules(arg: { surveys: Survey[] }): DerivedFieldRule[] {
  const {
    finalValue: finalValuePath,
    finalValueRounded: finalValueRoundedPath,
    calculationWeightAdjustValue: calculationWeightAdjustValuePath,
  } = saleGridFieldPath;
  const { surveys = [] } = arg;

  const rules: DerivedFieldRule[] = [
    {
      targetPath: finalValuePath(),
      deps: [],
      compute: ({ getValues }) => {
        const totalWeightedAdjustValue = surveys.reduce((acc, curr, columnIndex) => {
          const weightedAdjustValue =
            getValues(calculationWeightAdjustValuePath({ column: columnIndex })) ?? 0;
          return acc + weightedAdjustValue;
        }, 0);
        return Number.isFinite(totalWeightedAdjustValue)
          ? parseFloat(totalWeightedAdjustValue.toFixed(2))
          : 0;
      },
      setValueOptions: {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
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
        return Number.isFinite(finalValue) ? parseFloat(finalValue.toFixed(2)) : 0;
      },
      setValueOptions: {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      },
    },
  ].flat();

  return rules;
}
