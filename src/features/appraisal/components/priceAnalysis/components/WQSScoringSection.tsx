import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import clsx from 'clsx';
import { RHFInputCell } from './table/RHFInputCell';
import { Icon } from '@/shared/components';
import {
  buildWQSCalculationDerivedRules,
  buildWQSFinalValueDerivedRules,
  buildWQSScoringSurveyDerivedRules,
  buildWQSTotalScoreRules,
} from '../adapters/buildWQSDerivedRules';
import { useMemo } from 'react';
import type {
  FactorDataType,
  MarketComparableDataType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '../schemas/v1';
import type { ComparativeFactorFormType, WQSScoreFormType } from '../schemas/wqsForm';
import {
  type DerivedFieldRule,
  useDerivedFields,
} from '@features/appraisal/components/priceAnalysis/adapters/useDerivedFieldArray.tsx';
import { getFactorDesciption } from '@features/appraisal/components/priceAnalysis/domain/getFactorDescription.ts';

interface WQSScoringSectionProps {
  comparativeSurveys: MarketComparableDataType[];
  property: Record<string, any>;
  template?: TemplateDetailType;
  isLoading: boolean;
}

export function WQSScoringSection({
  comparativeSurveys = [],
  property,
  template,
  isLoading = true,
}: WQSScoringSectionProps) {
  const {
    comparativeFactors: comparativeFactorsPath,

    /** scoring section path */
    scoringFactors: scoringFactorsPath,
    scoringFactorCode: scoringFactorCodePath,
    scoringFactorWeight: scoringFactorWeightPath,
    scoringFactorIntensity: scoringFactorIntensityPath,
    scoringFactorWeightedIntensity: scoringFactorWeightedIntensityPath,

    scoringFactorCollateralScore: scoringFactorCollateralScorePath,
    scoringFactorCollateralWeightedScore: scoringFactorCollateralWeightedScorePath,

    scoringFactorSurveySurveyScore: scoringFactorSurveySurveyScorePath,
    scoringFactorSurveyWeightedSurveyScore: scoringFactorSurveyWeightedSurveyScorePath,

    /** total score */
    totalWeight: totalWeightPath,
    totalIntensity: totalIntensityPath,
    totalWeightedIntensity: totalWeightedIntensityPath,
    totalSurveyScore: totalSurveyScorePath,
    totalWeightedSurveyScore: totalWeightedSurveyScorePath,
    totalCollateralScore: totalCollateralScorePath,
    totalWeightedCollateralScore: totalWeightedCollateralScorePath,

    /** calculation section path */
    calculationOfferingPrice: calculationOfferingPricePath,
    calculationOfferingPriceAdjustmentPct: calculationOfferingPriceAdjustmentPctPath,
    calculationOfferingPriceAdjustmentAmt: calculationOfferingPriceAdjustmentAmtPath,
    calculationSellingPrice: calculationSellingPricePath,
    calculationNumberOfYears: calculationNumberOfYearsPath,
    calculationAdjustmentYear: calculationAdjustmentYearPath,
    calculationTotalAdjustedSellingPrice: calculationTotalAdjustedSellingPricePath,
    calculationAdjustedValue: calculationAdjustedValuePath,
  } = wqsFieldPath;

  const { control, getValues } = useFormContext();
  const {
    fields: scoringFactorFields,
    append: appendScoringFactor,
    remove: removeScoringFactor,
  } = useFieldArray({
    control,
    name: scoringFactorsPath(),
  });

  const scoringFactors = useMemo(() => {
    return (getValues(scoringFactorsPath()) as WQSScoreFormType[]) ?? [];
  }, [scoringFactorFields]);

  const comparativeFactors =
    (useWatch({ name: comparativeFactorsPath() }) as ComparativeFactorFormType[]) ?? [];

  const handleAddRow = () => {
    appendScoringFactor({
      factorCode: '',
      weight: 0,
      intensity: 0,
      weightedIntensity: 0,
      surveys: comparativeSurveys.map(s => {
        return {
          marketId: s.id,
          surveyScore: 0,
          weightedSurveyScore: 0,
        };
      }),
      collateral: 0,
      collateralWeightedScore: 0,
    });
  };

  const handleRemoveRow = (rowIndex: number) => {
    removeScoringFactor(rowIndex);
  };

  /** Rules */
  const scoringSurveyRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSScoringSurveyDerivedRules({
      surveys: comparativeSurveys,
      scoringRows: scoringFactors,
    });
  }, [comparativeSurveys, scoringFactors, property]);

  const totalScoreRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSTotalScoreRules({
      surveys: comparativeSurveys,
      scoringRows: scoringFactors,
    });
  }, [comparativeSurveys, scoringFactors, property]);

  const calculationRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSCalculationDerivedRules({ surveys: comparativeSurveys });
  }, [comparativeSurveys, property]);

  const finalValueRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSFinalValueDerivedRules({ surveys: comparativeSurveys });
  }, [comparativeSurveys, property]);

  useDerivedFields({ rules: scoringSurveyRules });
  useDerivedFields({ rules: totalScoreRules });
  useDerivedFields({ rules: calculationRules });
  useDerivedFields({ rules: finalValueRules, ctx: { property: property } });

  const bgGradient =
    'after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full';
  const leftColumnBody =
    'border-b border-gray-300 text-left font-medium text-gray-600 px-3 py-2.5 sticky left-0 z-20 w-[350px] min-w-[350px] max-w-[350px] h-14 whitespace-nowrap';
  const bgGradientLeft =
    'after:absolute after:left-[-2rem] after:top-0 after:h-full after:w-4 after:bg-gradient-to-l after:from-black/5 after:to-transparent after:translate-x-full';
  const rightColumnBody =
    'border-b border-gray-300 text-left font-medium sticky right-[0px] z-30 w-[70px] min-w-[70px] max-w-[70px] whitespace-nowrap';
  const surveyStyle = 'px-3 py-2.5 border-b border-r border-gray-300';

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 rounded-xl">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="table table-sm min-w-max border-separate border-spacing-0">
          <thead className="bg-neutral-50">
            <tr className="border-b border-gray-300">
              <th
                rowSpan={comparativeSurveys.length > 0 ? 2 : 1}
                className={clsx(
                  'bg-gray-50 border-r border-b border-gray-300 text-left font-medium sticky top-0 left-0 z-30 w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap',
                  bgGradient,
                )}
              >
                <div>Factors</div>
              </th>
              <th
                rowSpan={comparativeSurveys.length > 0 ? 2 : 1}
                className={clsx(
                  'bg-gray-50 border-r border-b border-gray-300 text-left font-medium sticky top-0 left-[350px] z-30 w-[100px] min-w-[100px] max-w-[100px] whitespace-nowrap',
                )}
              >
                <div className="text-wrap">Clutter Weight</div>
              </th>
              <th
                colSpan={2}
                className={clsx(
                  'bg-gray-50 border-b border-gray-300 text-center font-medium sticky left-[450px] top-0 z-30 h-[40px] min-h-[40px] max-h-[40px] whitespace-nowrap',
                  bgGradient,
                )}
              >
                <div>Calculation</div>
              </th>
              {comparativeSurveys.length > 0 && (
                <th
                  colSpan={comparativeSurveys.length}
                  className="bg-gray-50 border-b border-r border-gray-300 text-center font-medium sticky top-0 z-23 h-[40px] min-h-[40px] max-h-[40px] whitespace-nowrap"
                >
                  <div>Comparative Data</div>
                </th>
              )}
              <th
                rowSpan={2}
                className={clsx(
                  'bg-gray-50 border-b border-gray-300 text-center font-medium sticky top-0 z-23 h-[40px] min-h-[40px] max-h-[40px] whitespace-nowrap',
                )}
              >
                <div>Collateral</div>
              </th>
              <th
                rowSpan={2}
                className={clsx(
                  'bg-gray-50 border-b border-gray-300 text-center sticky top-0 right-0 z-25 w-[70px] min-w-[70px] max-w-[70px] whitespace-nowrap',
                  bgGradientLeft,
                )}
              >
                <div></div>
              </th>
            </tr>
            <tr className="border-b border-gray-300">
              <td
                className={clsx(
                  'bg-gray-50 border-b border-r border-gray-300 text-left font-medium px-3 py-2.5 sticky left-[450px] z-30 w-[100px] min-w-[100px] max-w-[100px] h-14 whitespace-nowrap',
                )}
              >
                Intensity
              </td>
              <td
                className={clsx(
                  'bg-gray-50 border-b border-gray-300 text-left font-medium px-3 py-2.5 sticky left-[550px] z-30 w-[100px] min-w-[100px] max-w-[100px] h-14 whitespace-nowrap',
                  bgGradient,
                )}
              >
                Score
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType) => {
                return (
                  <th
                    key={survey.id}
                    className={
                      'bg-gray-50 font-medium text-center px-3 py-2.5 border-r border-b border-gray-300 sticky top-[40px] h-[70px] min-h-[70px] max-h-[70px] z-23 whitespace-nowrap'
                    }
                  >
                    <div className="flex flex-col">
                      <div className="p-1">{survey.surveyName}</div>
                      <div className="flex flex-row justify-between items-center">
                        <span>Score</span>
                        <span>Weighted Score</span>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={comparativeSurveys.length + 3}>Loading</td>
              </tr>
            ) : (
              /** scoring section */
              scoringFactors.map((factor, rowIndex: number) => {
                const selected = factor.factorCode ?? '';
                const options = comparativeFactors
                  .filter(
                    compFact =>
                      compFact.factorCode === selected ||
                      !scoringFactors.some(q => q.factorCode === compFact.factorCode),
                  )
                  .map(f => ({
                    label: getFactorDesciption(f.factorCode) ?? '',
                    value: f.factorCode,
                  }));
                return (
                  <tr key={factor.factorCode}>
                    <td className={clsx('bg-white border-r', leftColumnBody)}>
                      <div className="truncate">
                        {template?.calculationFactors?.find(
                          t => t.factorCode === factor.factorCode,
                        ) ? (
                          <RHFInputCell
                            fieldName={scoringFactorCodePath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) =>
                              value ? getFactorDesciption(value.toString()) : ''
                            }
                          />
                        ) : (
                          <RHFInputCell
                            fieldName={scoringFactorCodePath({ row: rowIndex })}
                            inputType="select"
                            options={options}
                          />
                        )}
                      </div>
                    </td>
                    <td
                      className={clsx(
                        'bg-white border-b border-r border-gray-300 w-[100px] max-w-[100px] min-w-[100px] z-30 sticky left-[350px]',
                      )}
                    >
                      <RHFInputCell
                        fieldName={scoringFactorWeightPath({ row: rowIndex })}
                        inputType="number"
                      />
                    </td>
                    <td
                      className={clsx(
                        'bg-white border-b border-r border-gray-300 w-[100px] max-w-[100px] min-w-[100px] z-30 sticky left-[450px]',
                      )}
                    >
                      <RHFInputCell
                        fieldName={scoringFactorIntensityPath({ row: rowIndex })}
                        inputType="number"
                      />
                    </td>
                    {/* weight * intensity */}
                    <td
                      className={clsx(
                        'bg-white border-b border-gray-300 w-[100px] max-w-[100px] min-w-[100px] z-30 sticky left-[550px]',
                        bgGradient,
                      )}
                    >
                      <RHFInputCell
                        fieldName={scoringFactorWeightedIntensityPath({ row: rowIndex })}
                        inputType="display"
                        accessor={({ value }) => value.toLocaleString() ?? 0}
                      />
                    </td>

                    {comparativeSurveys.map(
                      (survey: MarketComparableDetailType, columnIndex: number) => {
                        return (
                          <td key={survey.id} className={clsx(surveyStyle)}>
                            <div className="flex flex-row justitfy-between items-center gap-2">
                              <div className="w-[100px]">
                                <RHFInputCell
                                  fieldName={scoringFactorSurveySurveyScorePath({
                                    row: rowIndex,
                                    column: columnIndex,
                                  })}
                                  inputType="number"
                                  onUserChange={v => {
                                    if (v == null) return null;
                                    const intensity = getValues(
                                      scoringFactorIntensityPath({ row: rowIndex }) ?? 0,
                                    );
                                    if (v > intensity) return intensity;
                                    if (v < 0) return 0;
                                    return v;
                                  }}
                                />
                              </div>
                              <div className="w-[80px] text-right">
                                <RHFInputCell
                                  fieldName={scoringFactorSurveyWeightedSurveyScorePath({
                                    row: rowIndex,
                                    column: columnIndex,
                                  })}
                                  inputType="display"
                                  accessor={({ value }) => value.toLocaleString() ?? 0}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      },
                    )}

                    <td className={clsx('bg-white border-b border-gray-300', bgGradientLeft)}>
                      <div className="flex flex-row justitfy-between items-center gap-2">
                        <div className="w-[100px]">
                          <RHFInputCell
                            fieldName={scoringFactorCollateralScorePath({
                              row: rowIndex,
                            })}
                            inputType="number"
                            onUserChange={v => {
                              if (v == null) return null;
                              const intensity = getValues(
                                scoringFactorIntensityPath({ row: rowIndex }) ?? 0,
                              );
                              if (v > intensity) return intensity;
                              if (v < 0) return 0;
                              return v;
                            }}
                          />
                        </div>
                        <div className="w-[80px] text-right">
                          <RHFInputCell
                            fieldName={scoringFactorCollateralWeightedScorePath({
                              row: rowIndex,
                            })}
                            inputType="display"
                            accessor={({ value }) => value.toLocaleString() ?? 0}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={clsx('bg-white', bgGradientLeft, rightColumnBody)}>
                      {/* if rowIndex > template factors length, show delete button */}
                      {!template?.calculationFactors?.find(
                        t => t.factorCode === factor.factorCode,
                      ) && (
                        <div className="flex flex-row justify-center items-center">
                          <button
                            type="button"
                            onClick={() => {
                              handleRemoveRow(rowIndex);
                            }}
                            className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors "
                            title="Delete"
                          >
                            <Icon style="solid" name="trash" className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}

            {/* add new row */}
            <tr>
              <td className={clsx('bg-white border-r z-19', leftColumnBody)}>
                <button
                  type="button"
                  onClick={() => handleAddRow()}
                  className="px-4 py-2 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                >
                  + Add More Factors
                </button>
              </td>
              <td
                className={clsx(
                  'bg-white border-b border-r border-gray-300 w-[100px] max-w-[100px] min-w-[100px] z-30 sticky left-[350px]',
                )}
              ></td>
              <td
                className={clsx(
                  'bg-white border-b border-r border-gray-300 w-[100px] max-w-[100px] min-w-[100px] z-30 sticky left-[450px]',
                )}
              ></td>
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 w-[100px] max-w-[100px] min-w-[100px] z-30 sticky left-[550px]',
                  bgGradient,
                )}
              ></td>
              {comparativeSurveys.map(survey => {
                return <td key={survey.id} className={clsx(surveyStyle)}></td>;
              })}
              <td className={clsx('border-b border-gray-300')}></td>
              <td
                className={clsx(
                  'border-b border-gray-300 sticky right-0 z-25 bg-white w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>

            {/* total score row */}
            <tr>
              <td className={clsx('bg-white border-r', leftColumnBody)}></td>
              <td
                className={clsx(
                  'bg-white border-b border-r border-gray-300 w-[100px] max-w-[100px] min-w-[100px] z-30 sticky left-[350px]',
                )}
              >
                <RHFInputCell fieldName={totalWeightPath()} inputType="display" />
              </td>
              <td
                className={clsx(
                  'bg-white border-b border-r border-gray-300 w-[100px] max-w-[100px] min-w-[100px] z-30 sticky left-[450px]',
                )}
              >
                <RHFInputCell fieldName={totalIntensityPath()} inputType="display" />
              </td>
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 w-[100px] max-w-[100px] min-w-[100px] z-30 sticky left-[550px]',
                  bgGradient,
                )}
              >
                <RHFInputCell
                  fieldName={totalWeightedIntensityPath()}
                  inputType="display"
                  accessor={({ value }) => {
                    const weightedIntensity = value ? Number(value) : 0;
                    return weightedIntensity > 100 ? (
                      <span className="text-danger">{weightedIntensity}</span>
                    ) : (
                      <span>{weightedIntensity}</span>
                    );
                  }}
                />
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                return (
                  <td key={survey.id} className={clsx(surveyStyle)}>
                    <div className={'flex flex-rows justify-between items-center'}>
                      <div>
                        <RHFInputCell
                          fieldName={totalSurveyScorePath({ column: columnIndex })}
                          inputType="display"
                        />
                      </div>
                      <div>
                        <RHFInputCell
                          fieldName={totalWeightedSurveyScorePath({ column: columnIndex })}
                          inputType="display"
                          accessor={({ value }) => {
                            const weightedScore = value ? Number(value) : 0;
                            return weightedScore > 100 ? (
                              <span className="text-danger">{weightedScore}</span>
                            ) : (
                              <span>{weightedScore}</span>
                            );
                          }}
                        />
                      </div>
                    </div>
                  </td>
                );
              })}
              <td className={clsx('border-b border-gray-300')}>
                <div className={'flex flex-rows justify-between items-center'}>
                  <div>
                    <RHFInputCell fieldName={totalCollateralScorePath()} inputType="display" />
                  </div>
                  <div>
                    <RHFInputCell
                      fieldName={totalWeightedCollateralScorePath()}
                      inputType="display"
                      accessor={({ value }) => {
                        const weightedScore = value ? Number(value) : 0;
                        return weightedScore > 100 ? (
                          <span className="text-danger">{weightedScore}</span>
                        ) : (
                          <span>{weightedScore}</span>
                        );
                      }}
                    />
                  </div>
                </div>
              </td>
              <td
                className={clsx(
                  'border-b border-gray-300 sticky right-0 z-25 bg-white w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>

            {/* scoring criteria */}
            <tr>
              <td colSpan={4} className={clsx('bg-white', leftColumnBody)}>
                <div className="flex flex-row justify-start items-center">{`Scoring Criteria : 1-2 Very low, 3-4 Fair, 5-6 Average, 7-8 Good, 9-10 Very Good`}</div>
              </td>
              <td
                colSpan={comparativeSurveys?.length + 2}
                className={clsx('bg-white border-b border-gray-300')}
              ></td>
            </tr>

            {/* calculation section */}
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody)}>Initial Price</td>
              <td
                className={clsx('bg-gray-200 border-b border-gray-300 sticky left-[350px] z-30')}
              ></td>
              <td
                className={clsx('bg-gray-200 border-b border-gray-300 sticky left-[450px] z-30')}
              ></td>
              <td
                className={clsx(
                  'bg-gray-200 border-b border-gray-300 sticky left-[550px] z-30',
                  bgGradient,
                )}
              ></td>
              {comparativeSurveys.map(survey => {
                return <td key={survey.id} className={clsx('bg-gray-200', surveyStyle)}></td>;
              })}
              <td className={clsx('bg-gray-200 border-b border-gray-300')}></td>
              <td
                className={clsx(
                  'border-b border-gray-300 bg-gray-200 sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Offering Price</span>
              </td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[350px] z-30')}
              ></td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[450px] z-30')}
              ></td>
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 sticky left-[550px] z-30',
                  bgGradient,
                )}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                return (
                  <td key={survey.id} className={clsx(surveyStyle, 'text-right')}>
                    <RHFInputCell
                      fieldName={calculationOfferingPricePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => (value ? value.toLocaleString() : '')}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white border-b border-gray-300')}></td>
              <td
                className={clsx(
                  'border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className={'flex flex-rows justify-left gap-2 items-center'}>
                  <span>Adjusted Offering Price</span>
                  <span>(%)</span>
                </div>
              </td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[350px] z-30')}
              ></td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[450px] z-30')}
              ></td>
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 sticky left-[550px] z-30',
                  bgGradient,
                )}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const offeringPrice = survey.factorData?.find(
                  (f: FactorDataType) => f.factorCode === '17',
                );
                if (!offeringPrice)
                  return <td key={survey.id} className={'border-b border-r border-gray-300'}></td>;
                return (
                  <td key={survey.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={calculationOfferingPriceAdjustmentPctPath({ column: columnIndex })}
                      inputType="number"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white border-b border-gray-300')}></td>
              <td
                className={clsx(
                  'border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Adjusted Offering Price</span>
                <span>(Amount)</span>
              </td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[350px] z-30')}
              ></td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[450px] z-30')}
              ></td>
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 sticky left-[550px] z-30',
                  bgGradient,
                )}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const offeringPrice = survey.factorData?.find(
                  (f: FactorDataType) => f.factorCode === '17',
                );
                if (!offeringPrice)
                  return <td key={survey.id} className={'border-b border-r border-gray-300'}></td>;
                return (
                  <td key={survey.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={calculationOfferingPriceAdjustmentAmtPath({ column: columnIndex })}
                      inputType="number"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white border-b border-gray-300')}></td>
              <td
                className={clsx(
                  'border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Selling Price</span>
              </td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[350px] z-30')}
              ></td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[450px] z-30')}
              ></td>
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 sticky left-[550px] z-30',
                  bgGradient,
                )}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const sellingPrice = survey.factorData?.find(
                  (f: FactorDataType) => f.factorCode === '21',
                );
                if (!sellingPrice) return <td key={survey.id} className={clsx(surveyStyle)}></td>;
                return (
                  <td key={survey.id} className={clsx(surveyStyle, 'text-right')}>
                    <RHFInputCell
                      fieldName={calculationSellingPricePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : '';
                      }}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white border-b border-gray-300')}></td>
              <td
                className={clsx(
                  'border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>Number of Years</td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[350px] z-30')}
              ></td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[450px] z-30')}
              ></td>
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 sticky left-[550px] z-30',
                  bgGradient,
                )}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                return (
                  <td key={survey.id} className={clsx('text-right', surveyStyle)}>
                    <RHFInputCell
                      fieldName={calculationNumberOfYearsPath({ column: columnIndex })} // TODO: convert date
                      inputType="display"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white border-b border-gray-300')}></td>
              <td
                className={clsx(
                  'border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                Adjusted Selling Price
              </td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[350px] z-30')}
              ></td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[450px] z-30')}
              ></td>
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 sticky left-[550px] z-30',
                  bgGradient,
                )}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const sellingPrice = survey.factorData?.find(
                  (f: FactorDataType) => f.factorCode === '21',
                );
                if (!sellingPrice) return <td key={survey.id} className={clsx(surveyStyle)}></td>;
                return (
                  <td key={survey.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={calculationAdjustmentYearPath({ column: columnIndex })}
                      inputType="number"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white border-b border-gray-300')}></td>
              <td
                className={clsx(
                  'border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className={'flex flex-rows justify-left items-center'}>
                  <span>Cumulative Adjusted Period</span>
                  <span>(%)</span>
                </div>
              </td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[350px] z-30')}
              ></td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[450px] z-30')}
              ></td>
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 sticky left-[550px] z-30',
                  bgGradient,
                )}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const sellingPrice = survey.factorData?.find(
                  (f: FactorDataType) => f.factorCode === '21',
                );
                if (!sellingPrice) return <td key={survey.id} className={clsx(surveyStyle)}></td>;
                return (
                  <td key={survey.id} className={clsx('text-right', surveyStyle)}>
                    <RHFInputCell
                      fieldName={calculationTotalAdjustedSellingPricePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => value.toLocaleString() ?? 0}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white border-b border-gray-300')}></td>
              <td
                className={clsx(
                  'border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Adjusted Value</span>
              </td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[350px] z-30')}
              ></td>
              <td
                className={clsx('bg-white border-b border-gray-300 sticky left-[450px] z-30')}
              ></td>
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 sticky left-[550px] z-30',
                  bgGradient,
                )}
              ></td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                return (
                  <td key={survey.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={calculationAdjustedValuePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : '';
                      }}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white border-b border-gray-300')}></td>
              <td
                className={clsx(
                  'border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]',
                  bgGradientLeft,
                )}
              ></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
