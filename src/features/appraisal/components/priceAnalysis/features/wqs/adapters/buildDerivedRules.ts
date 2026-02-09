import type { DerivedFieldRule } from '../../../components/useDerivedFieldArray';
import { calcAdjustedValueFromSellingPrice } from '../../saleAdjustmentGrid/domain/calculations';
import { shouldAutoDefault } from '../../saleAdjustmentGrid/domain/shouldAutoDefault';
import {
  calcAdjustedValue,
  calcAdjustValueFromSellingPrice,
  calcSum,
  calcWeightedScore,
  floorToTenThousands,
  round2,
  toFiniteNumber,
  toNumberArray,
} from '../domain/calculations';
import { forecast } from '../domain/forecast';
import { INTERCEPT, RSQ, SLOPE, STEYX } from '../domain/regression';
import { wqsFieldPath } from './fieldPath';

export function buildWQSScoringSurveyDerivedRules(args: {
  surveys: Survey[];
  scoringRows: any[];
}): DerivedFieldRule[] {
  const { surveys = [], scoringRows = [] } = args;

  const {
    scoringFactorWeight: scoringFactorWeightPath,
    scoringFactorIntensity: scoringFactorIntensityPath,
    scoringFactorWeightedIntensity: scoringFactorWeightedIntensityPath,
    scoringFactorCollateralScore: scoringFactorCollateralScorePath,
    scoringFactorCollateralWeightedScore: scoringFactorCollateralWeightedScorePath,
    scoringFactorSurveySurveyScore: scoringFactorSurveySurveyScorePath,
    scoringFactorSurveyWeightedSurveyScore: scoringFactorSurveyWeightedSurveyScorePath,
  } = wqsFieldPath;

  let rules: DerivedFieldRule[] = scoringRows
    .map((_, rowIndex) => {
      return [
        {
          targetPath: scoringFactorWeightedIntensityPath({ row: rowIndex }),
          deps: [
            scoringFactorWeightPath({ row: rowIndex }),
            scoringFactorIntensityPath({ row: rowIndex }),
          ],
          compute: ({ getValues }) => {
            const weight = getValues(scoringFactorWeightPath({ row: rowIndex })) ?? 0;
            const intensity = getValues(scoringFactorIntensityPath({ row: rowIndex }));
            return calcWeightedScore(weight, intensity);
          },
        },
        ...surveys.map((_, columnIndex) => {
          return {
            targetPath: scoringFactorSurveyWeightedSurveyScorePath({
              row: rowIndex,
              column: columnIndex,
            }),
            deps: [
              scoringFactorWeightPath({ row: rowIndex }),
              scoringFactorSurveySurveyScorePath({ row: rowIndex, column: columnIndex }),
            ],
            compute: ({ getValues }) => {
              const weight = getValues(scoringFactorWeightPath({ row: rowIndex })) ?? 0;
              const score =
                getValues(
                  scoringFactorSurveySurveyScorePath({ row: rowIndex, column: columnIndex }),
                ) ?? 0;
              return calcWeightedScore(weight, score);
            },
          };
        }),
        {
          targetPath: scoringFactorCollateralWeightedScorePath({ row: rowIndex }),
          deps: [
            scoringFactorWeightPath({ row: rowIndex }),
            scoringFactorCollateralScorePath({ row: rowIndex }),
          ],
          compute: ({ getValues }) => {
            const weight = getValues(scoringFactorWeightPath({ row: rowIndex })) ?? 0;
            const score = getValues(scoringFactorCollateralScorePath({ row: rowIndex }));
            return calcWeightedScore(weight, score);
          },
        },
      ];
    })
    .flat(2);

  return rules;
}

export function buildWQSCalculationDerivedRules(args: {
  surveys: Survey[];
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
    calculationAdjustmentYear: calculationAdjustmentYearPath,
    calculationNumberOfYears: calculationNumberOfYearsPath,
    calculationTotalAdjustedSellingPrice: calculationTotalAdjustedSellingPricePath,
  } = wqsFieldPath;

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
              return calcAdjustedValue(
                offeringPrice,
                offeringPriceAdjustmentPct,
                offeringPriceAdjustmentAmt,
              );
            }
            const sellingPrice = s.factors?.find(f => f.id === '21')?.value;
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
      ];
    })
    .flat();
  return rules;
}

