import { useFieldArray, useFormContext } from 'react-hook-form';
import { getFactorDesciption } from '../domain/getFactorDescription';
import { getDesciptions } from '../features/wqs/WQSSection';
import { RHFInputCell } from './table/RHFInputCell';
import { useEffect, useMemo } from 'react';
import { Icon } from '@/shared/components';
import { useDerivedFieldArray, type DerivedRule } from '../../BuildingTable/useDerivedFieldArray';
import {
  type DerivedFieldRule,
  useDerivedFields,
} from '@features/appraisal/components/priceAnalysis/components/useDerivedFieldArray.tsx';
import { getPropertyValueByFactorCode } from '../domain/getPropertyValueByFactorCode';

interface QualitativeTableProps {
  saleAdjustmentGridQualitatives: Record<string, any>[];
  comparativeFactors: Record<string, any>[];
  comparativeSurveys: Record<string, any>[];
  property: Record<string, any>;
  isLoading: boolean;
}
export const QualitativeTable = ({
  saleAdjustmentGridQualitatives = [],
  comparativeFactors = [],
  comparativeSurveys = [],
  property,
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

  const { fields: adjustmentFactors } = useFieldArray({
    control,
    name: 'saleAdjustmentGridAdjustmentFactors',
  });

  const derivedRules: DerivedFieldRule<any>[] = useMemo(() => {
    /** Adjustment factors which initial by Qualitative part */
    let rules = qualitativeFactors
      .map((f, rowIndex) => {
        return [
          {
            targetPath: `saleAdjustmentGridAdjustmentFactors.${rowIndex}.factorCode`,
            compute: () => f.factorCode ?? '',
          },
          ...comparativeSurveys.map((s, columnIndex) => {
            return [
              {
                targetPath: `saleAdjustmentGridAdjustmentFactors.${rowIndex}.surveys.${columnIndex}.adjustPercent`,
                deps: [
                  `saleAdjustmentGridQualitatives.${rowIndex}.qualitatives.${columnIndex}.qualitativeLevel`,
                ],
                compute: ({ getValues }) => {
                  const curr = getValues(
                    `saleAdjustmentGridAdjustmentFactors.${rowIndex}.surveys.${columnIndex}.adjustPercent`,
                  );
                  // const qualitativeLevel =
                  //   getValues(
                  //     `saleAdjustmentGridQualitatives.${rowIndex}.qualitatives.${columnIndex}.qualitativeLevel`,
                  //   ) ?? '';
                  return curr;

                  // condition

                  const qualitativeLevel =
                    getValues(
                      `saleAdjustmentGridQualitatives.${rowIndex}.qualitatives.${columnIndex}.qualitativeLevel`,
                    ) ?? '';
                  if (qualitativeLevel === 'E') return 0;
                  if (qualitativeLevel === 'I') return 5;
                  if (qualitativeLevel === 'B') return -5;
                  return 0;
                },
              },
              {
                targetPath: `saleAdjustmentGridAdjustmentFactors.${rowIndex}.surveys.${columnIndex}.adjustAmount`,
                deps: [
                  `saleAdjustmentGridAdjustmentFactors.${rowIndex}.surveys.${columnIndex}.adjustPercent`,
                  `saleAdjustmentGridCalculations.${columnIndex}.totalSecondRevision`,
                ],
                compute: ({ getValues }) => {
                  const totalSecondRevision =
                    getValues(
                      `saleAdjustmentGridCalculations.${columnIndex}.totalSecondRevision`,
                    ) ?? 0;
                  const adjustPercent =
                    getValues(
                      `saleAdjustmentGridAdjustmentFactors.${rowIndex}.surveys.${columnIndex}.adjustPercent`,
                    ) ?? 0;

                  const adjustAmount = (totalSecondRevision * adjustPercent) / 100;
                  return Number.isFinite(adjustAmount) ? parseFloat(adjustAmount.toFixed(2)) : 0;
                },
              },
            ];
          }),
        ];
      })
      .flat(2);

    /** Calculation section */
    rules = [
      ...rules,
      ...comparativeSurveys
        .map((s, columnIndex) => {
          return [
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.adjustedValue`,
              deps: [
                `saleAdjustmentGridCalculations.${columnIndex}.offeringPriceAdjustmentPct`,
                `saleAdjustmentGridCalculations.${columnIndex}.offeringPriceAdjustmentAmt`,
                `saleAdjustmentGridCalculations.${columnIndex}.sellingPriceAdjustmentYear`,
              ],
              compute: ({ getValues }) => {
                const offeringPrice = s.factors?.find(f => f.id === '17')?.value;
                console.log(offeringPrice);
                if (offeringPrice) {
                  const offeringPriceAdjustmentPct =
                    getValues(
                      `saleAdjustmentGridCalculations.${columnIndex}.offeringPriceAdjustmentPct`,
                    ) ?? 0;
                  const offeringPriceAdjustmentAmt =
                    getValues(
                      `saleAdjustmentGridCalculations.${columnIndex}.offeringPriceAdjustmentAmt`,
                    ) ?? 0;
                  console.log(offeringPriceAdjustmentPct, offeringPriceAdjustmentAmt);
                  return offeringPriceAdjustmentPct > 0
                    ? offeringPrice - (offeringPrice * offeringPriceAdjustmentPct) / 100
                    : offeringPriceAdjustmentAmt > 0
                      ? offeringPriceAdjustmentAmt
                      : offeringPrice;
                }
                const sellingPrice = s.factors?.find(f => f.id === '21')?.value;
                if (sellingPrice) {
                  console.log(sellingPrice);
                  const numberOfYears = 5; // TODO: replcing by number of from selling date to current date, if month > 6, round up
                  const sellingPriceAdjustmentYear = getValues(
                    `saleAdjustmentGridCalculations.${columnIndex}.sellingPriceAdjustmentYear`,
                  );
                  return (
                    sellingPrice + (sellingPrice * numberOfYears * sellingPriceAdjustmentYear) / 100
                  );
                }
                return 0;
              },
            },
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.landAreaOfDeficient`,
              compute: () => {
                const propertyLandArea = getPropertyValueByFactorCode('05', property) ?? 0;
                const surveyLandArea = s.factors.find(f => f.id === '05')?.value ?? 0;
                const landDiff = propertyLandArea - surveyLandArea;

                return Number.isFinite(landDiff) ? parseFloat(landDiff.toFixed(2)) : 0;
              },
            },
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.landValueIncreaseDecrease`,
              deps: ['landPrice'],
              compute: ({ getValues }) => {
                const landPrice = getValues('landPrice') ?? 0;
                const landDiff =
                  getValues(`saleAdjustmentGridCalculations.${columnIndex}.landAreaOfDeficient`) ??
                  0;
                const landValueIncreaseDecrease = landPrice * landDiff;
                return Number.isFinite(landValueIncreaseDecrease)
                  ? parseFloat(landValueIncreaseDecrease.toFixed(2))
                  : 0;
              },
            },
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.usableAreaOfDeficient`,
              compute: () => {
                const propertyUsableArea = getPropertyValueByFactorCode('12', property) ?? 0;
                const surveyUsableArea = s.factors.find(f => f.id === '12')?.value ?? 0;
                const usableAreaDiff = propertyUsableArea - surveyUsableArea;

                return Number.isFinite(usableAreaDiff) ? parseFloat(usableAreaDiff.toFixed(2)) : 0;
              },
            },
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.buildingValueIncreaseDecrease`,
              deps: ['usableAreaPrice'],
              compute: ({ getValues }) => {
                const usableAreaPrice = getValues('usableAreaPrice') ?? 0;
                const usableAreaDiff =
                  getValues(
                    `saleAdjustmentGridCalculations.${columnIndex}.usableAreaOfDeficient`,
                  ) ?? 0;
                const buildingValueIncreaseDecrease = usableAreaPrice * usableAreaDiff;
                return Number.isFinite(buildingValueIncreaseDecrease)
                  ? parseFloat(buildingValueIncreaseDecrease.toFixed(2))
                  : 0;
              },
            },
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.totalSecondRevision`,
              deps: [
                `saleAdjustmentGridCalculations.${columnIndex}.buildingValueIncreaseDecrease`,
                `saleAdjustmentGridCalculations.${columnIndex}.landValueIncreaseDecrease`,
                `saleAdjustmentGridCalculations.${columnIndex}.adjustedValue`,
              ],
              compute: ({ getValues }) => {
                const adjustedValue =
                  getValues(`saleAdjustmentGridCalculations.${columnIndex}.adjustedValue`) ?? 0;
                const buildingValueIncreaseDecrease =
                  getValues(
                    `saleAdjustmentGridCalculations.${columnIndex}.buildingValueIncreaseDecrease`,
                  ) ?? 0;
                const landValueIncreaseDecrease = getValues(
                  `saleAdjustmentGridCalculations.${columnIndex}.landValueIncreaseDecrease`,
                );
                const totalSecondRevision =
                  adjustedValue + buildingValueIncreaseDecrease + landValueIncreaseDecrease;
                return Number.isFinite(totalSecondRevision)
                  ? parseFloat(totalSecondRevision.toFixed(2))
                  : 0;
              },
            },
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.factorDiffPct`,
              deps: `saleAdjustmentGridAdjustmentFactors`,
              compute: ({ getValues }) => {
                const saleAdjustmentGridAdjustmentFactors =
                  getValues('saleAdjustmentGridAdjustmentFactors') ?? [];
                const totalDiffPct = saleAdjustmentGridAdjustmentFactors.reduce((acc, curr) => {
                  const adjustPercent = curr.surveys[columnIndex]?.adjustPercent ?? 0;
                  return acc + adjustPercent;
                }, 0);
                return Number.isFinite(totalDiffPct) ? parseFloat(totalDiffPct.toFixed(2)) : 0;
              },
            },
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.factorDiffAmt`,
              deps: `saleAdjustmentGridAdjustmentFactors`,
              compute: ({ getValues }) => {
                const saleAdjustmentGridAdjustmentFactors =
                  getValues('saleAdjustmentGridAdjustmentFactors') ?? [];
                const totalDiffAmt = saleAdjustmentGridAdjustmentFactors.reduce((acc, curr) => {
                  const adjustAmount = curr.surveys[columnIndex]?.adjustAmount ?? 0;
                  return acc + adjustAmount;
                }, 0);
                return Number.isFinite(totalDiffAmt) ? parseFloat(totalDiffAmt.toFixed(2)) : 0;
              },
            },
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.totalAdjustValue`,
              deps: `saleAdjustmentGridAdjustmentFactors`,
              compute: ({ getValues }) => {
                const totalDiffAmt =
                  getValues(`saleAdjustmentGridCalculations.${columnIndex}.factorDiffAmt`) ?? 0;
                const totalSecondRevision =
                  getValues(`saleAdjustmentGridCalculations.${columnIndex}.totalSecondRevision`) ??
                  0;
                const totalAdjustValue = totalSecondRevision - totalDiffAmt;
                console.log(totalDiffAmt, totalSecondRevision);
                return Number.isFinite(totalAdjustValue)
                  ? parseFloat(totalAdjustValue.toFixed(2))
                  : 0;
              },
            },
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.weight`,
              compute: () => {
                const numberOfSurveys = comparativeSurveys.length ?? 0;
                return 100 / numberOfSurveys;
              },
            },
            {
              targetPath: `saleAdjustmentGridCalculations.${columnIndex}.weightedAdjustValue`,
              deps: [
                `saleAdjustmentGridCalculations.${columnIndex}.totalAdjustValue`,
                `saleAdjustmentGridCalculations.${columnIndex}.weight`,
              ],
              compute: ({ getValues }) => {
                const totalAdjustValue =
                  getValues(`saleAdjustmentGridCalculations.${columnIndex}.totalAdjustValue`) ?? 0;
                const weight =
                  getValues(`saleAdjustmentGridCalculations.${columnIndex}.weight`) ?? 0;
                const weightedAdjustValue = totalAdjustValue * weight;
                return Number.isFinite(weightedAdjustValue)
                  ? parseFloat(weightedAdjustValue.toFixed(2))
                  : 0;
              },
            },
          ];
        })
        .flat(),
    ];

    rules = [
      ...rules,
      {
        targetPath: 'saleAdjustmentGridFinalValue.finalValue',
        deps: [],
        compute: ({ getValues }) => {
          const totalWeightedAdjustValue = comparativeSurveys.reduce((acc, curr, columnIndex) => {
            const weightedAdjustValue =
              getValues(`saleAdjustmentGridCalculations.${columnIndex}.weightedAdjustValue`) ?? 0;
            return acc + weightedAdjustValue;
          }, 0);
          return Number.isFinite(totalWeightedAdjustValue)
            ? parseFloat(totalWeightedAdjustValue.toFixed(2))
            : 0;
        },
      },
    ];

    return rules;
  }, [comparativeSurveys, property, qualitativeFactors]);

  useDerivedFields({ rules: derivedRules });

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col border border-gray-300 rounded-xl">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="table table-sm min-w-max border-separate border-spacing-0">
          <thead className="sticky top-0 z-20 bg-neutral-50">
            <tr className="border-b border-gray-300">
              <th rowSpan={2} className="border-r border-gray-300 text-center">
                Factors
              </th>
              <th
                colSpan={comparativeSurveys.length}
                className="border-r border-b border-gray-300 text-center"
              >
                Comparative Data
              </th>
              <th rowSpan={2} className="border-r border-gray-300 text-center">
                Collateral
              </th>
              <th rowSpan={2} className="border-r border-gray-300 text-center">
                Action
              </th>
            </tr>
            <tr className="border-b border-gray-300">
              {comparativeSurveys.map((col, index) => {
                return (
                  <th
                    key={col.id}
                    className={
                      'font-medium text-gray-600 px-3 py-2.5 border-r border-gray-300 text-center'
                    }
                  >
                    survey {index}
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
                    <td
                      className={
                        'font-medium text-gray-600 px-3 py-2.5 border-b border-r border-gray-300'
                      }
                    >
                      <div className="truncate">
                        <RHFInputCell
                          fieldName={fieldName}
                          inputType="select"
                          options={qualitativeFactors}
                        />
                      </div>
                    </td>

                    {comparativeSurveys.map((col, columnIndex) => {
                      return (
                        <td
                          key={columnIndex}
                          className={
                            'font-medium text-gray-600 px-3 py-2.5 border-b border-r border-gray-300'
                          }
                        >
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
                              accessor={value => col.factors.find(f => f.id === value)?.value ?? ''}
                            />
                          </div>
                        </td>
                      );
                    })}

                    <td className="border-b border-r border-gray-300">
                      <RHFInputCell
                        fieldName={`saleAdjustmentGridQualitatives.${rowIndex}.factorCode`}
                        inputType="display"
                        accessor={value => getPropertyValueByFactorCode(value, property) ?? ''}
                      />
                    </td>
                    <td className="border-b border-r border-gray-300">
                      {/* if rowIndex > template factors length, show delete button */}
                      <div className="flex flex-row justify-center items-center">
                        <button
                          type="button"
                          onClick={() => {
                            removeQualitativeFactor(rowIndex);
                            console.log(getValues('saleAdjustmentGridQualitatives'));
                          }}
                          className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors "
                          title="Delete"
                        >
                          <Icon style="solid" name="trash" className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            <tr>
              <td className="border-b border-r border-gray-300">
                <button
                  type="button"
                  onClick={() =>
                    appendQualitativeFactor({
                      factorCode: '',
                      qualitatives: comparativeSurveys.map(() => ({ qualitativeLevel: '' })),
                    })
                  }
                  className="px-4 py-2 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                >
                  + Add More Factors
                </button>
              </td>
              {comparativeSurveys.map((col, columnIndex) => {
                return <td key={col.id} className="border-b border-r border-gray-300"></td>;
              })}
              <td className="border-b border-r border-gray-300"></td>
              <td className="border-b border-r border-gray-300"></td>
            </tr>
            <tr>
              <td className="border-b border-gray-300  bg-gray-200 h-[30px]">Initial Price</td>
              {comparativeSurveys.map((col, columnIndex) => {
                return <td key={col.id} className="border-b border-gray-300 bg-gray-200 "></td>;
              })}
              <td className="border-b border-gray-300 bg-gray-200 "></td>
              <td className="border-b border-gray-300 bg-gray-200 "></td>
            </tr>

            {/* saleAdjustmentGridFinalValue */}
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
                <span>Offering Price</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                const offeringPrice = s.factors.find(f => f.id === '17')?.value ?? '';
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    {offeringPrice}
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
                <span>Adjusted Offering Price</span>
                <span>(%)</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                const offeringPrice = s.factors.find(f => f.id === '17')?.value ?? '';
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
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
                <span>Adjusted Offering Price</span>
                <span>(Amount)</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                const offeringPrice = s.factors.find(f => f.id === '17')?.value ?? '';
                if (!offeringPrice)
                  return <td key={s.id} className={'border-b border-r border-gray-300'}></td>;
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.offeringPriceAdjustmentAmt`}
                      inputType="number"
                    />
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
                <span>Selling Price</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                const sellingPrice = s.factors.find(f => f.id === '21')?.value ?? '';
                if (!sellingPrice)
                  return <td key={s.id} className={'border-b border-r border-gray-300'}></td>;
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    {sellingPrice}
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>Number of Years</td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.numberOfYears`}
                    />
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
                Adjusted Selling Price
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                const sellingPrice = s.factors.find(f => f.id === '21')?.value ?? '';
                if (!sellingPrice)
                  return <td key={s.id} className={'border-b border-r border-gray-300'}></td>;
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.sellingPriceAdjustmentYear`}
                      inputType="number"
                    />
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
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
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>

            {/* 2nd revision */}
            <tr>
              <td
                colSpan={comparativeSurveys.length + 3}
                className=" border-b border-r border-gray-300 bg-gray-200"
              >
                2nd Revision
              </td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
                <div className="flex flex-row justify-between items-center">
                  <span>Land Area of the deficient - excess</span>
                  <span>{'(Sq. Wa)'}</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <div className="flex flex-row justify-end">
                      <RHFInputCell
                        fieldName={`saleAdjustmentGridCalculations.${columnIndex}.landAreaOfDeficient`}
                        inputType="display"
                        accessor={value => {
                          return value ? value.toLocaleString() : value;
                        }}
                      />
                    </div>
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
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
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`landPrice`}
                      inputType="display"
                      accessor={value => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
                <div className="flex flex-row justify-between items-center">
                  <span>Land value compensation increase - decrease</span>
                  <span>{'(Baht)'}</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.landValueIncreaseDecrease`}
                      inputType="display"
                      accessor={value => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
                <div className="flex flex-row justify-between items-center">
                  <span>Usable area of the deficit - excess</span>
                  <span>{'(Sq. Meter)'}</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.usableAreaOfDeficient`}
                      inputType="display"
                      accessor={value => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
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
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`usableAreaPrice`}
                      inputType="display"
                      accessor={value => value?.toLocaleString()}
                    />
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
                <div className="flex flex-row justify-between items-center">
                  <span>Building value compensation increase - decrease</span>
                  <span>{'(Baht)'}</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.buildingValueIncreaseDecrease`}
                      inputType="display"
                      accessor={value => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>
            <tr>
              <td className={'border-b border-r border-gray-300 h-[60px]'}>
                <span>Total of 2nd Revision</span>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <RHFInputCell
                      fieldName={`saleAdjustmentGridCalculations.${columnIndex}.totalSecondRevision`}
                      inputType="display"
                      accessor={value => {
                        return value ? value.toLocaleString() : value;
                      }}
                    />
                  </td>
                );
              })}
              <td className={'border-b border-r border-gray-300'}></td>
              <td className={'border-b border-r border-gray-300'}></td>
            </tr>

            {/* adjust factors */}
            <tr>
              <td
                colSpan={(comparativeSurveys.length ?? 0) + 3}
                className="border-b border-gray-300 bg-gray-200"
              >
                Adjusted Value
              </td>
            </tr>
            {qualitativeFactors.map((f, rowIndex) => {
              return (
                <tr key={f.id}>
                  <td
                    className={
                      'font-medium text-gray-600 px-3 py-2.5 border-b border-r border-gray-300'
                    }
                  >
                    {
                      <RHFInputCell
                        fieldName={`saleAdjustmentGridQualitatives.${rowIndex}.factorCode`}
                        inputType="display"
                        accessor={value => getFactorDesciption(value) ?? ''}
                      />
                    }
                  </td>
                  {comparativeSurveys.map((s, columnIndex) => {
                    return (
                      <td key={s.id} className={'border-b border-r border-gray-300'}>
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
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className={`border-b border-r border-gray-300`}></td>
                  <td className={`border-b border-r border-gray-300`}></td>
                </tr>
              );
            })}
            <tr>
              <td className="border-b border-r border-gray-300 h-[60px]">
                <div className="flex flex-row justify-between items-center gap-2">
                  <span>Total difference, factors affecting property value</span>
                  <span>{'(%)'}</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
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
              <td className={`border-b border-r border-gray-300`}></td>
              <td className={`border-b border-r border-gray-300`}></td>
            </tr>
            <tr>
              <td className="border-b border-r border-gray-300 h-[60px]">
                <div className="flex flex-row justify-between items-center gap-2">
                  <span>Total of Adjusted Value</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <div className="flex flex-row justify-between items-center">
                      <div>
                        <RHFInputCell
                          fieldName={`saleAdjustmentGridCalculations.${columnIndex}.totalAdjustValue`}
                          inputType="display"
                          accessor={value => {
                            return value ? value.toLocaleString() : value;
                          }}
                        />
                      </div>
                    </div>
                  </td>
                );
              })}
              <td className={`border-b border-r border-gray-300`}></td>
              <td className={`border-b border-r border-gray-300`}></td>
            </tr>

            {/* adjust weighted */}
            <tr>
              <td
                colSpan={comparativeSurveys.length + 3}
                className="border-b border-r border-gray-300 bg-gray-200"
              >
                Adjust Weight
              </td>
            </tr>
            <tr>
              <td className="h-[60px] border-b border-r border-gray-300">
                Weighting factor for data reliability
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <div className="flex flex-row justify-between items-center">
                      <RHFInputCell
                        fieldName={`saleAdjustmentGridCalculations.${columnIndex}.weight`}
                        inputType="number"
                      />
                    </div>
                  </td>
                );
              })}
              <td className={`border-b border-r border-gray-300`}></td>
              <td className={`border-b border-r border-gray-300`}></td>
            </tr>
            <tr>
              <td className="h-[60px] border-b border-r border-gray-300">
                Weighted Adjusted Value
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <td key={s.id} className={'border-b border-r border-gray-300'}>
                    <div className="flex flex-row justify-between items-center">
                      <RHFInputCell
                        fieldName={`saleAdjustmentGridCalculations.${columnIndex}.weightedAdjustValue`}
                        inputType="display"
                        accessor={value => {
                          return value ? value.toLocaleString() : value;
                        }}
                      />
                    </div>
                  </td>
                );
              })}
              <td className={`border-b border-r border-gray-300`}></td>
              <td className={`border-b border-r border-gray-300`}></td>
            </tr>
            <tr>
              <td className="border-b border-r border-gray-300 h-[60px]">
                <div className="flex flex-col">
                  <span>Total of Adjusted Value</span>
                </div>
              </td>
              {comparativeSurveys.map((s, columnIndex) => {
                return <td key={s.id} className={'border-b border-r border-gray-300'}></td>;
              })}
              <td className={`border-b border-r border-gray-300`}></td>
              <td className={`border-b border-r border-gray-300`}></td>
            </tr>

            {/* final value */}
            <tr>
              <td className="bg-gray-200 h-[30px]">Final Value</td>
              {comparativeSurveys.map((s, columnIndex) => {
                return <td key={s.id} className="bg-gray-200"></td>;
              })}
              <td className="bg-gray-200">
                <div>
                  <RHFInputCell
                    fieldName="saleAdjustmentGridFinalValue.finalValue"
                    inputType="display"
                    accessor={value => {
                      return value ? value.toLocaleString() : value;
                    }}
                  />
                </div>
              </td>
              <td className="bg-gray-200"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
