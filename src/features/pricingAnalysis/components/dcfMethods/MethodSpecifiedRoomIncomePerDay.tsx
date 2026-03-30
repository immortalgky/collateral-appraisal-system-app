import { useFieldArray, useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';

interface MethodSpecifiedRoomIncomePerDayProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodSpecifiedRoomIncomePerDay({
  name,
  expanded,
  totalNumberOfYears,
}: MethodSpecifiedRoomIncomePerDayProps) {
  const { control, getValues } = useFormContext();
  const { fields } = useFieldArray({ control, name: name });

  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.detail.saleableArea.${idx}`,
          deps: ['totalNumberOfDayInYear', `${name}.detail.sumSaleableArea`],
          compute: ({ getValues }) => {
            const totalNumberOfDayInYear = getValues('totalNumberOfDayInYear') ?? 0;
            const sumSaleableArea = getValues(`${name}.detail.sumSaleableArea`) ?? 0;
            return toNumber(sumSaleableArea * totalNumberOfDayInYear);
          },
        },
        {
          targetPath: `${name}.detail.occupancyRate.${idx}`,
          deps: [
            `${name}.detail.occupancyRateFirstYearPct`,
            `${name}.detail.occupancyRatePct`,
            `${name}.detail.occupancyRateYrs`,
          ],
          when: ({ getFieldState, formState }) => {
            const { isDirty } = getFieldState(`${name}.detail.occupancyRate.${idx}`, formState);
            return !isDirty;
          },
          compute: ({ getValues }) => {
            const occupancyRateFirstYearPct =
              getValues(`${name}.detail.occupancyRateFirstYearPct`) ?? 0;
            const occupancyRatePct = getValues(`${name}.detail.occupancyRatePct`) ?? 0;
            const occupancyRateYrs = getValues(`${name}.detail.occupancyRateYrs`) ?? 0;

            if (idx === 0) return toNumber(occupancyRateFirstYearPct);

            const prevOccupancyRate = getValues(`${name}.detail.occupancyRate.${idx - 1}`) ?? 0;

            if (prevOccupancyRate >= 100) return 100;

            if (idx % occupancyRateYrs === 0) return toNumber(prevOccupancyRate + occupancyRatePct);

            return toNumber(prevOccupancyRate);
          },
        },
        {
          targetPath: `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
          deps: [`${name}.detail.saleableArea.${idx}`, `${name}.detail.occupancyRate.${idx}`],
          compute: ({ getValues }) => {
            const saleableArea = getValues(`${name}.detail.saleableArea.${idx}`) ?? 0;
            const occupancyRate = getValues(`${name}.detail.occupancyRate.${idx}`) ?? 0;
            return toNumber(saleableArea * (occupancyRate / 100));
          },
        },
        {
          targetPath: `${name}.detail.roomRateIncrease.${idx}`,
          deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
          compute: ({ getValues }) => {
            const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
            const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
            if (idx === 0) return 0;
            if (idx % increateRateYrs === 0) return toNumber(increaseRatePct);
            return 0;
          },
        },
        {
          targetPath: `${name}.detail.avgDailyRate.${idx}`,
          deps: [`${name}.detail.roomRateIncrease.${idx}`, `${name}.detail.avgRoomRate`],
          compute: ({ getValues }) => {
            const avgRoomRate = getValues(`${name}.detail.avgRoomRate`);
            const prevAvgDailyRate = getValues(`${name}.detail.avgDailyRate.${idx - 1}`);
            const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`);
            if (idx === 0) return avgRoomRate;
            return toNumber(prevAvgDailyRate * (1 + roomRateIncrease / 100));
          },
        },
        {
          targetPath: `${name}.detail.roomIncome.${idx}`,
          deps: [
            `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
            `${name}.detail.avgDailyRate.${idx}`,
          ],
          compute: ({ getValues }) => {
            const totalSaleableAreaDeductByOccRate = getValues(
              `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
            );
            const avgDailyRate = getValues(`${name}.detail.avgDailyRate.${idx}`);
            return toNumber(totalSaleableAreaDeductByOccRate * avgDailyRate);
          },
        },
        {
          targetPath: `${name}.totalMethodValues.${idx}`,
          deps: [`${name}.detail.roomIncome.${idx}`],
          compute: ({ getValues }) => {
            const roomIncome = getValues(`${name}.detail.roomIncome.${idx}`);
            return toNumber(roomIncome);
          },
        },
      ];
    });
  }, [fields]);
  useDerivedFields({ rules });

  return (
    <>
      {expanded && (
        <MethodSpecifyRoomIncomePerDayTable
          name={name}
          totalNumberOfYear={totalNumberOfYears}
          data-total-saleable-area={getValues(`${name}.detail.totalSaleableAreaDeductByOccRate`)}
        />
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
  const rowHeaderStyle = 'pl-24 px-1.5 h-12 text-sm text-gray-600 border-b border-gray-300';
  const rowBodyStyle = 'px-1.5 h-12 text-sm text-right text-gray-600 border-b border-gray-300';
  return (
    <>
      <tr>
        <td className={clsx(rowHeaderStyle)}>
          <span>Saleable Area</span>
          <RHFInputCell
            fieldName={`${name}.detail.sumSaleableArea`}
            inputType="display"
            accessor={({ value }) => <span>({value ?? 0} rooms)</span>}
          />
        </td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.saleableArea.${idx}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Occupancy Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <div className="flex flex-row justify-end items-center">
                <div className="w-16">
                  <RHFInputCell
                    fieldName={`${name}.detail.occupancyRate.${idx}`}
                    inputType="number"
                    number={{
                      decimalPlaces: 2,
                      maxIntegerDigits: 3,
                      maxValue: 100,
                      allowNegative: false,
                    }}
                  />
                </div>
              </div>
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Total Number of Saleable Area</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Increase Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.roomRateIncrease.${idx}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Average Daily Rate (ADR)</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.avgDailyRate.${idx}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>
          <span>Total Room Income</span>
        </td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.roomIncome.${idx}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
    </>
  );
}
