import type { DerivedFieldRule } from '../../components/useDerivedFieldArray';
import { getPropertyValueByFactorCode } from '../../domain/getPropertyValueByFactorCode';
import { qualitativeDefaultPercent } from '../../domain/qualitativeDefault';
import { shouldAutoDefault } from '../../domain/shouldAutoDefault';
import { saleGridFieldPath } from '../../features/saleAdjustmentGrid/adapters/fieldPath';

export function buildSaleGridQualitativeDerivedRules(args: {
  surveys: any[];
  qualitativeRows: any[];
}): DerivedFieldRule[] {
  const { qualitativeRows, surveys } = args;

  const { adjustmentFactorsFactorCode, qualitativeMarketId } = saleGridFieldPath;

  /** Adjustment factors which initial by Qualitative part */
  const rules: DerivedFieldRule[] = qualitativeRows
    .map((f, rowIndex) => {
      return [
        {
          targetPath: adjustmentFactorsFactorCode({ row: rowIndex }),
          deps: [],
          compute: () => f.factorCode ?? '',
        },
        ...surveys.map((survey, columnIndex) => {
          return {
            targetPath: qualitativeMarketId({ row: rowIndex, column: columnIndex }),
            deps: [],
            compute: () => survey.marketId,
          };
        }),
      ];
    })
    .flat(2);

  return rules;
}

export function buildSaleGridCalculationDerivedRules(args: {
  surveys: any[];
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
              return offeringPriceAdjustmentPct > 0
                ? offeringPrice - (offeringPrice * offeringPriceAdjustmentPct) / 100
                : offeringPriceAdjustmentAmt > 0
                  ? offeringPriceAdjustmentAmt
                  : offeringPrice;
            }
            const sellingPrice = s.factors?.find(f => f.id === '21')?.value;
            if (sellingPrice) {
              const numberOfYears = 5; // TODO: replcing by number of from selling date to current date, if month > 6, round up
              const sellingPriceAdjustmentYear = getValues(
                calculationAdjustmentYearPath({ column: columnIndex }),
              );
              return (
                sellingPrice + (sellingPrice * numberOfYears * sellingPriceAdjustmentYear) / 100
              );
            }
            return 0;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          },
        },
        {
          targetPath: calculationLandAreaDiffPath({ column: columnIndex }),
          deps: [],
          compute: () => {
            const propertyLandArea = getPropertyValueByFactorCode('05', property) ?? 0;
            const surveyLandArea = s.factors?.find(f => f.id === '05')?.value ?? 0;
            const landDiff = propertyLandArea - surveyLandArea;

            return Number.isFinite(landDiff) ? parseFloat(landDiff.toFixed(2)) : 0;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          },
        },
        {
          targetPath: calculationLandValueIncreaseDecreasePath({ column: columnIndex }),
          deps: ['landPrice'],
          compute: ({ getValues }) => {
            const landPrice = getValues('landPrice') ?? 0;
            const landDiff = getValues(calculationLandAreaDiffPath({ column: columnIndex })) ?? 0;
            const landValueIncreaseDecrease = landPrice * landDiff;
            return Number.isFinite(landValueIncreaseDecrease)
              ? parseFloat(landValueIncreaseDecrease.toFixed(2))
              : 0;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          },
        },
        {
          targetPath: calculationUsableAreaDiffPath({ column: columnIndex }),
          deps: [],
          compute: () => {
            const propertyUsableArea = getPropertyValueByFactorCode('12', property) ?? 0;
            const surveyUsableArea = s.factors?.find(f => f.id === '12')?.value ?? 0;
            const usableAreaDiff = propertyUsableArea - surveyUsableArea;

            return Number.isFinite(usableAreaDiff) ? parseFloat(usableAreaDiff.toFixed(2)) : 0;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          },
        },
        {
          targetPath: calculationBuildingValueIncreaseDecreasePath({ column: columnIndex }),
          deps: ['usableAreaPrice'],
          compute: ({ getValues }) => {
            const usableAreaPrice = getValues('usableAreaPrice') ?? 0;
            const usableAreaDiff =
              getValues(calculationUsableAreaDiffPath({ column: columnIndex })) ?? 0;
            const buildingValueIncreaseDecrease = usableAreaPrice * usableAreaDiff;
            return Number.isFinite(buildingValueIncreaseDecrease)
              ? parseFloat(buildingValueIncreaseDecrease.toFixed(2))
              : 0;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
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
            const landValueIncreaseDecrease = getValues(
              calculationLandValueIncreaseDecreasePath({ column: columnIndex }),
            );
            const totalSecondRevision =
              adjustedValue + buildingValueIncreaseDecrease + landValueIncreaseDecrease;
            return Number.isFinite(totalSecondRevision)
              ? parseFloat(totalSecondRevision.toFixed(2))
              : 0;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          },
        },
        {
          targetPath: calculationSumFactorPctPath({ column: columnIndex }),
          deps: [adjustmentFactorsPath()],
          compute: ({ getValues }) => {
            const saleAdjustmentGridAdjustmentFactors = getValues(adjustmentFactorsPath()) ?? [];
            const totalDiffPct = saleAdjustmentGridAdjustmentFactors.reduce((acc, curr) => {
              const adjustPercent = curr.surveys?.[columnIndex]?.adjustPercent ?? 0;
              return acc + adjustPercent;
            }, 0);
            return Number.isFinite(totalDiffPct) ? parseFloat(totalDiffPct.toFixed(2)) : 0;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          },
        },
        {
          targetPath: calculationSumFactorAmtPath({ column: columnIndex }),
          deps: [adjustmentFactorsPath()],
          compute: ({ getValues }) => {
            const saleAdjustmentGridAdjustmentFactors = getValues(adjustmentFactorsPath()) ?? [];
            const totalDiffAmt = saleAdjustmentGridAdjustmentFactors.reduce((acc, curr) => {
              const adjustAmount = curr.surveys?.[columnIndex]?.adjustAmount ?? 0;
              return acc + adjustAmount;
            }, 0);
            return Number.isFinite(totalDiffAmt) ? parseFloat(totalDiffAmt.toFixed(2)) : 0;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
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
            const totalAdjustValue = totalSecondRevision - totalDiffAmt;
            return Number.isFinite(totalAdjustValue) ? parseFloat(totalAdjustValue.toFixed(2)) : 0;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          },
        },
        {
          targetPath: calculationWeightPath({ column: columnIndex }),
          deps: [],
          when: ({ getValues, getFieldState, formState }) => {
            const target = calculationWeightPath({ column: columnIndex });
            const curr = getValues(target);
            const { isDirty } = getFieldState(target, formState);
            return shouldAutoDefault({ value: curr, isDirty });
          },
          compute: () => {
            const numberOfSurveys = surveys.length ?? 0;
            return 100 / numberOfSurveys;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
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
            const weightedAdjustValue = totalAdjustValue * weight;
            return Number.isFinite(weightedAdjustValue)
              ? parseFloat(weightedAdjustValue.toFixed(2))
              : 0;
          },
          setValueOptions: {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          },
        },
      ];
    })
    .flat();
  return rules;
}

