import { useFieldArray, useFormContext } from 'react-hook-form';
import { useMemo } from 'react';
import { Icon } from '@/shared/components';
import {
  type DerivedFieldRule,
  useDerivedFields,
} from '@features/appraisal/components/priceAnalysis/components/useDerivedFieldArray.tsx';
import { qualitativeDefault } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/domain/qualitativeDefault.ts';
import { saleGridFieldPath } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/adapters/fieldPath.ts';
import {
  buildSaleGridAdjustmentFactorRules,
  buildSaleGridCalculationDerivedRules,
  buildSaleGridFinalValueRules,
  buildSaleGridQualitativeDerivedRules,
} from '@features/appraisal/components/priceAnalysis/adapters/rhf-table/buildDerivedRules.ts';
import { getDesciptions, getPropertyValueByFactorCode } from '../../wqs/WQSSection';
import { RHFInputCell } from '@features/appraisal/components/priceAnalysis/components/table/RHFInputCell.tsx';
import { getFactorDesciption } from '@features/appraisal/components/priceAnalysis/domain/getFactorDescription.ts';
import clsx from 'clsx';

interface QualitativeTableProps {
  saleAdjustmentGridQualitatives: Record<string, any>[];
  comparativeFactors: Record<string, any>[];
  comparativeSurveys: Record<string, any>[];
  property: Record<string, any>;
  template: Record<string, any>;
  isLoading: boolean;
}
export const QualitativeTable = ({
  saleAdjustmentGridQualitatives = [],
  comparativeFactors = [],
  comparativeSurveys = [],
  property,
  template,
  isLoading = true,
}: QualitativeTableProps) => {
  const { control, getValues } = useFormContext();
  const {
    fields: qualitativeFactors,
    append: appendQualitativeFactor,
    remove: removeQualitativeFactor,
  } = useFieldArray({
    control,
    name: 'saleAdjustmentGridQualitatives',
  });

  const {
    fields: adjustmentFactors,
    append: appendAdjustmentFactor,
    remove: removeAdjustmentFactor,
  } = useFieldArray({
    control,
    name: 'saleAdjustmentGridAdjustmentFactors',
  });

  const {
    qualitativeLevel: qualitativeLevelPath,
    adjustmentFactorAdjustAmount: adjustmentFactorAdjustAmountPath,
    adjustmentFactorAdjustPercent: adjustmentFactorAdjustPercentPath,
    calculationTotalSecondRevision: calculationTotalSecondRevisionPath,
    calculationOfferingPrice: calculationOfferingPricePath,
  } = saleGridFieldPath;

  const handleAddRow = () => {
    appendQualitativeFactor({
      factorCode: '',
      qualitatives: comparativeSurveys.map(() => ({ qualitativeLevel: 'E' })), // TODO: default value
    });

    appendAdjustmentFactor({
      factorCode: '',
      surveys: comparativeSurveys.map(() => ({
        adjustPercent: 0,
        adjustAmount: 0,
      })),
    });
  };

  const handleRemoveRow = (rowIndex: number) => {
    removeQualitativeFactor(rowIndex);
    removeAdjustmentFactor(rowIndex);
  };

  /** TODO: avoid using effects to create “derived state” when possible. re-create as needed */
  const derivedRules: DerivedFieldRule<any>[] = useMemo(() => {
    /** Adjustment factors which initial by Qualitative part */
    let rules = buildSaleGridQualitativeDerivedRules({
      surveys: comparativeSurveys,
      qualitativeRows: saleAdjustmentGridQualitatives,
    });

    rules = [
      ...rules,
      ...buildSaleGridCalculationDerivedRules({ surveys: comparativeSurveys, property: property }),
      ...buildSaleGridAdjustmentFactorRules({
        surveys: comparativeSurveys,
        qualitativeRows: saleAdjustmentGridQualitatives,
      }),
      ...buildSaleGridFinalValueRules({ surveys: comparativeSurveys }),
    ];

    return rules;
  }, [comparativeSurveys, property, saleAdjustmentGridQualitatives]);

  useDerivedFields({ rules: derivedRules });

  const bgGradient =
    'after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full';
  const leftColumnBody =
    'border-b border-gray-300 text-left font-medium text-gray-600 px-3 py-2.5 sticky left-0 z-20 w-[350px] min-w-[350px] max-w-[350px] h-14 whitespace-nowrap';
  const bgGradientLeft =
    'after:absolute after:left-[-2rem] after:top-0 after:h-full after:w-4 after:bg-gradient-to-l after:from-black/5 after:to-transparent after:translate-x-full';
  const rightColumnBody =
    'border-b border-gray-300 text-left font-medium sticky right-[70px] z-25 w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap';
  const surveyStyle = 'px-3 py-2.5 border-b border-gray-300';

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col border border-gray-300 rounded-xl">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="table table-sm min-w-max border-separate border-spacing-0">
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
              <th rowSpan={2} className={clsx('bg-gray-50', rightColumnBody, bgGradientLeft)}>
                <div>Collateral</div>
              </th>
              <th
                rowSpan={2}
                className="bg-gray-50 border-b border-gray-300 text-center sticky top-0 right-0 z-25 w-[70px] min-w-[70px] max-w-[70px] whitespace-nowrap"
              >
                <div>Action</div>
              </th>
            </tr>
            <tr className="border-b border-gray-300">
              {comparativeSurveys.map((col, index) => {
                return (
                  <th
                    key={col.id}
                    className={
                      'bg-gray-50 font-medium text-gray-600 px-3 py-2.5 border-r border-b border-gray-300 text-center sticky top-[40px] h-[45px] min-h-[45px] max-h-[45px] z-23 whitespace-nowrap'
                    }
                  >
                    <div>survey {index + 1}</div>
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
              qualitativeFactors.map((f, rowIndex) => {
                const selected = saleAdjustmentGridQualitatives[rowIndex]?.factorCode ?? '';
                const qualitativeFactors = (comparativeFactors ?? [])
                  .filter(
                    f =>
                      f.factorCode === selected ||
                      !saleAdjustmentGridQualitatives.some(q => q.factorCode === f.factorCode),
                  )
                  .map(f => ({
                    label: getDesciptions(f.factorCode) ?? '',
                    value: f.factorCode,
                  }));
                const fieldName = `saleAdjustmentGridQualitatives.${rowIndex}.factorCode`;
                return (
                  <tr key={f.id}>
                    <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                      <div className="truncate">
                        {template?.qualitativeFactors.find(t => t.factorId === f.factorCode) ? (
                          <RHFInputCell
                            fieldName={fieldName}
                            inputType="display"
                            accessor={({ value }) => getDesciptions(value)}
                          />
                        ) : (
                          <RHFInputCell
                            fieldName={fieldName}
                            inputType="select"
                            options={qualitativeFactors}
                          />
                        )}
                      </div>
                    </td>

                    {comparativeSurveys.map((col, columnIndex) => {
                      return (
                        <td key={col.id} className={clsx(surveyStyle)}>
                          <div className="flex flex-row justitfy-between items-center gap-2">
                            <div className="w-[150px]">
                              <RHFInputCell
                                fieldName={`saleAdjustmentGridQualitatives.${rowIndex}.qualitatives.${columnIndex}.qualitativeLevel`}
                                inputType="select"
                                options={[
                                  { label: 'Equal', value: 'E' },
                                  { label: 'Inferior', value: 'I' },
                                  { label: 'Better', value: 'B' },
                                ]}
                              />
                            </div>
                            <RHFInputCell
                              fieldName={`saleAdjustmentGridQualitatives.${rowIndex}.factorCode`}
                              inputType="display"
                              accessor={({ value }) =>
                                col.factors?.find(f => f.id === value)?.value ?? ''
                              }
                            />
                          </div>
                        </td>
                      );
                    })}

                    <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}>
                      <RHFInputCell
                        fieldName={`saleAdjustmentGridQualitatives.${rowIndex}.factorCode`}
                        inputType="display"
                        accessor={({ value }) =>
                          getPropertyValueByFactorCode(value, property) ?? ''
                        }
                      />
                    </td>
                    <td className="border-b border-gray-300 sticky right-0 z-25 bg-white w-[70px] min-w-[70px] max-w-[70px]">
                      {/* if rowIndex > template factors length, show delete button */}
                      {!template?.qualitativeFactors.find(t => t.factorId === f.factorCode) && (
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
              {comparativeSurveys.map((col, columnIndex) => {
                return <td key={col.id} className={clsx(surveyStyle)}></td>;
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 sticky right-0 z-25 bg-white w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>

            {/* saleAdjustmentGridFinalValue */}
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>Initial Price</td>
              {comparativeSurveys.map((col, columnIndex) => {
                return <td key={col.id} className={clsx(surveyStyle)}></td>;
              })}
              <td className={clsx('bg-gray-200', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-gray-200 sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Offering Price</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={calculationOfferingPricePath({ column: columnIndex })}
                      inputType="display"
                      accessor={({ value }) => value.toLocaleString()}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Adjusted Offering Price</span>
                <span>(%)</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                const offeringPrice = s.factors?.find(f => f.id === '17')?.value ?? '';
                if (!offeringPrice)
                  return <td key={s.id} className={'border-b border-r border-gray-300'}></td>;
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.offeringPriceAdjustmentPct`}
                      inputType="number"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Adjusted Offering Price</span>
                <span>(Amount)</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                const offeringPrice = s.factors?.find(f => f.id === '17')?.value ?? '';
                if (!offeringPrice)
                  return <td key={s.id} className={'border-b border-r border-gray-300'}></td>;
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.offeringPriceAdjustmentAmt`}
                      inputType="number"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Selling Price</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                const sellingPrice = s.factors?.find(f => f.id === '21')?.value ?? '';
                if (!sellingPrice) return <td key={s.id} className={clsx(surveyStyle)}></td>;
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    {sellingPrice}
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>Number of Years</td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.numberOfYears`}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                Adjusted Selling Price
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                const sellingPrice = s.factors?.find(f => f.id === '21')?.value ?? '';
                if (!sellingPrice) return <td key={s.id} className={clsx(surveyStyle)}></td>;
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.sellingPriceAdjustmentYear`}
                      inputType="number"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Adjusted Value</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.adjustedValue`}
                      inputType="display"
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>

            {/* 2nd revision */}
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>2nd Revision</td>
              {comparativeSurveys.map((col, columnIndex) => {
                return <td key={col.id} className={clsx(surveyStyle)}></td>;
              })}
              <td className={clsx('bg-gray-200', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 w-[70px] sticky right-0 z-25 bg-gray-200 min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-row justify-between items-center">
                  <span>Land Area of the deficient - excess</span>
                  <span>{'(Sq. Wa)'}</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <div className="flex flex-row justify-end">
                      <RHFInputCell
                        fieldName={`saleAdjustmentGridCalculations.${columnIndex}.landAreaOfDeficient`}
                        inputType="display"
                        accessor={({ value }) => {
                          return value ? value.toLocaleString() : value;
                        }}
                      />
                    </div>
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-row justify-between items-center">
                  <span>Land Price</span>
                  <div className="flex flex-row justitfy items-center gap-2 w-[180px]">
                    <RHFInputCell fieldName="landPrice" inputType="number" />
                    <span>Baht/ Sq. Wa</span>
                  </div>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={`landPrice`}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-row justify-between items-center">
                  <span>Land value compensation increase - decrease</span>
                  <span>{'(Baht)'}</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.landValueIncreaseDecrease`}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-row justify-between items-center">
                  <span>Usable area of the deficit - excess</span>
                  <span>{'(Sq. Meter)'}</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.usableAreaOfDeficient`}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-row justify-between items-center">
                  <span>Usable area price</span>
                  <div className="flex flex-row justitfy items-center gap-2 w-[180px]">
                    <RHFInputCell fieldName="usableAreaPrice" inputType="number" />
                    <span>Baht/ Sq. Meter</span>
                  </div>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={`usableAreaPrice`}
                      inputType="display"
                      accessor={({ value }) => value?.toLocaleString()}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-row justify-between items-center">
                  <span>Building value compensation increase - decrease</span>
                  <span>{'(Baht)'}</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.buildingValueIncreaseDecrease`}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <span>Total of 2nd Revision</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.totalSecondRevision`}
                      inputType="display"
                      accessor={({ value }) => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>

            {/* adjust factors */}
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>Adjusted Value</td>
              {comparativeSurveys.map((col, columnIndex) => {
                return <td key={col.id} className={clsx(surveyStyle)}></td>;
              })}
              <td className={clsx('bg-gray-200', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 w-[70px] sticky right-0 z-25 bg-gray-200 min-w-[70px] max-w-[70px]"></td>
            </tr>
            {qualitativeFactors.map((f, rowIndex) => {
              return (
                <tr key={f.id}>
                  <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                    {
                      <RHFInputCell
                        fieldName={`saleAdjustmentGridQualitatives.${rowIndex}.factorCode`}
                        inputType="display"
                        accessor={({ value }) => getFactorDesciption(value) ?? ''}
                      />
                    }
                  </td>
                  {comparativeSurveys.map((s, columnIndex) => {
                    return (
                      <td key={s.id} className={clsx(surveyStyle)}>
                        <div className="flex flex-row justify-between items-center">
                          <div className="w-[150px]">
                            <RHFInputCell
                              fieldName={`saleAdjustmentGridAdjustmentFactors.${rowIndex}.surveys.${columnIndex}.adjustPercent`}
                              inputType="number"
                            />
                          </div>
                          <div>
                            <RHFInputCell
                              fieldName={`saleAdjustmentGridAdjustmentFactors.${rowIndex}.surveys.${columnIndex}.adjustAmount`}
                              inputType="display"
                              accessor={({ value, formState, getFieldState }) => {
                                return qualitativeDefault.includes(
                                  getValues(
                                    adjustmentFactorAdjustPercentPath({
                                      row: rowIndex,
                                      column: columnIndex,
                                    }),
                                  ),
                                ) ? (
                                  <div>{value}</div>
                                ) : (
                                  <div className="text-danger">{value}</div>
                                );
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
                  <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
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
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <div className="flex flex-row justify-between items-center">
                      <div>
                        <RHFInputCell
                          fieldName={`saleAdjustmentGridCalculations.${columnIndex}.factorDiffPct`}
                          inputType="display"
                        />
                      </div>
                      <div>
                        <RHFInputCell
                          fieldName={`saleAdjustmentGridCalculations.${columnIndex}.factorDiffAmt`}
                          inputType="display"
                        />
                      </div>
                    </div>
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-row justify-between items-center gap-2">
                  <span>Total of Adjusted Value</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <div className="flex flex-row justify-between items-center">
                      <div>
                        <RHFInputCell
                          fieldName={`saleAdjustmentGridCalculations.${columnIndex}.totalAdjustValue`}
                          inputType="display"
                          accessor={({ value }) => {
                            return value ? value.toLocaleString() : value;
                          }}
                        />
                      </div>
                    </div>
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>

            {/* adjust weighted */}
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>Adjust Weight</td>
              {comparativeSurveys.map((col, columnIndex) => {
                return <td key={col.id} className={clsx(surveyStyle)}></td>;
              })}
              <td className={clsx('bg-gray-200', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 w-[70px] sticky right-0 z-25 bg-gray-200 min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                Weighting factor for data reliability
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <div className="flex flex-row justify-between items-center">
                      <RHFInputCell
                        fieldName={`saleAdjustmentGridCalculations.${columnIndex}.weight`}
                        inputType="number"
                      />
                    </div>
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                Weighted Adjusted Value
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={clsx(surveyStyle)}>
                    <div className="flex flex-row justify-between items-center">
                      <RHFInputCell
                        fieldName={`saleAdjustmentGridCalculations.${columnIndex}.weightedAdjustValue`}
                        inputType="display"
                        accessor={({ value }) => {
                          return value ? value.toLocaleString() : value;
                        }}
                      />
                    </div>
                  </td>
                );
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-white', leftColumnBody, bgGradient)}>
                <div className="flex flex-col">
                  <span>Total of Adjusted Value</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return <td key={s.id} className={clsx(surveyStyle)}></td>;
              })}
              <td className={clsx('bg-white', rightColumnBody, bgGradientLeft)}></td>
              <td className="border-b border-gray-300 bg-white sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>

            {/* final value */}
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>Final Value</td>
              {comparativeSurveys.map((s, columnIndex) => {
                return <td key={s.id} className={clsx(surveyStyle)}></td>;
              })}
              <td className={clsx('bg-gray-200', rightColumnBody, bgGradientLeft)}>
                <div>
                  <RHFInputCell
                    fieldName="saleAdjustmentGridFinalValue.finalValue"
                    inputType="display"
                    accessor={({ value }) => {
                      return value ? value.toLocaleString() : value;
                    }}
                  />
                </div>
              </td>
              <td className="border-b border-gray-300 bg-gray-200 sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
            <tr>
              <td className={clsx('bg-gray-200', leftColumnBody, bgGradient)}>
                {'Final Value (Rounded)'}
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return <td key={s.id} className={clsx(surveyStyle)}></td>;
              })}
              <td className={clsx('bg-gray-200', rightColumnBody, bgGradientLeft)}>
                <div>
                  <RHFInputCell
                    fieldName="saleAdjustmentGridFinalValue.finalValueRounded"
                    inputType="number"
                  />
                </div>
              </td>
              <td className="border-b border-gray-300 bg-gray-200 sticky right-0 z-25 w-[70px] min-w-[70px] max-w-[70px]"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