export function buildWQSTotalScoreRules(args: {
  surveys: Survey[];
  property: Record<string, any>;
  scoringRows: any[];
}) {
  const { surveys, property, scoringRows } = args;

  const {
    scoringFactorWeight: scoringFactorWeightPath,
    scoringFactorIntensity: scoringFactorIntensityPath,
    scoringFactorWeightedIntensity: scoringFactorWeightedIntensityPath,
    scoringFactorSurveySurveyScore: scoringFactorSurveySurveyScorePath,
    scoringFactorSurveyWeightedSurveyScore: scoringFactorSurveyWeightedSurveyScorePath,
    scoringFactorCollateralScore: scoringFactorCollateralScorePath,
    scoringFactorCollateralWeightedScore: scoringFactorCollateralWeightedScorePath,

    totalWeight: totalWeightPath,
    totalIntensity: totalIntensityPath,
    totalWeightedIntensity: totalWeightedIntensityPath,
    totalSurveyScore: totalSurveyScorePath,
    totalWeightedSurveyScore: totalWeightedSurveyScorePath,
    totalMarketId: totalMarketIdPath,
    totalCollateralScore: totalCollateralScorePath,
    totalWeightedCollateralScore: totalWeightedCollateralScorePath,
  } = wqsFieldPath;
  const rules: DerivedFieldRule[] = [
    {
      targetPath: totalWeightPath(),
      deps: [...scoringRows.map((_, rowIndex) => scoringFactorWeightPath({ row: rowIndex }))],
      compute: ({ getValues }) => {
        const totalWeight = scoringRows.map(
          (_, rowIndex) => getValues(scoringFactorWeightPath({ row: rowIndex })) ?? 0,
        );
        return calcSum(totalWeight);
      },
    },
    {
      targetPath: totalIntensityPath(),
      deps: [...scoringRows.map((_, rowIndex) => scoringFactorIntensityPath({ row: rowIndex }))],
      compute: ({ getValues }) => {
        const totalIntensity = scoringRows.map(
          (_, rowIndex) => getValues(scoringFactorIntensityPath({ row: rowIndex })) ?? 0,
        );
        return calcSum(totalIntensity);
      },
    },
    {
      targetPath: totalWeightedIntensityPath(),
      deps: [
        ...scoringRows.map((_, rowIndex) => scoringFactorWeightedIntensityPath({ row: rowIndex })),
      ],
      compute: ({ getValues }) => {
        const totalWeightedScore = scoringRows.map(
          (_, rowIndex) => getValues(scoringFactorWeightedIntensityPath({ row: rowIndex })) ?? 0,
        );
        return calcSum(totalWeightedScore);
      },
    },
    ...surveys
      .map((s, columnIndex) => {
        return [
          {
            targetPath: totalSurveyScorePath({ column: columnIndex }),
            deps: [
              ...scoringRows.map((_, rowIndex) =>
                scoringFactorSurveySurveyScorePath({ row: rowIndex, column: columnIndex }),
              ),
            ],
            compute: ({ getValues }) => {
              const totalScore = scoringRows.map(
                (_, rowIndex) =>
                  getValues(
                    scoringFactorSurveySurveyScorePath({ row: rowIndex, column: columnIndex }),
                  ) ?? 0,
              );
              return calcSum(totalScore);
            },
          },
          {
            targetPath: totalWeightedSurveyScorePath({ column: columnIndex }),
            deps: [
              ...scoringRows.map((_, rowIndex) =>
                scoringFactorSurveyWeightedSurveyScorePath({ row: rowIndex, column: columnIndex }),
              ),
            ],
            compute: ({ getValues }) => {
              const totalWeightedScore = scoringRows.map(
                (_, rowIndex) =>
                  getValues(
                    scoringFactorSurveyWeightedSurveyScorePath({
                      row: rowIndex,
                      column: columnIndex,
                    }),
                  ) ?? 0,
              );
              return calcSum(totalWeightedScore);
            },
          },
        ];
      })
      .flat(1),
    {
      targetPath: totalCollateralScorePath(),
      deps: [
        ...scoringRows.map((_, rowIndex) => scoringFactorCollateralScorePath({ row: rowIndex })),
      ],
      compute: ({ getValues }) => {
        const totalScore = scoringRows.map(
          (_, rowIndex) => getValues(scoringFactorCollateralScorePath({ row: rowIndex })) ?? 0,
        );
        return calcSum(totalScore);
      },
    },
    {
      targetPath: totalWeightedCollateralScorePath(),
      deps: [
        ...scoringRows.map((_, rowIndex) =>
          scoringFactorCollateralWeightedScorePath({ row: rowIndex }),
        ),
      ],
      compute: ({ getValues }) => {
        const totalWeigtedScore = scoringRows.map(
          (_, rowIndex) =>
            getValues(scoringFactorCollateralWeightedScorePath({ row: rowIndex })) ?? 0,
        );
        return calcSum(totalWeigtedScore);
      },
    },
  ];

  return rules;
}

