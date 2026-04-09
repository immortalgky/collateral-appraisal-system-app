import { Icon } from '@/shared/components';
import { RHFInputCell } from '../../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { ScrollableTableContainer } from '../../ScrollableTableContainer';
import { roomTypeParameters } from '@/features/pricingAnalysis/data/dcfParameters';

interface MethodSpecifiedRentalIncomePerMonthModalProps {
  name: string;
}
export function MethodSpecifiedRentalIncomePerMonthModal({
  name = '',
}: MethodSpecifiedRentalIncomePerMonthModalProps) {
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
            targetPath: `${name}.roomDetails.${idx}.totalRoomIncomePerMonth`,
            deps: [
              `${name}.roomDetails.${idx}.roomIncome`,
              `${name}.roomDetails.${idx}.saleableArea`,
            ],
            compute: ({ getValues }) => {
              const roomIncome = getValues(`${name}.roomDetails.${idx}.roomIncome`) ?? 0;
              const saleableArea = getValues(`${name}.roomDetails.${idx}.saleableArea`) ?? 0;
              return Number(roomIncome) * Number(saleableArea);
            },
          },
          {
            targetPath: `${name}.roomDetails.${idx}.totalRoomIncomePerYear`,
            deps: [`${name}.roomDetails.${idx}.totalRoomIncomePerMonth`],
            compute: ({ getValues }) => {
              const totalRoomIncomePerMonth =
                getValues(`${name}.roomDetails.${idx}.totalRoomIncomePerMonth`) ?? 0;
              return totalRoomIncomePerMonth * 12;
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
            const currSaleableArea = curr.saleableArea ? Number(curr.saleableArea) : 0;
            return prev + currSaleableArea;
          }, 0);
          return sumSaleableArea;
        },
      },
      {
        targetPath: `${name}.sumRoomIncomePerMonth`,
        deps: [`${name}.roomDetails`],
        compute: ({ getValues }) => {
          const roomDetails = getValues(`${name}.roomDetails`) ?? [];
          const sumRoomIncomePerMonth = roomDetails.reduce((prev, curr) => {
            const currRoomIncome = curr.totalRoomIncomePerMonth
              ? Number(curr.totalRoomIncomePerMonth)
              : 0;
            return prev + currRoomIncome;
          }, 0);
          return sumRoomIncomePerMonth;
        },
      },
      {
        targetPath: `${name}.sumRoomIncomePerYear`,
        deps: [`${name}.roomDetails`],
        compute: ({ getValues }) => {
          const roomDetails = getValues(`${name}.roomDetails`) ?? [];
          const sumTotalRoomIncomePerYear = roomDetails.reduce((prev, curr) => {
            const currTotalRoomIncomePerYear = curr.totalRoomIncomePerYear
              ? Number(curr.totalRoomIncomePerYear)
              : 0;
            return prev + currTotalRoomIncomePerYear;
          }, 0);
          return sumTotalRoomIncomePerYear;
        },
      },
    ];
  }, [fields.length]);
  useDerivedFields({ rules });

  return (
    <div className="flex flex-col gap-2">
      <div className="border border-gray-300 rounded-xl p-1.5 overflow-auto">
        <ScrollableTableContainer className="flex-1 min-h-0 max-h-[274px]">
          <table className={'table table-sm'}>
            <thead>
              <tr>
                <th className="px-1.5 py-1.5 bg-gray-100">Room Type</th>
                <th className="px-1.5 py-1.5 bg-gray-100">
                  <div className="flex flex-col gap-1.5">
                    <span>Room Income</span>
                    <span>Bath / Room / Month</span>
                  </div>
                </th>
                <th className="px-1.5 py-1.5 bg-gray-100">Saleable Area</th>
                <th className="px-1.5 py-1.5 bg-gray-100">
                  <div className="flex flex-col gap-1.5">
                    <span>Total Room Income</span>
                    <span>Bath / Month</span>
                  </div>
                </th>
                <th className="px-1.5 py-1.5 bg-gray-100">
                  <div className="flex flex-col gap-1.5">
                    <span>Total Room Income</span>
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
                          options={roomTypeParameters.map(p => ({
                            value: p.code,
                            label: p.description,
                          }))}
                        />
                        {String(roomType) === '99' && (
                          <RHFInputCell
                            fieldName={`${name}.roomDetails.${index}.roomTypeOther`}
                            inputType="text"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleOnRemove(index)}
                          className="size-5 flex-shrink-0 flex items-center justify-center cursor-pointer rounded text-gray-300 hover:text-danger-600 hover:bg-danger-50 transition-colors opacity-100"
                          title="Delete"
                        >
                          <Icon style="solid" name="trash" className="size-1" />
                        </button>
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5 border-b border-gray-300">
                      <RHFInputCell
                        fieldName={`${name}.roomDetails.${index}.roomIncome`}
                        inputType="number"
                      />
                    </td>
                    <td className="px-1.5 py-1.5 border-b border-gray-300">
                      <RHFInputCell
                        fieldName={`${name}.roomDetails.${index}.saleableArea`}
                        inputType="number"
                      />
                    </td>
                    <td className="px-1.5 py-1.5 border-b border-gray-300">
                      <div className="flex justify-end items-center text-right">
                        <RHFInputCell
                          fieldName={`${name}.roomDetails.${index}.totalRoomIncomePerMonth`}
                          inputType="display"
                          accessor={({ value }) => (
                            <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                          )}
                        />
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5 border-b border-gray-300">
                      <div className="flex justify-end items-center text-right">
                        <RHFInputCell
                          fieldName={`${name}.roomDetails.${index}.totalRoomIncomePerYear`}
                          inputType="display"
                          accessor={({ value }) => (
                            <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                          )}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                      fieldName={`${name}.sumRoomIncomePerMonth`}
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
                      fieldName={`${name}.sumRoomIncomePerYear`}
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
        </ScrollableTableContainer>
      </div>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-row gap-1.5 items-center">
          <span className={'w-56'}>Room Income</span>
          <div className={'w-24'}>
            <RHFInputCell
              fieldName={`${name}.sumRoomIncomePerYear`}
              inputType={'display'}
              accessor={({ value }) => (
                <span className="text-right">{value ? value.toLocaleString() : 0}</span>
              )}
            />
          </div>
          <span>Baht/ Year</span>
        </div>
        <div className="flex flex-row gap-1.5 items-center">
          <span className={'w-56'}>Total Number of Saleable Area</span>
          <div className={'w-24'}>
            <RHFInputCell fieldName={`${name}.totalSaleableArea`} inputType={'number'} />
          </div>
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-56'}>Increase Rate</span>
          <div className={'w-24'}>
            <RHFInputCell fieldName={`${name}.increaseRatePct`} inputType={'number'} />
          </div>
          <span className={''}>every</span>
          <div className={'w-24'}>
            <RHFInputCell fieldName={`${name}.increaseRateYrs`} inputType={'number'} />
          </div>
          <span className={'w-44'}>year(s)</span>
        </div>
      </div>
    </div>
  );
}
