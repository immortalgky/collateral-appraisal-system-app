import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import type { DCFMethodFormType } from '../../schemas/dcfForm';
import clsx from 'clsx';
import { DiscountedCashFlowMethodModal } from '../DiscountedCashFlowMethodModal';
import { RHFInputCell } from '../table/RHFInputCell';
import { Icon } from '@/shared/components';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';

interface MethodSpecifyRoomIncomePerDayProps {
  name: string;
  editing: string | null;
  expanded: boolean;
  assumptionId: string;
  assumptionName: string;
  method: DCFMethodFormType;
  totalNumberOfYears: number;
  onCancelEditMode: () => void;
}
export function MethodSpecifyRoomIncomePerDay({
  name = '',
  editing,
  expanded,
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYears,
  onCancelEditMode,
}: MethodSpecifyRoomIncomePerDayProps) {
  const { control } = useFormContext();
  const { fields } = useFieldArray({ control, name: name });

  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.saleableArea.${idx}`,
          deps: ['totalNumberOfDayInYear', `${name}.detail.totalSaleableArea`],
          compute: ({ value, getValues }) => {
            const totalNumberOfDayInYear = getValues('totalNumberOfDayInYear') ?? 0;
            const totalSaleableArea = getValues(`${name}.detail.totalSaleableArea`) ?? 0;
            return Number(totalSaleableArea) * Number(totalNumberOfDayInYear);
          },
        },
        {
          targetPath: `${name}.totalSaleableArea.${idx}`,
          deps: [`${name}.saleableArea.${idx}`, `${name}.occupancyRate.${idx}`],
          compute: ({ getValues }) => {
            const saleableArea = getValues(`${name}.saleableArea.${idx}`) ?? 0;
            const occupancyRate = getValues(`${name}.occupancyRate.${idx}`) ?? 0;
            return Number(saleableArea) * (Number(occupancyRate) / 100);
          },
        },
        {
          targetPath: `${name}.roomRateIncrease.${idx}`,
          deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
          compute: ({ getValues }) => {
            const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
            const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
            if (idx === 0) return 0;
            if (idx % increateRateYrs === 0) return increaseRatePct;
            return 0;
          },
        },
        {
          targetPath: `${name}.avgDailyRate.${idx}`,
          deps: [`${name}.roomRateIncrease.${idx}`, `${name}.detail.avgRoomRate`],
          compute: ({ getValues }) => {
            const avgRoomRate = getValues(`${name}.detail.avgRoomRate`);
            const prevAvgDailyRate = getValues(`${name}.avgDailyRate.${idx - 1}`);
            const roomRateIncrease = getValues(`${name}.roomRateIncrease.${idx}`);
            if (idx === 0) return avgRoomRate;
            return (
              Number(prevAvgDailyRate) +
              Number(prevAvgDailyRate) * (1 + Number(roomRateIncrease) / 100)
            );
          },
        },
        {
          targetPath: `${name}.roomIncome.${idx}`,
          deps: [`${name}.totalSaleableArea.${idx}`, `${name}.avgDailyRate.${idx}`],
          compute: ({ getValues }) => {
            const totalSaleableArea = getValues(`${name}.totalSaleableArea.${idx}`);
            const avgDailyRate = getValues(`${name}.avgDailyRate.${idx}`);
            return totalSaleableArea * avgDailyRate;
          },
        },
        {
          targetPath: `${name}.totalMethodValue.${idx}`,
          deps: [`${name}.totalSaleableArea.${idx}`, `${name}.avgDailyRate.${idx}`],
          compute: ({ getValues }) => {
            const totalSaleableArea = getValues(`${name}.totalSaleableArea.${idx}`);
            const avgDailyRate = getValues(`${name}.avgDailyRate.${idx}`);
            return totalSaleableArea * avgDailyRate;
          },
        },
      ];
    });
  }, [fields]);
  useDerivedFields({ rules });

  return (
    <>
      {expanded && (
        <MethodSpecifyRoomIncomePerDayTable name={name} totalNumberOfYear={totalNumberOfYears} />
      )}
      {editing == method.methodType && (
        <DiscountedCashFlowMethodModal
          editing={editing}
          onCancelEditMode={onCancelEditMode}
          assumptionName={assumptionName}
          size="2xl"
        >
          <MethodSpecifyRoomIncomePerDayModal name={`${name}.detail`} />
        </DiscountedCashFlowMethodModal>
      )}
    </>
  );
}

interface MethodSpecifyRoomIncomePerDayTableProps {
  name: string;
  totalNumberOfYear: number;
}
function MethodSpecifyRoomIncomePerDayTable({
  name,
  totalNumberOfYear,
}: MethodSpecifyRoomIncomePerDayTableProps) {
  const rowHeaderStyle = 'pl-20 px-1 py-1.5 text-sm';
  return (
    <>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Saleable Area (65 Rooms)</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              <RHFInputCell fieldName={`${name}.saleableArea.${idx}`} inputType="display" />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Occupancy Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              <RHFInputCell fieldName={`${name}.occupancyRate.${idx}`} inputType="number" />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Total Number of Saleable Area</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              <RHFInputCell fieldName={`${name}.totalSaleableArea.${idx}`} inputType="display" />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Increase Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              <RHFInputCell fieldName={`${name}.roomRateIncrease.${idx}`} inputType="display" />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Average Daily Rate (ADR)</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              <RHFInputCell fieldName={`${name}.avgDailyRate.${idx}`} inputType="display" />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Total Room Income</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              <RHFInputCell fieldName={`${name}.roomIncome.${idx}`} inputType="display" />
            </td>
          );
        })}
      </tr>
    </>
  );
}

function MethodSpecifyRoomIncomePerDayModal({ name = '' }: { name: string }) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ name: `${name}.roomDetails` });

  const watchedRoomIncome =
    (useWatch({
      control,
      name: `${name}.roomDetails`,
    }) as { roomType: string; roomIncome: number; saleableArea: number }[]) ?? [];

  const handleOnAdd = () => {
    append({ roomType: null, roomIncome: 0, saleableArea: 0 });
  };

  const handleOnRemove = (index: number) => {
    remove(index);
  };

  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return [
      ...watchedRoomIncome.flatMap((_, idx) => {
        return [
          {
            targetPath: `${name}.roomDetails.${idx}.totalRoomIncome`,
            deps: [
              `${name}.roomDetails.${idx}.roomIncome`,
              `${name}.roomDetails.${idx}.saleableArea`,
            ],
            compute: ({ value, getValues }) => {
              const roomIncome = getValues(`${name}.roomDetails.${idx}.roomIncome`) ?? 0;
              const saleableArea = getValues(`${name}.roomDetails.${idx}.saleableArea`) ?? 0;
              return Number(roomIncome) * Number(saleableArea);
            },
          },
        ];
      }),
      {
        targetPath: `${name}.avgRoomRate`,
        deps: [`${name}.roomDetails`],
        compute: ({ getValues }) => {
          const roomDetails = getValues(`${name}.roomDetails`) ?? [];
          const { sumTotalRoomIncome, sumSaleableArea } = roomDetails.reduce(
            (prev, curr) => {
              return {
                sumTotalRoomIncome: prev.sumTotalRoomIncome + curr.totalRoomIncome,
                sumSaleableArea: prev.sumSaleableArea + curr.saleableArea,
              };
            },
            {
              sumTotalRoomIncome: 0,
              sumSaleableArea: 0,
            },
          );

          if (sumSaleableArea === 0) return 0;

          return sumTotalRoomIncome / sumSaleableArea;
        },
      },
    ];
  }, [watchedRoomIncome]);
  useDerivedFields({ rules });

  return (
    <div>
      <table>
        <thead>
          <th>Room Type</th>
          <th>Room Income</th>
          <th>Saleable Area</th>
          <th>Total Room Income</th>
        </thead>
        <tbody>
          {(watchedRoomIncome ?? []).map((r, index) => {
            return (
              <tr key={index}>
                <td className="px-1.5 py-1.5">
                  <div className="flex flex-row gap-1.5">
                    <RHFInputCell
                      fieldName={`${name}.roomDetails.${index}.roomType`}
                      inputType="select"
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
                <td className="px-1.5 py-1.5">
                  <RHFInputCell
                    fieldName={`${name}.roomDetails.${index}.roomIncome`}
                    inputType="number"
                  />
                </td>
                <td className="px-1.5 py-1.5">
                  <RHFInputCell
                    fieldName={`${name}.roomDetails.${index}.saleableArea`}
                    inputType="number"
                  />
                </td>
                <td className="px-1.5 py-1.5">
                  <RHFInputCell
                    fieldName={`${name}.roomDetails.${index}.totalRoomIncome`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span className="text-right">{Number(value) ? Number(value) : 0}</span>
                    )}
                  />
                </td>
              </tr>
            );
          })}
          <tr>
            <td>
              <button
                type="button"
                onClick={() => handleOnAdd()}
                className="px-4 py-2 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
              >
                + Add More Factors
              </button>
            </td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-row gap-1.5">
          <span className={'w-44'}>Average Room Rate</span>
          <RHFInputCell fieldName={`${name}.avgRoomRate`} inputType={'display'} />
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-44'}>Total Number of Saleable Area</span>
          <RHFInputCell fieldName={`${name}.totalSaleableArea`} inputType={'number'} />
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={'w-44'}>Increase Rate</span>
          <RHFInputCell fieldName={`${name}.increaseRatePct`} inputType={'number'} />
          <span className={'w-44'}>every</span>
          <RHFInputCell fieldName={`${name}.increaseRateYrs`} inputType={'number'} />
          <span className={'w-44'}>year(s)</span>
        </div>
      </div>
    </div>
  );
}