export function buildSaleGridAdjustmentFactorRules(args: {
  surveys: any[];
  qualitativeRows: any[];
}): DerivedFieldRule[] {
  const { surveys = [], qualitativeRows } = args;

  const {
    qualitativeLevel,
    adjustmentFactorMarketId,
    adjustmentFactorAdjustAmount,
    adjustmentFactorAdjustPercent,
    calculationTotalSecondRevision,
  } = saleGridFieldPath;

  /** Adjustment factors which initial by Qualitative part */
  const rules: DerivedFieldRule[] = qualitativeRows
    .map((f, rowIndex) => {
      return surveys.map((survey, columnIndex) => {
        /** set adjustment factors section to be 1:1 with qualitative section */
        return [
          {
            targetPath: adjustmentFactorMarketId({ row: rowIndex, column: columnIndex }),
            deps: [],
            compute: () => {
              return survey.marketId;
            },
          },
          {
            targetPath: adjustmentFactorAdjustPercent({ row: rowIndex, column: columnIndex }),
            deps: [
              qualitativeLevel({ row: rowIndex, column: columnIndex }),
              adjustmentFactorAdjustPercent({ row: rowIndex, column: columnIndex }),
            ],
            when: ({ getValues, getFieldState, formState }) => {
              const target = adjustmentFactorAdjustPercent({
                row: rowIndex,
                column: columnIndex,
              });
              const curr = getValues(target);
              const { isDirty } = getFieldState(target, formState);

              const level =
                getValues(qualitativeLevel({ row: rowIndex, column: columnIndex })) ?? '';
              const defaultPercent = qualitativeDefaultPercent(level);
              console.log(
                defaultPercent,
                getValues(adjustmentFactorAdjustPercent({ row: rowIndex, column: columnIndex })),
              );

              return (
                defaultPercent ==
                  getValues(
                    adjustmentFactorAdjustPercent({ row: rowIndex, column: columnIndex }),
                  ) ||
                !getValues(adjustmentFactorAdjustPercent({ row: rowIndex, column: columnIndex }))
              );
            },
            compute: ({ getValues }) => {
              const level =
                getValues(qualitativeLevel({ row: rowIndex, column: columnIndex })) ?? '';
              return qualitativeDefaultPercent(level);
            },
            setValueOptions: {
              shouldDirty: false,
              shouldTouch: false,
              shouldValidate: false,
            },
          },
          {
            targetPath: adjustmentFactorAdjustAmount({ row: rowIndex, column: columnIndex }),
            deps: [
              adjustmentFactorAdjustPercent({ row: rowIndex, column: columnIndex }),
              calculationTotalSecondRevision({ column: columnIndex }),
            ],
            compute: ({ getValues }) => {
              const totalSecondRevision =
                getValues(calculationTotalSecondRevision({ column: columnIndex })) ?? 0;
              const adjustPercent =
                getValues(adjustmentFactorAdjustPercent({ row: rowIndex, column: columnIndex })) ??
                0;

              const adjustAmount = (totalSecondRevision * adjustPercent) / 100;
              return Number.isFinite(adjustAmount) ? parseFloat(adjustAmount.toFixed(2)) : 0;
            },
            setValueOptions: {
              shouldDirty: false,
              shouldTouch: false,
              shouldValidate: false,
            },
          },
        ];
      });
    })
    .flat(2);

  return rules;
}

export function buildSaleGridFinalValueRules(arg: { surveys: any[] }): DerivedFieldRule[] {
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
        const curr = getValues(target);
        const { isDirty } = getFieldState(target, formState);
        return shouldAutoDefault({ value: curr, isDirty });
      },
      compute: ({ getValues }) => {
        const finalValue = getValues(finalValuePath());
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
