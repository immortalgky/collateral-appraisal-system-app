import clsx from 'clsx';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';

interface MethodRoomCostBasedOnExpensesPerRoomPerDayProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodRoomCostBasedOnExpensesPerRoomPerDay({
  name,
  expanded,
  totalNumberOfYears,
}: MethodRoomCostBasedOnExpensesPerRoomPerDayProps) {
  // const rules: DerivedFieldRule<unknown>[] = Array.from({ length: totalNumberOfYears }).flatMap(
  //   (_, idx) => {
  //     return [
  //       {
  //         targetPath: `${name}.detail.roomRateIncrease.${idx}`,
  //         deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
  //         compute: ({ getValues }) => {
  //           const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
  //           const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
  //           if (idx === 0) return 0;
  //           if (idx % increateRateYrs === 0) return toNumber(increaseRatePct);
  //           return 0;
  //         },
  //       },
  //       {
  //         targetPath: `${name}.detail.roomExpense.${idx}`,
  //         deps: [
  //           `${name}.detail.roomRateIncrease.${idx}`,
  //           `${name}.detail.sumTotalRoomExpensePerYear`,
  //         ],
  //         compute: ({ getValues }) => {
  //           const firstYearAmt = getValues(`${name}.detail.sumTotalRoomExpensePerYear`) ?? 0;

  //           if (idx === 0) return firstYearAmt;

  //           const prevRoomIncome = getValues(`${name}.detail.roomExpense.${idx - 1}`);
  //           const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

  //           return toNumber(prevRoomIncome * (1 + roomRateIncrease / 100));
  //         },
  //       },
  //       {
  //         targetPath: `${name}.totalMethodValues.${idx}`,
  //         deps: [`${name}.detail.roomExpense.${idx}`],
  //         compute: ({ getValues }) => {
  //           return getValues(`${name}.detail.roomExpense.${idx}`) ?? 0;
  //         },
  //       },
  //     ];
  //   },
  // );
  // useDerivedFields({ rules });

  return (
    <>
      {expanded && (
        <MethodSpecifiedRentalIncomePerSquareMeterTable
          name={name}
          totalNumberOfYear={totalNumberOfYears}
        />
      )}
    </>
  );
}

interface MethodSpecifiedRentalIncomePerSquareMeterTableProps {
  name: string;
  totalNumberOfYear: number;
}
function MethodSpecifiedRentalIncomePerSquareMeterTable({
  name,
  totalNumberOfYear,
}: MethodSpecifiedRentalIncomePerSquareMeterTableProps) {
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
        <td className={clsx(rowHeaderStyle)}>
          <span>Room Income</span>
          <RHFInputCell
            fieldName={`${name}.detail.sumSaleableArea`}
            inputType="display"
            accessor={({ value }) => <span>({value ?? 0} rooms)</span>}
          />
        </td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <div className="flex flex-row justify-end items-center">
                <div className="w-16">
                  <RHFInputCell
                    fieldName={`${name}.detail.roomExpense.${idx}`}
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