export function buildWQSFinalValueDerivedRules(args: {
  surveys: Survey[];
  property: Record<string, any>;
}): DerivedFieldRule[] {
  /** Calculation section */
  const { surveys = [], property } = args;
  const {
    totalWeightedSurveyScore: totalWeightedSurveyScorePath,
    totalWeightedCollateralScore: totalWeightedCollateralScorePath,
    calculationAdjustedValue: calculationAdjustedValuePath,

    finalValueFinalValue: finalValueFinalValuePath,
    finalValueFinalValueRounded: finalValueFinalValueRoundedPath,
    finalValueCoefficientOfDecision: finalValueCoefficientOfDecisionPath,
    finalValueStandardError: finalValueStandardErrorPath,
    finalValueIntersectionPoint: finalValueIntersectionPointPath,
    finalValuSlope: finalValuSlopePath,
    finalValueLowestEstimate: finalValueLowestEstimatePath,
    finalValueHighestEstimate: finalValueHighestEstimatePath,
    finalValueLandArea: finalValueLandAreaPath,
    finalValueAppraisalPrice: finalValueAppraisalPricePath,
    finalValueAppraisalPriceRounded: finalValueAppraisalPriceRoundedPath,
  } = wqsFieldPath;

  const rules: DerivedFieldRule[] = [
    {
      targetPath: finalValueFinalValuePath(),
      deps: [
        ...surveys.map((_, columnIndex) => totalWeightedSurveyScorePath({ column: columnIndex })),
        totalWeightedCollateralScorePath(),
        ...surveys.map((_, columnIndex) => calculationAdjustedValuePath({ column: columnIndex })),
      ],
      compute: ({ getValues }) => {
        const collateralScore = getValues(totalWeightedCollateralScorePath()) ?? 0;
        const surveyScores = toNumberArray(
          surveys.map((_, columnIndex) => {
            return getValues(totalWeightedSurveyScorePath({ column: columnIndex })) ?? 0;
          }),
        );
        const surveyCalculate = toNumberArray(
          surveys.map((_, columnIndex) => {
            return getValues(calculationAdjustedValuePath({ column: columnIndex })) ?? 0;
          }),
        );
        const forecastResult =
          forecast({
            x: collateralScore,
            known_ys: surveyCalculate,
            known_xs: surveyScores,
          }) ?? 0;
        return round2(toFiniteNumber(forecastResult));
      },
    },
    {
      targetPath: finalValueFinalValueRoundedPath(),
      deps: [finalValueFinalValuePath()],
      when: ({ getValues, getFieldState, formState }) => {
        const target = finalValueFinalValuePath();
        const curr = getValues(target) ?? 0;
        const { isDirty } = getFieldState(target, formState);
        return shouldAutoDefault({ value: curr, isDirty });
      },
      compute: ({ getValues }) => {
        const finalValue = getValues(finalValueFinalValuePath()) ?? 0;
        return floorToTenThousands(finalValue);
      },
    },
    {
      targetPath: finalValueCoefficientOfDecisionPath(),
      deps: [
        ...surveys.map((_, columnIndex) => totalWeightedSurveyScorePath({ column: columnIndex })),
        ...surveys.map((_, columnIndex) => calculationAdjustedValuePath({ column: columnIndex })),
      ],
      compute: ({ getValues }) => {
        const surveyScores = toNumberArray(
          surveys.map((_, columnIndex) => {
            return getValues(totalWeightedSurveyScorePath({ column: columnIndex })) ?? 0;
          }),
        );
        const surveyCalculate = toNumberArray(
          surveys.map((_, columnIndex) => {
            return getValues(calculationAdjustedValuePath({ column: columnIndex })) ?? 0;
          }),
        );
        const coefficient = RSQ(surveyScores, surveyCalculate) ?? 0;
        return toFiniteNumber(coefficient).toFixed(4);
      },
    },
    {
      targetPath: finalValueStandardErrorPath(),
      deps: [
        ...surveys.map((_, columnIndex) => totalWeightedSurveyScorePath({ column: columnIndex })),
        ...surveys.map((_, columnIndex) => calculationAdjustedValuePath({ column: columnIndex })),
      ],
      compute: ({ getValues }) => {
        const surveyScores = toNumberArray(
          surveys.map((_, columnIndex) => {
            return getValues(totalWeightedSurveyScorePath({ column: columnIndex })) ?? 0;
          }),
        );
        const surveyCalculate = toNumberArray(
          surveys.map((_, columnIndex) => {
            return getValues(calculationAdjustedValuePath({ column: columnIndex })) ?? 0;
          }),
        );
        const stdError = STEYX(surveyScores, surveyCalculate) ?? 0;
        return toFiniteNumber(stdError).toFixed(6);
      },
    },
    {
      targetPath: finalValueIntersectionPointPath(),
      deps: [
        ...surveys.map((_, columnIndex) => totalWeightedSurveyScorePath({ column: columnIndex })),
        ...surveys.map((_, columnIndex) => calculationAdjustedValuePath({ column: columnIndex })),
      ],
      compute: ({ getValues }) => {
        const surveyScores = toNumberArray(
          surveys.map((_, columnIndex) => {
            return getValues(totalWeightedSurveyScorePath({ column: columnIndex })) ?? 0;
          }),
        );
        const surveyCalculate = toNumberArray(
          surveys.map((_, columnIndex) => {
            return getValues(calculationAdjustedValuePath({ column: columnIndex })) ?? 0;
          }),
        );
        const intersectionPoint = INTERCEPT(surveyScores, surveyCalculate) ?? 0;
        return toFiniteNumber(intersectionPoint);
      },
    },
    {
      targetPath: finalValuSlopePath(),
      deps: [
        ...surveys.map((_, columnIndex) => totalWeightedSurveyScorePath({ column: columnIndex })),
        ...surveys.map((_, columnIndex) => calculationAdjustedValuePath({ column: columnIndex })),
      ],
      compute: ({ getValues }) => {
        const surveyScores = toNumberArray(
          surveys.map((_, columnIndex) => {
            return getValues(totalWeightedSurveyScorePath({ column: columnIndex })) ?? 0;
          }),
        );
        const surveyCalculate = toNumberArray(
          surveys.map((_, columnIndex) => {
            return getValues(calculationAdjustedValuePath({ column: columnIndex })) ?? 0;
          }),
        );
        const slope = SLOPE(surveyScores, surveyCalculate) ?? 0;
        return toFiniteNumber(slope);
      },
    },
    {
      targetPath: finalValueLowestEstimatePath(),
      deps: [finalValueFinalValueRoundedPath(), finalValueStandardErrorPath()],
      compute: ({ getValues }) => {
        const finalValueRounded = getValues(finalValueFinalValueRoundedPath()) ?? 0;
        const stdError = getValues(finalValueStandardErrorPath()) ?? 0;
        return round2(finalValueRounded - stdError);
      },
    },
    {
      targetPath: finalValueHighestEstimatePath(),
      deps: [finalValueFinalValueRoundedPath(), finalValueStandardErrorPath()],
      compute: ({ getValues }) => {
        const finalValueRounded = getValues(finalValueFinalValueRoundedPath()) ?? 0;
        const stdError = getValues(finalValueStandardErrorPath()) ?? 0;
        return round2(finalValueRounded + stdError);
      },
    },
    {
      targetPath: finalValueLandAreaPath(),
      deps: [],
      compute: ({ ctx }) => {
        const collateralType = ctx.property?.collateralType;

        if (collateralType === 'L') {
          return ctx.property?.landArea;
        }
        return null;
      },
    },
    {
      targetPath: finalValueAppraisalPricePath(),
      deps: [finalValueFinalValueRoundedPath(), finalValueLandAreaPath()],
      compute: ({ getValues, ctx }) => {
        const finalValueRounded = getValues(finalValueFinalValueRoundedPath()) ?? 0;
        const collateralType = ctx.property?.collateralType;

        if (collateralType === 'L') {
          const landArea = getValues(finalValueLandAreaPath()) ?? 0;
          return round2(finalValueRounded * landArea);
        }

        return round2(finalValueRounded);
      },
    },
    {
      targetPath: finalValueAppraisalPriceRoundedPath(),
      deps: [finalValueAppraisalPricePath()],
      compute: ({ getValues, ctx }) => {
        const appraisalPrice = getValues(finalValueAppraisalPricePath()) ?? 0;
        return floorToTenThousands(appraisalPrice);
      },
    },
  ];

  return rules;
}
