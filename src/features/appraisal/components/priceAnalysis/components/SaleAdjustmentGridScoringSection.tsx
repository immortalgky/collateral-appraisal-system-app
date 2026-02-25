import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useMemo } from 'react';
import { Icon } from '@/shared/components';
import { RHFInputCell } from '@features/appraisal/components/priceAnalysis/components/table/RHFInputCell.tsx';
import clsx from 'clsx';
import { saleGridFieldPath } from '@features/appraisal/components/priceAnalysis/adapters/saleAdjustmentGridfieldPath.ts';
import type { SaleAdjustmentGridQualitativeFormType } from '@features/appraisal/components/priceAnalysis/schemas/saleAdjustmentGridForm.ts';
import type { ComparativeFactorsFormType } from '@features/appraisal/components/priceAnalysis/schemas/directComparisonForm.ts';
import { useDerivedFields, type DerivedFieldRule } from '../adapters/useDerivedFieldArray';
import {
  buildSaleGridAdjustmentFactorAmountRules,
  buildSaleGridAdjustmentFactorDefaultPercentRules,
  buildSaleGridCalculationDerivedRules,
  buildSaleGridFinalValueRules,
} from '@features/appraisal/components/priceAnalysis/adapters/buildSaleAdjustmentGridDerivedRules.ts';
import type {
  FactorDataType,
  MarketComparableDetailType,
  TemplateCalculationFactorType,
  TemplateComparativeFactorType,
  TemplateDetailType,
} from '../schemas/v1';
import { readFactorValue } from '@features/appraisal/components/priceAnalysis/domain/readFactorValue.ts';
import { getPropertyValueByFactorCode } from '@features/appraisal/components/priceAnalysis/domain/getPropertyValueByFactorCode.ts';
import { SaleAdjustmentGridSecondRevision } from '@features/appraisal/components/priceAnalysis/components/SaleAdjustmentGridSecondRevision.tsx';
import { qualitativeDefault } from '@features/appraisal/components/priceAnalysis/domain/qualitativeDefault.ts';
import { getFactorDesciption } from '@features/appraisal/components/priceAnalysis/domain/getFactorDescription.ts';

