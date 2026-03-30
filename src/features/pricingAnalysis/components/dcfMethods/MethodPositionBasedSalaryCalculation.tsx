import clsx from 'clsx';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';

interface MethodPositionBasedSalaryCalculationProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodPositionBasedSalaryCalculation({
  name,
  expanded,
  totalNumberOfYears,
}: MethodPositionBasedSalaryCalculationProps) {
  const rules: DerivedFieldRule<unknown>[] = Array.from({ length: totalNumberOfYears }).flatMap(
    (_, idx) => {
      return [
        {
          targetPath: `${name}.detail.increaseRate.${idx}`,
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
          targetPath: `${name}.detail.totalPositionBasedSalaryPerYear.${idx}`,
          deps: [`${name}.detail.increaseRate.${idx}`, `${name}.detail.sumTotalSalaryPerYear`],
          compute: ({ getValues }) => {
            const firstYearAmt = getValues(`${name}.detail.sumTotalSalaryPerYear`) ?? 0;

            if (idx === 0) return firstYearAmt;

            const prevTotalSalaryCost = getValues(
              `${name}.detail.totalPositionBasedSalaryPerYear.${idx - 1}`,
            );
            const increaseRate = getValues(`${name}.detail.increaseRate.${idx}`) ?? 0;

            return toNumber(prevTotalSalaryCost * (1 + increaseRate / 100));
          },
        },
        {
          targetPath: `${name}.totalMethodValues.${idx}`,
          deps: [`${name}.detail.totalPositionBasedSalaryPerYear.${idx}`],
          compute: ({ getValues }) => {
            return getValues(`${name}.detail.totalPositionBasedSalaryPerYear.${idx}`) ?? 0;
          },
        },
      ];
    },
  );
  useDerivedFields({ rules });

  return (
    <>
      {expanded && (
        <MethodPositionBasedSalaryCalculationTable
          name={name}
          totalNumberOfYear={totalNumberOfYears}
        />
      )}
    </>
  );
}

interface MethodPositionBasedSalaryCalculationTableProps {
  name: string;
  totalNumberOfYear: number;
}
function MethodPositionBasedSalaryCalculationTable({
  name,
  totalNumberOfYear,
}: MethodPositionBasedSalaryCalculationTableProps) {
  const rowHeaderStyle = 'pl-24 px-1.5 h-12 text-sm text-gray-500 border-b border-gray-300';
  const rowBodyStyle = 'px-1.5 h-12 text-sm text-right text-gray-500 border-b border-gray-300';

  return (
    <>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Increase Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.increaseRate.${idx}`}
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
          <span>Total</span>
        </td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <div className="flex flex-row justify-end items-center">
                <div className="w-16">
                  <RHFInputCell
                    fieldName={`${name}.detail.totalPositionBasedSalaryPerYear.${idx}`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                    )}
                  />
                </div>
              </div>
            </td>
          );
        })}
      </tr>
    </>
  );
}
