import { Icon } from '@/shared/components';
import { RHFInputCell } from '../../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { ScrollableTableContainer } from '../../ScrollableTableContainer';
import { toNumber } from '../../../domain/calculation';
import { roomTypeParameters } from '@/features/pricingAnalysis/data/dcfParameters';

export function MethodSpecifyRoomIncomePerDayModal({ name = '' }: { name: string }) {
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
            targetPath: `${name}.roomDetails.${idx}.totalRoomIncome`,
            deps: [
              `${name}.roomDetails.${idx}.roomIncome`,
              `${name}.roomDetails.${idx}.saleableArea`,
            ],
            compute: ({ getValues }) => {
              const roomIncome = getValues(`${name}.roomDetails.${idx}.roomIncome`) ?? 0;
              const saleableArea = getValues(`${name}.roomDetails.${idx}.saleableArea`) ?? 0;
              return toNumber(roomIncome * saleableArea);
            },
          },
        ];
      }),
      {
        targetPath: `${name}.sumRoomIncome`,
        deps: [`${name}.roomDetails`],
        compute: ({ getValues }) => {
          const roomDetails = getValues(`${name}.roomDetails`) ?? [];
          const sumRoomIncome = roomDetails.reduce((prev, curr) => {
            const currRoomIncome = curr.roomIncome ? toNumber(curr.roomIncome) : 0;
            return prev + currRoomIncome;
          }, 0);
          return toNumber(sumRoomIncome);
        },
      },
      {
        targetPath: `${name}.sumSaleableArea`,
        deps: [`${name}.roomDetails`],
        compute: ({ getValues }) => {
          const roomDetails = getValues(`${name}.roomDetails`) ?? [];
          const sumSaleableArea = roomDetails.reduce((prev, curr) => {
            const currSaleableArea = curr.saleableArea ? toNumber(curr.saleableArea) : 0;
            return prev + currSaleableArea;
          }, 0);
          return toNumber(sumSaleableArea);
        },
      },
      {
        targetPath: `${name}.sumTotalRoomIncome`,
        deps: [`${name}.roomDetails`],
        compute: ({ getValues }) => {
          const roomDetails = getValues(`${name}.roomDetails`) ?? [];
          const sumTotalRoomIncome = roomDetails.reduce((prev, curr) => {
            const currTotalRoomIncome = curr.totalRoomIncome ? toNumber(curr.totalRoomIncome) : 0;
            return prev + currTotalRoomIncome;
          }, 0);
          return toNumber(sumTotalRoomIncome);
        },
      },
      {
        targetPath: `${name}.avgRoomRate`,
        deps: [`${name}.roomDetails`],
        compute: ({ getValues }) => {
          const sumSaleableArea = getValues(`${name}.sumSaleableArea`) ?? 0;
          const sumTotalRoomIncome = getValues(`${name}.sumTotalRoomIncome`) ?? 0;

          if (sumSaleableArea === 0) return 0;

          return toNumber(sumTotalRoomIncome / sumSaleableArea);
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
                <th className="px-1.5 py-1.5 bg-gray-100">Room Income</th>
                <th className="px-1.5 py-1.5 bg-gray-100">Saleable Area</th>
                <th className="px-1.5 py-1.5 bg-gray-100">Total Room Income</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((r, index) => {
                const roomType = getValues(`${name}.roomDetails.${index}.roomType`);
                return (
                  <tr key={r.id}>
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
                          fieldName={`${name}.roomDetails.${index}.totalRoomIncome`}
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
                <td className="sticky bottom-0 px-1.5 bg-white">
                  <div className="text-right">
                    <RHFInputCell
                      fieldName={`${name}.sumRoomIncome`}
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
                      fieldName={`${name}.sumTotalRoomIncome`}
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
          <span className={'w-56'}>Average Room Rate</span>
          <div className={'grid-cols-12'}>
            <div className={'col-span-2'}>
              <RHFInputCell
                fieldName={`${name}.avgRoomRate`}
                inputType={'display'}
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </div>
          </div>
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
