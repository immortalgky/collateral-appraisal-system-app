import { qualitativeDefaultPercent } from '@features/pricingAnalysis/domain/qualitativeDefault.ts';
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
} from '@features/pricingAnalysis/domain/calculateSaleAdjustmentGrid.ts';
import { shouldAutoDefault } from '@features/pricingAnalysis/domain/shouldAutoDefault.ts';
import type { DerivedFieldRule } from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { saleGridFieldPath } from '@/features/pricingAnalysis/adapters/saleAdjustmentGridFieldPath';
import { getPropertyValueByFactorCode } from '@features/pricingAnalysis/domain/getPropertyValueByFactorCode';
import type { MarketComparableDetailType } from '@features/pricingAnalysis/schemas';
import type { SaleAdjustmentGridQualitativeFormType } from '@features/pricingAnalysis/schemas/saleAdjustmentGridForm';
import { readFactorValue } from '@features/pricingAnalysis/domain/readFactorValue';

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
    calculationOfferingPrice: calculationOfferingPricePath,
    calculationOfferingPriceAdjustmentPct: calculationOfferingPriceAdjustmentPctPath,
    calculationOfferingPriceAdjustmentAmt: calculationOfferingPriceAdjustmentAmtPath,
    calculationTotalSecondRevision: calculationTotalSecondRevisionPath,
    calculationSellingPrice: calculationSellingPricePath,
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
            const offeringPrice = getValues(calculationOfferingPricePath({ column: columnIndex }));
            if (offeringPrice) {
              const offeringPriceAdjustmentPct =
                getValues(calculationOfferingPriceAdjustmentPctPath({ column: columnIndex })) ?? 0;
              const offeringPriceAdjustmentAmt =
                getValues(calculationOfferingPriceAdjustmentAmtPath({ column: columnIndex })) ?? 0;
              return calcAdjustedValue(
                offeringPrice,
                offeringPriceAdjustmentPct,
                offeringPriceAdjustmentAmt,
              );
            }
            const sellingPrice = getValues(calculationSellingPricePath({ column: columnIndex }));
            if (sellingPrice) {
              const numberOfYears =
                getValues(calculationNumberOfYearsPath({ column: columnIndex })) ?? 0;
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
          compute: ({ ctx }) => {
            const propertyLandArea = ctx.property?.landArea ?? 0;
            const findSurveyRai = (survey.factorData ?? []).find(f => f.factorCode === '43');
            const rai = findSurveyRai
              ? readFactorValue({
                  dataType: findSurveyRai.dataType,
                  fieldDecimal: findSurveyRai.fieldDecimal,
                  value: findSurveyRai.value,
                })
              : 0;
            const findSurveyNgan = (survey.factorData ?? []).find(f => f.factorCode === '44');
            const ngan = findSurveyNgan
              ? readFactorValue({
                  dataType: findSurveyNgan.dataType,
                  fieldDecimal: findSurveyNgan.fieldDecimal,
                  value: findSurveyNgan.value,
                })
              : 0;
            const findSurveyWah = (survey.factorData ?? []).find(f => f.factorCode === '45');
            const wah = findSurveyWah
              ? readFactorValue({
                  dataType: findSurveyWah.dataType,
                  fieldDecimal: findSurveyWah.fieldDecimal,
                  value: findSurveyWah.value,
                })
              : 0;
            const surveyLandArea = rai * 400 + ngan * 100 + wah;
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
          compute: ({ ctx }) => {
            const propertyUsableArea = ctx.property?.usableArea ?? 0;
            const findSurveyUsableArea = survey.factorData?.find(f => f.factorCode === '14');
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
