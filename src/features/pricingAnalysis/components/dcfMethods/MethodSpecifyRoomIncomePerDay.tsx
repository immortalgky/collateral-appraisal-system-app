import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import type { DCFMethodFormType } from '../../schemas/dcfForm';
import clsx from 'clsx';
import { DiscountedCashFlowMethodModal } from '../DiscountedCashFlowMethodModal';
import { RHFInputCell } from '../table/RHFInputCell';
import { Icon } from '@/shared/components';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { formatFixed2 } from '../../domain/calculation';

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
            return Number(prevAvgDailyRate) * (1 + Number(roomRateIncrease) / 100);
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
          targetPath: `${name}.totalMethodValues.${idx}`,
          deps: [`${name}.totalSaleableArea.${idx}`, `${name}.avgDailyRate.${idx}`],
          compute: ({ getValues }) => {
            const totalSaleableArea = getValues(`${name}.totalSaleableArea.${idx}`);
            const avgDailyRate = getValues(`${name}.avgDailyRate.${idx}`);
            return formatFixed2(totalSaleableArea * avgDailyRate);
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
  const rowHeaderStyle = 'pl-20 px-1.5 h-12 text-sm text-gray-400';
  const rowBodyStyle = 'px-1.5 h-12 text-sm text-right text-gray-500';
  return (
    <>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Saleable Area (65 Rooms)</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.saleableArea.${idx}`}
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
                    fieldName={`${name}.occupancyRate.${idx}`}
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
                fieldName={`${name}.totalSaleableArea.${idx}`}
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
                fieldName={`${name}.roomRateIncrease.${idx}`}
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
                fieldName={`${name}.avgDailyRate.${idx}`}
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
        <td className={clsx(rowHeaderStyle)}>Total Room Income</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.roomIncome.${idx}`}
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
