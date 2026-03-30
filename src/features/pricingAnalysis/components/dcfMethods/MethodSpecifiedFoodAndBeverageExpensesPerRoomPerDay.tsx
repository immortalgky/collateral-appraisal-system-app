import clsx from 'clsx';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { getDCFFilteredAssumptions } from '../../domain/getDCFFilteredAssumptions';

interface MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay({
  name,
  expanded,
  totalNumberOfYears,
}: MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayProps) {
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
          targetPath: `${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`,
          deps: [`${name}.detail.increaseRate.${idx}`, `${name}.detail.firstYearAmt`],
          compute: ({ getValues }) => {
            const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;
            const totalNumberOfSaleableArea =
              getDCFFilteredAssumptions(getValues)

            if (idx === 0) return firstYearAmt * totalNumberOfSaleableArea;

            const prevRoomIncome = getValues(
              `${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx - 1}`,
            );
            const increaseRate = getValues(`${name}.detail.increaseRate.${idx}`) ?? 0;

            return toNumber(prevRoomIncome * (1 + increaseRate / 100));
          },
        },
        {
          targetPath: `${name}.totalMethodValues.${idx}`,
          deps: [`${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`],
          compute: ({ getValues }) => {
            return getValues(`${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`) ?? 0;
          },
        },
      ];
    },
  );
  useDerivedFields({ rules });

  return (
    <>
      {expanded && (
        <MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayTable
          name={name}
          totalNumberOfYear={totalNumberOfYears}
        />
      )}
    </>
  );
}

interface MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayTableProps {
  name: string;
  totalNumberOfYear: number;
}
function MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayTable({
  name,
  totalNumberOfYear,
}: MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayTableProps) {
  const rowHeaderStyle = 'pl-24 px-1.5 h-12 text-sm text-gray-600 border-b border-gray-300';
  const rowBodyStyle = 'px-1.5 h-12 text-sm text-right text-gray-600 border-b border-gray-300';

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
                    fieldName={`${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`}
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
