import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { RHFInputCell } from '../table/RHFInputCell';
import clsx from 'clsx';
import { formatFixed2 } from '../../domain/calculation';

interface MethodSpecifiedValueWithGrowthProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodSpecifiedValueWithGrowth({
  name = '',
  expanded,
  totalNumberOfYears,
}: MethodSpecifiedValueWithGrowthProps) {
  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.increaseRates.${idx}`,
          deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
          compute: ({ getValues }) => {
            const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
            const increaseRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
            if (idx === 0) return 0;

            if (idx % increaseRateYrs === 0) return Number(increaseRatePct);
          },
        },
        {
          targetPath: `${name}.totalMethodValues.${idx}`,
          deps: [
            `${name}.detail.firstYearAmt`,
            `${name}.detail.increaseRatePct`,
            `${name}.increaseRates.${idx}`,
          ],
          compute: ({ getValues }) => {
            const prevYearValue = getValues(`${name}.totalMethodValues.${idx - 1}`) ?? 0;
            const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;
            const increaseRate = getValues(`${name}.increaseRates.${idx}`) ?? 0;

            if (idx === 0) return firstYearAmt;

            console.log(idx);
            return formatFixed2(Number(prevYearValue) * (1 + Number(increaseRate) / 100));
          },
        },
      ];
    });
  }, [totalNumberOfYears, name]);

  useDerivedFields({ rules });

  return (
    <>
      {expanded && (
        <MethodSpecifiedValueWithGrowthTable
          name={`${name}`}
          totalNumberOfYear={totalNumberOfYears}
        />
      )}
    </>
  );
}

interface MethodSpecifiedValueWithGrowthTableProps {
  name: string;
  totalNumberOfYear: number;
}
function MethodSpecifiedValueWithGrowthTable({
  name,
  totalNumberOfYear,
}: MethodSpecifiedValueWithGrowthTableProps) {
  const rowHeaderStyle = 'pl-20 px-1.5 h-12 text-sm text-gray-500';
  const rowBodyStyle = 'px-1.5 h-12 text-sm text-right text-gray-500';

  return (
    <>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Increase Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.increaseRates.${idx}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? Number(value).toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Total</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.totalMethodValues.${idx}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? Number(value).toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
    </>
  );
}
