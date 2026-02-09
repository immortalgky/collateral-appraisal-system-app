import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { wqsFieldPath } from '../adapters/fieldPath';
import type { WQSTemplate } from '../../../data/data';
import clsx from 'clsx';
import { getDesciptions } from '../WQSSection';
import { RHFInputCell } from '../../../components/table/RHFInputCell';
import { Icon } from '@/shared/components';
import {
  buildWQSCalculationDerivedRules,
  buildWQSFinalValueDerivedRules,
  buildWQSScoringSurveyDerivedRules,
  buildWQSTotalScoreRules,
} from '../adapters/buildDerivedRules';
import { useDerivedFields, type DerivedFieldRule } from '../../../components/useDerivedFieldArray';
import { useMemo } from 'react';

interface ScoringTableProps {
  comparativeSurveys: Record<string, any>[];
  property: Record<string, any>;
  template: WQSTemplate;
  isLoading: boolean;
}

export function ScoringTable({
  comparativeSurveys = [],
  property,
  template,
  isLoading = true,
}: ScoringTableProps) {
  const {
    /** scoring section path */
    scoringFactors: scoringFactorsPath,
    scoringFactor: scoringFactorPath,
    scoringFactorCode: scoringFactorCodePath,
    comparativeFactor: comparativeFactorPath,
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
    totalMarketId: totalMarketIdPath,
    totalSurveyScore: totalSurveyScorePath,
    totalWeightedSurveyScore: totalWeightedSurveyScorePath,
    totalCollateralScore: totalCollateralScorePath,
    totalWeightedCollateralScore: totalWeightedCollateralScorePath,

    /** calculation section path */
    calculationOfferingPrice: calculationOfferingPricePath,
    calculationOfferingPriceAdjustmentPct: calculationOfferingPriceAdjustmentPctPath,
    calculationOfferingPriceAdjustmentAmt: calculationOfferingPriceAdjustmentAmtPath,
    calculationNumberOfYears: calculationNumberOfYearsPath,
    calculationAdjustmentYear: calculationAdjustmentYearPath,
    calculationTotalAdjustedSellingPrice: calculationTotalAdjustedSellingPricePath,
    calculationAdjustedValue: calculationAdjustedValuePath,
  } = wqsFieldPath;

  const { control, getValues } = useFormContext();
  const {
    fields: scoringFactors,
    append: appendScoringFactor,
    remove: removeScoringFactor,
  } = useFieldArray({
    control,
    name: scoringFactorsPath(),
  });

  const comparativeFactors = useWatch({ name: comparativeFactorPath() }) ?? [];
  const wqsScoringFactors = useWatch({ name: scoringFactorsPath() }) ?? [];

  const handleAddRow = () => {
    appendScoringFactor({
      factorCode: '',
      weight: 0,
      intensity: 0,
      weightedIntensity: 0,
      surveys: comparativeSurveys.map(s => ({
        marketId: s.Id,
        surveyScore: 0,
        weightedSurveyScore: 0,
      })),
      collateral: 0,
      collateralWeightedScore: 0,
    });
  };

  const handleRemoveRow = (rowIndex: number) => {
    removeScoringFactor(rowIndex);
  };

  const scoringSurveyRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSScoringSurveyDerivedRules({
      surveys: comparativeSurveys,
      scoringRows: scoringFactors,
    });
  }, [comparativeSurveys, scoringFactors]);

  const totalScoreRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSTotalScoreRules({
      surveys: comparativeSurveys,
      property: property,
      scoringRows: scoringFactors,
    });
  }, [comparativeSurveys, scoringFactors]);

  const calculationRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSCalculationDerivedRules({ surveys: comparativeSurveys, property: property });
  }, [comparativeSurveys]);

  const finalValueRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildWQSFinalValueDerivedRules({ surveys: comparativeSurveys, property: property });
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
    <div className="flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col border border-gray-300 rounded-xl">
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
              {comparativeSurveys.map(col => {
                return (
                  <th
                    key={col.id}
                    className={
                      'bg-gray-50 font-medium text-center px-3 py-2.5 border-r border-b border-gray-300 sticky top-[40px] h-[70px] min-h-[70px] max-h-[70px] z-23 whitespace-nowrap'
                    }
                  >
                    <div className="flex flex-col">
                      <div className="p-1">{col.surveyName}</div>
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
              scoringFactors.map((f, rowIndex) => {
                const selected = wqsScoringFactors[rowIndex]?.factorCode ?? '';
                const options = (comparativeFactors ?? [])
                  .filter(
                    f =>
                      f.factorCode === selected ||
                      !wqsScoringFactors.some(q => q.factorCode === f.factorCode),
                  )
                  .map(f => ({
                    label: getDesciptions(f.factorCode) ?? '',
                    value: f.factorCode,
                  }));
                return (
                  <tr key={f.id}>
                    <td className={clsx('bg-white border-r', leftColumnBody)}>
                      <div className="truncate">
                        {template?.calculationFactors.find(t => t.factorId === f.factorCode) ? (
                          <RHFInputCell
                            fieldName={scoringFactorCodePath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) => getDesciptions(value)}
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

                    {comparativeSurveys.map((col, columnIndex) => {
                      return (
                        <td key={col.id} className={clsx(surveyStyle)}>
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
                    })}

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
                      {!template?.calculationFactors.find(t => t.factorId === f.factorCode) && (
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
              <td className={clsx('bg-white border-r', leftColumnBody)}>
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
              {comparativeSurveys.map(col => {
                return <td key={col.id} className={clsx(surveyStyle)}></td>;
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
              {comparativeSurveys.map((col, columnIndex) => {
                return (
                  <td key={col.id} className={clsx(surveyStyle)}>
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
              {comparativeSurveys.map(col => {
                return <td key={col.id} className={clsx('bg-gray-200', surveyStyle)}></td>;
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
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle, 'text-right')}>
                    <RHFInputCell
                      fieldName={calculationOfferingPricePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => value.toLocaleString()}
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
                <div className={'flex flex-rows justify-between items-center'}>
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
              {comparativeSurveys.map((s, columnIndex) => {
                const offeringPrice = s.factors?.find(f => f.id === '17')?.value ?? '';
                if (!offeringPrice)
                  return <td key={s.id} className={'border-b border-r border-gray-300'}></td>;
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
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
              {comparativeSurveys.map((s, columnIndex) => {
                const offeringPrice = s.factors?.find(f => f.id === '17')?.value ?? '';
                if (!offeringPrice)
                  return <td key={s.id} className={'border-b border-r border-gray-300'}></td>;
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
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
              {comparativeSurveys.map(s => {
                const sellingPrice = s.factors?.find(f => f.id === '21')?.value ?? '';
                if (!sellingPrice) return <td key={s.id} className={clsx(surveyStyle)}></td>;
                return (
                  <td key={s.id} className={clsx(surveyStyle, 'text-right')}>
                    {sellingPrice.toLocaleString()}
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
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx('text-right', surveyStyle)}>
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
              {comparativeSurveys.map((s, columnIndex) => {
                const sellingPrice = s.factors?.find(f => f.id === '21')?.value ?? '';
                if (!sellingPrice) return <td key={s.id} className={clsx(surveyStyle)}></td>;
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
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
                <div className={'flex flex-rows justify-between items-center'}>
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
              {comparativeSurveys.map((s, columnIndex) => {
                const sellingPrice = s.factors?.find(f => f.id === '21')?.value ?? '';
                if (!sellingPrice) return <td key={s.id} className={clsx(surveyStyle)}></td>;
                return (
                  <td key={s.id} className={clsx('text-right', surveyStyle)}>
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
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={calculationAdjustedValuePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : 0;
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
