import { Icon } from '@/shared/components';
import { RHFInputCell } from '../../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { useFieldArray } from 'react-hook-form';
import { ScrollableTableContainer } from '../../ScrollableTableContainer';
import { toNumber } from '../../../domain/calculation';

interface MethodSpecifiedRentalIncomePerSquareMeterModalProps {
  name: string;
}
export function MethodSpecifiedRentalIncomePerSquareMeterModal({
  name,
}: MethodSpecifiedRentalIncomePerSquareMeterModalProps) {
  const { fields, append, remove } = useFieldArray({ name: `${name}.areaDetail` });

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
            targetPath: `${name}.areaDetail.${idx}.totalRentalIncomePerMonth`,
            deps: [
              `${name}.areaDetail.${idx}.rentalPrice`,
              `${name}.areaDetail.${idx}.saleableArea`,
            ],
            compute: ({ getValues }) => {
              const rentalPrice = getValues(`${name}.areaDetail.${idx}.rentalPrice`) ?? 0;
              const saleableArea = getValues(`${name}.areaDetail.${idx}.saleableArea`) ?? 0;
              return toNumber(rentalPrice * saleableArea);
            },
          },
          {
            targetPath: `${name}.areaDetail.${idx}.totalRentalIncomePerYear`,
            deps: [`${name}.areaDetail.${idx}.totalRentalIncomePerMonth`],
            compute: ({ getValues }) => {
              const totalRentalIncomePerMonth =
                getValues(`${name}.areaDetail.${idx}.totalRentalIncomePerMonth`) ?? 0;
              return totalRentalIncomePerMonth * 12;
            },
          },
        ];
      }),
      {
        targetPath: `${name}.sumRentalPrice`,
        deps: [`${name}.areaDetail`],
        compute: ({ getValues }) => {
          const areaDetail = getValues(`${name}.areaDetail`) ?? [];
          const sumRentalPrice = areaDetail.reduce((prev, curr) => {
            const currRentalPrice = curr.rentalPrice ? toNumber(curr.rentalPrice) : 0;
            return prev + currRentalPrice;
          }, 0);
          return sumRentalPrice;
        },
      },
      {
        targetPath: `${name}.sumSaleableArea`,
        deps: [`${name}.areaDetail`],
        compute: ({ getValues }) => {
          const areaDetail = getValues(`${name}.areaDetail`) ?? [];
          const sumSaleableArea = areaDetail.reduce((prev, curr) => {
            const currSaleableArea = curr.saleableArea ? toNumber(curr.saleableArea) : 0;
            return prev + currSaleableArea;
          }, 0);
          return sumSaleableArea;
        },
      },
      {
        targetPath: `${name}.sumTotalRentalIncomePerMonth`,
        deps: [`${name}.areaDetail`],
        compute: ({ getValues }) => {
          const areaDetail = getValues(`${name}.areaDetail`) ?? [];
          const sumTotalRentalIncomePerMonth = areaDetail.reduce((prev, curr) => {
            const currRoomIncome = curr.totalRentalIncomePerMonth
              ? toNumber(curr.totalRentalIncomePerMonth)
              : 0;
            return prev + currRoomIncome;
          }, 0);
          return sumTotalRentalIncomePerMonth;
        },
      },
      {
        targetPath: `${name}.sumTotalRentalIncomePerYear`,
        deps: [`${name}.areaDetail`],
        compute: ({ getValues }) => {
          const areaDetail = getValues(`${name}.areaDetail`) ?? [];
          const sumTotalRentalIncomePerYear = areaDetail.reduce((prev, curr) => {
            const currTotalRoomIncomePerYear = curr.totalRentalIncomePerYear
              ? toNumber(curr.totalRentalIncomePerYear)
              : 0;
            return prev + currTotalRoomIncomePerYear;
          }, 0);
          return sumTotalRentalIncomePerYear;
        },
      },
      {
        targetPath: `${name}.avgRentalRatePerMonth`,
        deps: [`${name}.sumTotalRentalIncomePerMonth`, `${name}.sumSaleableArea`],
        compute: ({ getValues }) => {
          const sumTotalRentalIncomePerMonth =
            getValues(`${name}.sumTotalRentalIncomePerMonth`) ?? 0;
          const sumSaleableArea = getValues(`${name}.sumSaleableArea`) ?? 0;
          return toNumber(sumTotalRentalIncomePerMonth / sumSaleableArea);
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
                  <th className="px-1.5 py-1.5 bg-gray-100">Area Description</th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Rental Price</span>
                      <span>Bath / Sq.M / Month</span>
                    </div>
                  </th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Total Saleable Area</span>
                      <span>Sq. M</span>
                    </div>
                  </th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Total Rental Income</span>
                      <span>Bath / Month</span>
                    </div>
                  </th>
                  <th className="px-1.5 py-1.5 bg-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Total Rental Income</span>
                      <span>Bath / Year</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.map((r, index) => {
                  return (
                    <tr key={r.id}>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <div className="flex flex-row gap-1.5 items-center">
                          <RHFInputCell
                            fieldName={`${name}.areaDetail.${index}.description`}
                            inputType="text"
                          />
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
                          fieldName={`${name}.areaDetail.${index}.rentalPrice`}
                          inputType="number"
                        />
                      </td>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <RHFInputCell
                          fieldName={`${name}.areaDetail.${index}.saleableArea`}
                          inputType="number"
                        />
                      </td>
                      <td className="px-1.5 py-1.5 border-b border-gray-300">
                        <div className="flex justify-end items-center text-right">
                          <RHFInputCell
                            fieldName={`${name}.areaDetail.${index}.totalRentalIncomePerMonth`}
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
                            fieldName={`${name}.areaDetail.${index}.totalRentalIncomePerYear`}
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
                  <td className="sticky bottom-0 px-1.5 bg-white">
                    <div className="text-right">
                      <RHFInputCell
                        fieldName={`${name}.sumRentalPrice`}
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
                        fieldName={`${name}.sumTotalRentalIncomePerMonth`}
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
                        fieldName={`${name}.sumTotalRentalIncomePerYear`}
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
          <span className={'w-56'}>Average Rental Price</span>
          <div className={'w-24 text-right'}>
            <RHFInputCell
              fieldName={`${name}.avgRentalRatePerMonth`}
              inputType={'display'}
              accessor={({ value }) => (
                <span className="text-right">{value ? value.toLocaleString() : 0}</span>
              )}
            />
          </div>
          <span>Baht/ Sq. Meter/ Month</span>
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-56'}>Total Saleable Area</span>
          <div className={'w-24'}>
            <RHFInputCell fieldName={`${name}.totalSaleableArea`} inputType={'number'} />
          </div>
          <span className={''}>Sq. Meter</span>
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
        <div className="flex flex-row gap-1.5">
          <span className={'w-56'}>Occupancy Rate - First Year</span>
          <div className={'w-24'}>
            <RHFInputCell fieldName={`${name}.occupancyRateFirstYearPct`} inputType={'number'} />
          </div>
          <span className={''}>% with growth</span>
          <div className={'w-24'}>
            <RHFInputCell fieldName={`${name}.occupancyRatePct`} inputType={'number'} />
          </div>
          <span className={''}>% every</span>
          <div className={'w-24'}>
            <RHFInputCell fieldName={`${name}.occupancyRateYrs`} inputType={'number'} />
          </div>
          <span className={''}>year(s)</span>
        </div>
      </div>
    </div>
  );
}
