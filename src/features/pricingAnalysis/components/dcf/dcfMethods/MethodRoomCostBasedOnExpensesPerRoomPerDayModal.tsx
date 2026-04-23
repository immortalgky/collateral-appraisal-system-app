import { Icon } from '@/shared/components';
import { RHFInputCell } from '../../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { useFieldArray, useFormContext, type UseFormGetValues } from 'react-hook-form';
import { ScrollableTableContainer } from '../../ScrollableTableContainer';
import { toNumber } from '../../../domain/calculation';
import { roomTypeParameters } from '@/features/pricingAnalysis/data/dcfParameters';

interface MethodRoomCostBasedOnExpensesPerRoomPerDayModalProps {
  name: string;
  getOuterFormValues: UseFormGetValues<any>;
  isReadOnly?: boolean;
}
export function MethodRoomCostBasedOnExpensesPerRoomPerDayModal({
  name,
  getOuterFormValues,
  isReadOnly,
}: MethodRoomCostBasedOnExpensesPerRoomPerDayModalProps) {
  const { getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ name: `${name}.roomDetails` });

  const handleOnAdd = () => {
    append({});
  };

  const handleOnRemove = (index: number) => {
    remove(index);
  };

  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return [
      ...fields.flatMap((_, idx) => {
        return [
          {
            targetPath: `${name}.roomDetails.${idx}.totalRoomExpensePerDay`,
            deps: [
              `${name}.roomDetails.${idx}.roomExpensePerDay`,
              `${name}.roomDetails.${idx}.saleableArea`,
            ],
            compute: ({ getValues }) => {
              const roomExpensePerDay =
                getValues(`${name}.roomDetails.${idx}.roomExpensePerDay`) ?? 0;
              const saleableArea = getValues(`${name}.roomDetails.${idx}.saleableArea`) ?? 0;
              return toNumber(roomExpensePerDay * saleableArea);
            },
          },
          {
            targetPath: `${name}.roomDetails.${idx}.totalRoomExpensePerYear`,
            deps: [`${name}.roomDetails.${idx}.totalRoomExpensePerDay`, 'totalNumberOfDayInYear'],
            compute: ({ getValues }) => {
              const totalRoomExpensePerDay =
                getValues(`${name}.roomDetails.${idx}.totalRoomExpensePerDay`) ?? 0;
              const totalNumberOfDayInYear = getOuterFormValues(`totalNumberOfDayInYear`) ?? 365;
              return totalRoomExpensePerDay * totalNumberOfDayInYear;
            },
          },
        ];
      }),
      {
        targetPath: `${name}.sumSaleableArea`,
        deps: [`${name}.roomDetails`],
        compute: ({ getValues }) => {
          const roomDetails = getValues(`${name}.roomDetails`) ?? [];
          const sumSaleableArea = roomDetails.reduce((prev, curr) => {
            const currSaleableArea = curr.saleableArea ? toNumber(curr.saleableArea) : 0;
            return prev + currSaleableArea;
          }, 0);
          return sumSaleableArea;
        },
      },
      {
        targetPath: `${name}.sumTotalRoomExpensePerDay`,
        deps: [`${name}.roomDetails`],
        compute: ({ getValues }) => {
          const roomDetails = getValues(`${name}.roomDetails`) ?? [];
          const sumTotalRoomExpensePerDay = roomDetails.reduce((prev, curr) => {
            const currRoomIncome = curr.totalRoomExpensePerDay
              ? toNumber(curr.totalRoomExpensePerDay)
              : 0;
            return prev + currRoomIncome;
          }, 0);
          return sumTotalRoomExpensePerDay;
        },
      },
      {
        targetPath: `${name}.sumTotalRoomExpensePerYear`,
        deps: [`${name}.roomDetails`],
        compute: ({ getValues }) => {
          const roomDetails = getValues(`${name}.roomDetails`) ?? [];
          const sumTotalRoomExpensePerYear = roomDetails.reduce((prev, curr) => {
            const currTotalRoomIncomePerYear = curr.totalRoomExpensePerYear
              ? toNumber(curr.totalRoomExpensePerYear)
              : 0;
            return prev + currTotalRoomIncomePerYear;
          }, 0);
          return sumTotalRoomExpensePerYear;
        },
      },
    ];
  }, [fields.length]);
  useDerivedFields({ rules });

  return (
    <div className="flex flex-col gap-2">
      <div className="border border-gray-300 rounded-xl p-1.5 overflow-auto">
        <ScrollableTableContainer className="flex-1 min-h-0">
          <div className="overflow-auto max-h-[274px]">
            <table className={'table table-sm'}>
              <thead>
                <tr>
                  <th className="px-1.5 py-1.5 bg-gray-100">Room Type</th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Room Cost</span>
                      <span>Bath / Room / Day</span>
                    </div>
                  </th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Saleable Area</span>
                    </div>
                  </th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Total Room Expenses</span>
                      <span>Bath / Day</span>
                    </div>
                  </th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Total Room Expenses</span>
                      <span>Bath / Year</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.map((r, index) => {
                  const roomType = getValues(`${name}.roomDetails.${index}.roomType`);
                  return (
                    <tr key={index}>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <div className="flex flex-row gap-1.5">
                          <RHFInputCell
                            fieldName={`${name}.roomDetails.${index}.roomType`}
                            inputType="select"
                            disabled={isReadOnly}
                            options={roomTypeParameters.map(p => ({
                              value: p.code,
                              label: p.description,
                            }))}
                          />
                          {String(roomType) === '99' && (
                            <RHFInputCell
                              fieldName={`${name}.roomDetails.${index}.roomTypeOther`}
                              inputType="text"
                              disabled={isReadOnly}
                              text={{ maxLength: 50 }}
                            />
                          )}
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleOnRemove(index)}
                              className="size-5 flex-shrink-0 flex items-center justify-center cursor-pointer rounded text-gray-300 hover:text-danger-600 hover:bg-danger-50 transition-colors opacity-100"
                              title="Delete"
                            >
                              <Icon style="solid" name="trash" className="size-1" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <RHFInputCell
                          fieldName={`${name}.roomDetails.${index}.roomExpensePerDay`}
                          inputType="number"
                          disabled={isReadOnly}
                          number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <RHFInputCell
                          fieldName={`${name}.roomDetails.${index}.saleableArea`}
                          inputType="number"
                          disabled={isReadOnly}
                          number={{ decimalPlaces: 0, maxIntegerDigits: 6, allowNegative: false }}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <div className="flex justify-end items-center text-right">
                          <RHFInputCell
                            fieldName={`${name}.roomDetails.${index}.totalRoomExpensePerDay`}
                            inputType="display"
                            accessor={({ value }) => (
                              <span className="text-right">
                                {value ? value.toLocaleString() : 0}
                              </span>
                            )}
                          />
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <div className="flex justify-end items-center text-right">
                          <RHFInputCell
                            fieldName={`${name}.roomDetails.${index}.totalRoomExpensePerYear`}
                            inputType="display"
                            accessor={({ value }) => (
                              <span className="text-right">
                                {value ? value.toLocaleString() : 0}
                              </span>
                            )}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isReadOnly && (
                  <tr>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleOnAdd()}
                        className="px-3 py-1.5 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                      >
                        + Add Room
                      </button>
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                )}
                <tr>
                  <td className="sticky bottom-0 px-1.5 bg-white"></td>
                  <td className="sticky bottom-0 px-1.5 bg-white"></td>
                  <td className="sticky bottom-0 px-1.5 bg-white">
                    <div className="text-right">
                      <RHFInputCell
                        fieldName={`${name}.sumSaleableArea`}
                        inputType="display"
                        accessor={({ value }) => (
                          <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                        )}
                      />
                    </div>
                  </td>
                  <td className="sticky bottom-0 px-1.5 bg-white">
                    <div className="text-right">
                      <RHFInputCell
                        fieldName={`${name}.sumTotalRoomExpensePerDay`}
                        inputType="display"
                        accessor={({ value }) => (
                          <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                        )}
                      />
                    </div>
                  </td>
                  <td className="sticky bottom-0 px-1.5 bg-white">
                    <div className="text-right">
                      <RHFInputCell
                        fieldName={`${name}.sumTotalRoomExpensePerYear`}
                        inputType="display"
                        accessor={({ value }) => (
                          <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                        )}
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ScrollableTableContainer>
      </div>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-row gap-1.5 items-center">
          <span className={'w-56'}>Total Room Expenses</span>
          <div className={'w-56 text-right'}>
            <RHFInputCell
              fieldName={`${name}.sumTotalRoomExpensePerYear`}
              inputType={'display'}
              accessor={({ value }) => (
                <span className="text-right">{value ? value.toLocaleString() : 0}</span>
              )}
            />
          </div>
          <span>Baht / Year</span>
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-56'}>Increase Rate</span>
          <div className={'w-56'}>
            <RHFInputCell
              fieldName={`${name}.increaseRatePct`}
              inputType={'number'}
              disabled={isReadOnly}
              number={{
                decimalPlaces: 2,
                maxIntegerDigits: 3,
                allowNegative: false,
              }}
            />
          </div>
          <span className={''}>every</span>
          <div className={'w-56'}>
            <RHFInputCell
              fieldName={`${name}.increaseRateYrs`}
              inputType={'number'}
              disabled={isReadOnly}
              number={{
                decimalPlaces: 0,
                maxIntegerDigits: 3,
                maxValue: 100,
                allowNegative: false,
              }}
            />
          </div>
          <span className={'w-44'}>year(s)</span>
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-56'}>Start In</span>
          <div className={'w-44'}>
            <RHFInputCell
              fieldName={`${name}.startIn`}
              inputType={'number'}
              disabled={isReadOnly}
              number={{
                decimalPlaces: 2,
                maxIntegerDigits: 3,
                maxValue: getOuterFormValues('totalNumberOfYears') ?? 100,
                allowNegative: false,
              }}
            />
          </div>
          <span className={''}>year(s)</span>
        </div>
      </div>
    </div>
  );
}