interface SaleAdjustmentGridScoringSectionProps {
  comparativeSurveys: MarketComparableDetailType[];
  property: Record<string, any>;
  template: TemplateDetailType;
}
export const SaleAdjustmentGridScoringSection = ({
  comparativeSurveys = [],
  property,
  template,
}: SaleAdjustmentGridScoringSectionProps) => {
  /** field paths */
  const {
    comparativeFactors: comparativeFactorsPath,

    /** qualitative */
    qualitatives: qualitativesPath,
    qualitativeLevel: qualitativeLevelPath,
    qualitativeFactorCode: qualitativeFactorCodePath,

    /** initial value */
    calculationOfferingPrice: calculationOfferingPricePath,
    calculationOfferingPriceAdjustmentPct: calculationOfferingPriceAdjustmentPctPath,
    calculationOfferingPriceAdjustmentAmt: calculationOfferingPriceAdjustmentAmtPath,
    calculationSellingPrice: calculationSellingPricePath,
    calculationNumberOfYears: calculationNumberOfYearsPath,
    calculationAdjustmentYear: calculationAdjustmentYearPath,
    calculationTotalAdjustedSellingPrice: calculationTotalAdjustedSellingPricePath,

    /** 2nd revision */
    calculationAdjustedValue: calculationAdjustedValuePath,
    calculationSumFactorPct: calculationSumFactorPctPath,
    calculationSumFactorAmt: calculationSumFactorAmtPath,
    calculationTotalAdjustValue: calculationTotalAdjustValuePath,
    calculationWeight: calculationWeightPath,
    calculationWeightAdjustValue: calculationWeightAdjustValuePath,

    /** adjust percent */
    adjustmentFactors: adjustmentFactorsPath,
    adjustmentFactorAdjustPercent: adjustmentFactorAdjustPercentPath,
    adjustmentFactorAdjustAmount: adjustmentFactorAdjustAmountPath,
    adjustmentFactorsRemark: adjustmentFactorsRemarkPath,

    /** final value */
    finalValue: finalValuePath,
    finalValueRounded: finalValueRoundedPath,
  } = saleGridFieldPath;

  const { control, getValues } = useFormContext();
  const {
    fields: qualitativeFactorFields,
    append: appendQualitativeFactor,
    remove: removeQualitativeFactor,
  } = useFieldArray({
    control,
    name: qualitativesPath(),
  });

  const {
    fields: adjustmentFactorsFields,
    append: appendAdjustmentFactor,
    remove: removeAdjustmentFactor,
  } = useFieldArray({
    control,
    name: adjustmentFactorsPath(),
  });

  const watchedQualitatives =
    (useWatch({ control, name: qualitativesPath() }) as SaleAdjustmentGridQualitativeFormType[]) ??
    [];

  const usedFactorCodes = useMemo(
    () => watchedQualitatives.map(r => r?.factorCode).filter(Boolean),
    [watchedQualitatives],
  );

  const watchComparativeFactors =
    (useWatch({ name: comparativeFactorsPath() }) as ComparativeFactorsFormType[]) ?? [];

  const comparativeFactors = useMemo(() => {
    return getValues(comparativeFactorsPath());
  }, [watchComparativeFactors]);

  const handleAddRow = () => {
    appendQualitativeFactor({
      factorCode: '',
      qualitatives: comparativeSurveys.map(survey => ({
        marketId: survey.id,
        qualitativeLevel: 'E',
      })), // TODO: default value
    });

    appendAdjustmentFactor({
      factorCode: '',
      surveys: comparativeSurveys.map(survey => ({
        marketId: survey.id,
        adjustPercent: 0,
        adjustAmount: 0,
      })),
    });
  };

  const handleRemoveRow = (rowIndex: number) => {
    removeQualitativeFactor(rowIndex);

    removeAdjustmentFactor(rowIndex);
  };

  /** define rules */
  const calculationRules: DerivedFieldRule<any>[] = useMemo(() => {
    const rules = buildSaleGridCalculationDerivedRules({
      surveys: comparativeSurveys,
      property: property,
    });

    return rules;
  }, [comparativeSurveys, property]);

  const adjustPercentDefaultRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildSaleGridAdjustmentFactorDefaultPercentRules({
      surveys: comparativeSurveys,
      qualitativeRows: getValues(qualitativesPath()),
    });
  }, [comparativeSurveys, qualitativeFactorFields.length]);

  const adjustAmountRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildSaleGridAdjustmentFactorAmountRules({
      surveys: comparativeSurveys,
      qualitativeRows: getValues(qualitativesPath()),
    });
  }, [comparativeSurveys, qualitativeFactorFields.length]);

  const finalValueRules: DerivedFieldRule<any>[] = useMemo(() => {
    return buildSaleGridFinalValueRules({
      surveys: comparativeSurveys,
    });
  }, [comparativeSurveys, qualitativeFactorFields]);

  useDerivedFields({ rules: calculationRules, ctx: { property: property } });
  useDerivedFields({ rules: adjustPercentDefaultRules });
  useDerivedFields({ rules: adjustAmountRules });
  useDerivedFields({ rules: finalValueRules });

  /** styles */
  const bgGradient =
    'after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full';
  const leftColumnBody =
    'border-b border-gray-300 text-left font-medium text-gray-600 px-3 py-2.5 sticky left-0 z-20 w-[350px] min-w-[350px] max-w-[350px] h-14 whitespace-nowrap';
  const bgGradientLeft =
    'after:absolute after:left-[-2rem] after:top-0 after:h-full after:w-4 after:bg-gradient-to-l after:from-black/5 after:to-transparent after:translate-x-full';
  const collateralColumnBody =
    'border-b border-gray-300 text-left font-medium sticky right-[70px] z-25 w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap';
  const actionColumnBody =
    'border-b border-gray-300 sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]';
  const surveyColumnBody = 'px-3 py-2.5 border-b border-r border-gray-300';

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col border border-gray-300 rounded-xl">
      <div className="flex-1 min-h-0 overflow-auto border-separate border-spacing-0">
        <table className="table table-sm min-w-max">
          <thead className="bg-neutral-50">
            <tr className="border-b border-gray-300">
              <th
                rowSpan={comparativeSurveys.length > 0 ? 2 : 1}
                className={clsx(
                  'bg-gray-50 border-gray-300 text-left font-medium sticky top-0 left-0 z-25 w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap',
                  bgGradient,
                )}
              >
                <div>Factors</div>
              </th>
              {comparativeSurveys.length > 0 && (
                <th
                  colSpan={comparativeSurveys.length}
                  className="bg-gray-50 border-b border-r border-gray-300 text-center font-medium sticky top-0 z-23 h-[40px] min-h-[40px] max-h-[40px] whitespace-nowrap"
                >
                  <div>Comparative Data</div>
                </th>
              )}
              <th rowSpan={2} className={clsx('bg-gray-50', collateralColumnBody, bgGradientLeft)}>
                <div>Collateral</div>
              </th>
              <th
                rowSpan={2}
                className="bg-gray-50 border-b border-gray-300 text-center sticky top-0 right-0 z-25 w-[70px] min-w-[70px] max-w-[70px] whitespace-nowrap"
              >
                <div></div>
              </th>
            </tr>
            <tr className="border-b border-gray-300">
              {comparativeSurveys.map((survey: MarketComparableDetailType) => {
                return (
                  <th
                    key={survey.id}
                    className={
                      'bg-gray-50 font-medium text-center px-3 py-2.5 border-r border-b border-gray-300 sticky top-[40px] h-[45px] min-h-[45px] max-h-[45px] z-23 whitespace-nowrap'
                    }
                  >
                    <div>{survey.surveyName}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {/* qualitative section */}
            {qualitativeFactorFields.map((field, rowIndex: number) => {
              const selected =
                (getValues(qualitativeFactorCodePath({ row: rowIndex })) as string) ?? '';
              const options = comparativeFactors
                .filter(
                  cf => cf.factorCode === selected || !usedFactorCodes.includes(cf.factorCode),
                )
                .map(cf => ({
                  label: getFactorDesciption(cf.factorCode) ?? '',
                  value: cf.factorCode,
                }));
              const isTemplateFactor = (template?.calculationFactors ?? []).some(
                t => t.factorCode === selected,
              );
              return (
                <tr key={field.id}>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    <div className="truncate">
                      {isTemplateFactor ? (
                        <RHFInputCell
                          fieldName={qualitativeFactorCodePath({ row: rowIndex })}
                          inputType="display"
                          accessor={({ value }) =>
                            value ? getFactorDesciption(value.toString()) : ''
                          }
                        />
                      ) : (
                        <RHFInputCell
                          fieldName={qualitativeFactorCodePath({ row: rowIndex })}
                          inputType="select"
                          options={options}
                        />
                      )}
                    </div>
                  </td>

                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    return (
                      <td key={survey.id} className={clsx(surveyColumnBody)}>
                        <div className="flex flex-row justitfy-between items-center gap-2">
                          <div className="w-[150px]">
                            <RHFInputCell
                              fieldName={qualitativeLevelPath({
                                row: rowIndex,
                                column: columnIndex,
                              })}
                              inputType="select"
                              options={[
                                { label: 'Equal', value: 'E' },
                                { label: 'Inferior', value: 'I' },
                                { label: 'Better', value: 'B' },
                              ]}
                            />
                          </div>
                          <RHFInputCell
                            fieldName={qualitativeFactorCodePath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) => {
                              const factorData = survey.factorData?.find(
                                (factor: FactorDataType) => factor.factorCode === value,
                              );
                              if (factorData) {
                                const factorValue = readFactorValue({
                                  dataType: factorData.dataType,
                                  fieldDecimal: factorData.fieldDecimal,
                                  value: factorData.value,
                                });
                                return (
                                  <div title={factorValue?.toString() ?? ''} className="truncate">
                                    {factorValue ?? ''}
                                  </div>
                                );
                              }
                              return '';
                            }}
                          />
                        </div>
                      </td>
                    );
                  })}

                  <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}>
                    <RHFInputCell
                      fieldName={qualitativeFactorCodePath({ row: rowIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        return (
                          <div
                            title={getPropertyValueByFactorCode(value.toString(), property) ?? ''}
                            className="truncate"
                          >
                            {getPropertyValueByFactorCode(value.toString(), property) ?? ''}
                          </div>
                        );
                      }}
                    />
                  </td>
                  <td className={clsx('bg-white', actionColumnBody)}>
                    {/* if rowIndex > template factors length, show delete button */}
                    {!isTemplateFactor && (
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
            })}
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <button
                  type="button"
                  onClick={() => handleAddRow()}
                  className="px-4 py-2 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                >
                  + Add More Factors
                </button>
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType) => {
                return <td key={survey.id} className={clsx(surveyColumnBody)}></td>;
              })}
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>

            {/* initial value */}
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>Initial Price</td>
              {comparativeSurveys.map((survey: MarketComparableDetailType) => {
                return <td key={survey.id} className={clsx('bg-gray-200', surveyColumnBody)}></td>;
              })}
              <td className={clsx('bg-gray-200', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-gray-200', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Offering Price</span>
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                return (
                  <td key={survey.id} className={clsx(surveyColumnBody, 'text-right')}>
                    <RHFInputCell
                      fieldName={calculationOfferingPricePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : '';
                      }}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className={'flex flex-rows justify-between items-center'}>
                  <span>Adjusted Offering Price</span>
                  <span>(%)</span>
                </div>
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
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
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className={'flex flex-rows justify-between items-center'}>
                  <span>Adjusted Offering Price</span>
                  <span>(Amount)</span>
                </div>
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                const offeringPrice = survey.factorData?.find(
                  (f: FactorDataType) => f.factorCode === '17',
                );
                if (!offeringPrice)
                  return <td key={survey.id} className={'border-b border-r border-gray-300'}></td>;
                return (
                  <td key={survey.id} className={clsx(surveyColumnBody)}>
                    <RHFInputCell
                      fieldName={calculationOfferingPriceAdjustmentAmtPath({ column: columnIndex })}
                      inputType="number"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Selling Price</span>
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex: number) => {
                const sellingPrice = survey.factorData?.find(
                  (f: FactorDataType) => f.factorCode === '21',
                );
                if (!sellingPrice)
                  return <td key={survey.id} className={clsx(surveyColumnBody)}></td>;
                return (
                  <td key={survey.id} className={clsx(surveyColumnBody, 'text-right')}>
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
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>Number of Years</td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                return (
                  <td key={survey.id} className={clsx('text-right', surveyColumnBody)}>
                    <RHFInputCell
                      fieldName={calculationNumberOfYearsPath({ column: columnIndex })} // TODO: convert date
                      inputType="display"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                Adjusted Selling Price
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                const sellingPrice = survey.factorData?.find(
                  (f: FactorDataType) => f.factorCode === '21',
                );
                if (!sellingPrice)
                  return <td key={survey.id} className={clsx(surveyColumnBody)}></td>;
                return (
                  <td key={survey.id} className={clsx(surveyColumnBody)}>
                    <RHFInputCell
                      fieldName={calculationAdjustmentYearPath({ column: columnIndex })}
                      inputType="number"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-rows justify-between items-center">
                  <span>Cumulative Adjusted Period</span>
                  <span>(%)</span>
                </div>
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                const sellingPrice = survey.factorData?.find(
                  (f: FactorDataType) => f.factorCode === '21',
                );
                if (!sellingPrice)
                  return <td key={survey.id} className={clsx(surveyColumnBody)}></td>;
                return (
                  <td key={survey.id} className={clsx('text-right', surveyColumnBody)}>
                    <RHFInputCell
                      fieldName={calculationTotalAdjustedSellingPricePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => value.toLocaleString() ?? 0}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Adjusted Value</span>
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                return (
                  <td key={survey.id} className={'border-b border-r border-gray-300 text-right'}>
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
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>

            {/* 2nd revision */}
            {(template?.collateralType === 'LB' || template?.collateralType === 'C') && (
              <SaleAdjustmentGridSecondRevision
                comparativeSurveys={comparativeSurveys}
                collateralType={template.collateralType}
              />
            )}

            {/* adjust factors */}
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>Adjusted Value</td>
              {comparativeSurveys.map((survey: MarketComparableDetailType) => {
                return <td key={survey.id} className={clsx('bg-gray-200', surveyColumnBody)}></td>;
              })}
              <td className={clsx('bg-gray-200', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-gray-200', actionColumnBody)}></td>
            </tr>
            {adjustmentFactorsFields.map((field, rowIndex) => {
              return (
                <tr key={field.id}>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    {
                      <RHFInputCell
                        fieldName={qualitativeFactorCodePath({ row: rowIndex })}
                        inputType="display"
                        accessor={({ value }) =>
                          value ? getFactorDesciption(value.toString()) : ''
                        }
                      />
                    }
                  </td>
                  {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                    return (
                      <td key={survey.id} className={clsx(surveyColumnBody)}>
                        <div className="flex flex-row justify-between items-center">
                          <div className="w-[100px]">
                            {getValues(
                              qualitativeLevelPath({ row: rowIndex, column: columnIndex }),
                            ) == 'E' ? (
                              <RHFInputCell
                                fieldName={adjustmentFactorAdjustPercentPath({
                                  row: rowIndex,
                                  column: columnIndex,
                                })}
                                inputType="display"
                              />
                            ) : (
                              <RHFInputCell
                                fieldName={adjustmentFactorAdjustPercentPath({
                                  row: rowIndex,
                                  column: columnIndex,
                                })}
                                inputType="number"
                                onUserChange={v => {
                                  if (v == null) return null;
                                  const level =
                                    getValues(
                                      qualitativeLevelPath({ row: rowIndex, column: columnIndex }),
                                    ) ?? '';
                                  if (level === 'B') return -Math.abs(v);
                                  if (level === 'I') return Math.abs(v);
                                  if (level === 'E') return 0;
                                  return v;
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <RHFInputCell
                              fieldName={adjustmentFactorAdjustAmountPath({
                                row: rowIndex,
                                column: columnIndex,
                              })}
                              inputType="display"
                              accessor={({ value }) => {
                                return qualitativeDefault.includes(
                                  getValues(
                                    adjustmentFactorAdjustPercentPath({
                                      row: rowIndex,
                                      column: columnIndex,
                                    }),
                                  ),
                                ) ? (
                                  <div>{value.toLocaleString() ?? 'error'}</div>
                                ) : (
                                  <div className="text-danger">
                                    {value.toLocaleString() ?? 'error'}
                                  </div>
                                );
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}>
                    <div className="flex flex-row justify-items-center items-center">
                      <RHFInputCell
                        fieldName={adjustmentFactorsRemarkPath({ row: rowIndex })}
                        inputType="text"
                      />
                    </div>
                  </td>
                  <td className={clsx('bg-white', actionColumnBody)}></td>
                </tr>
              );
            })}
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-row justify-between items-center gap-2">
                  <span>Total difference, factors affecting property value</span>
                  <span>{'(%)'}</span>
                </div>
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                return (
                  <td key={survey.id} className={clsx(surveyColumnBody, 'text-right')}>
                    <div className="flex flex-row justify-between items-center">
                      <div>
                        <RHFInputCell
                          fieldName={calculationSumFactorPctPath({ column: columnIndex })}
                          inputType="display"
                          accessor={({ value }) => (value ? value.toLocaleString() : 0)}
                        />
                      </div>
                      <div>
                        <RHFInputCell
                          fieldName={calculationSumFactorAmtPath({ column: columnIndex })}
                          inputType="display"
                          accessor={({ value }) => (value ? value.toLocaleString() : 0)}
                        />
                      </div>
                    </div>
                  </td>
                );
              })}
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-row justify-between items-center gap-2">
                  <span>Total of Adjusted Value</span>
                </div>
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                return (
                  <td key={survey.id} className={clsx(surveyColumnBody, 'text-right')}>
                    <RHFInputCell
                      fieldName={calculationTotalAdjustValuePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>

            {/* adjust weighted */}
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>Adjust Weight</td>
              {comparativeSurveys.map((survey: MarketComparableDetailType) => {
                return <td key={survey.id} className={clsx('bg-gray-200', surveyColumnBody)}></td>;
              })}
              <td className={clsx('bg-gray-200', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-gray-200', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                Weighting factor for data reliability
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                return (
                  <td key={survey.id} className={clsx(surveyColumnBody)}>
                    <div className="flex flex-row justify-between items-center">
                      <RHFInputCell
                        fieldName={calculationWeightPath({ column: columnIndex })}
                        inputType="number"
                      />
                    </div>
                  </td>
                );
              })}
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                Weighted Adjusted Value
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType, columnIndex) => {
                return (
                  <td key={survey.id} className={clsx(surveyColumnBody, 'text-right')}>
                    <RHFInputCell
                      fieldName={calculationWeightAdjustValuePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', collateralColumnBody, bgGradientLeft)}></td>
              <td className={clsx('bg-white', actionColumnBody)}></td>
            </tr>

            {/* final value */}
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>Final Value</td>
              {comparativeSurveys.map((survey: MarketComparableDetailType) => {
                return <td key={survey.id} className={clsx('bg-gray-200', surveyColumnBody)}></td>;
              })}
              <td className={clsx('bg-gray-200 text-right', collateralColumnBody, bgGradientLeft)}>
                <div>
                  <RHFInputCell
                    fieldName={finalValuePath()}
                    inputType="display"
                    accessor={({ value }) => {
                      return value ? value.toLocaleString() : 0;
                    }}
                  />
                </div>
              </td>
              <td className={clsx('bg-gray-200', actionColumnBody)}></td>
            </tr>
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>
                {'Final Value (Rounded)'}
              </td>
              {comparativeSurveys.map((survey: MarketComparableDetailType) => {
                return <td key={survey.id} className={clsx('bg-gray-200', surveyColumnBody)}></td>;
              })}
              <td className={clsx('bg-gray-200', collateralColumnBody, bgGradientLeft)}>
                <RHFInputCell fieldName={finalValueRoundedPath()} inputType="number" />
              </td>
              <td className={clsx('bg-gray-200', actionColumnBody)}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
