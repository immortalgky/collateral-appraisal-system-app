import clsx from 'clsx';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';

interface MethodSpecifiedRentalIncomePerMonthProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodSpecifiedRentalIncomePerMonth({
  name = '',
  expanded,
  totalNumberOfYears,
}: MethodSpecifiedRentalIncomePerMonthProps) {
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
  //           if (idx % increateRateYrs === 0) return increaseRatePct;
  //           return 0;
  //         },
  //       },
  //       {
  //         targetPath: `${name}.detail.roomIncome.${idx}`,
  //         deps: [`${name}.detail.roomRateIncrease.${idx}`, `${name}.detail.sumRoomIncomePerYear`],
  //         compute: ({ getValues }) => {
  //           const totalRoomIncomePerYear = getValues(`${name}.detail.sumRoomIncomePerYear`) ?? 0;
  //           const increaseRate = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

  //           if (idx === 0) return totalRoomIncomePerYear;

  //           const prevRoomIncome = getValues(`${name}.detail.roomIncome.${idx - 1}`) ?? 0;

  //           return toNumber(prevRoomIncome * (1 + increaseRate / 100));
  //         },
  //       },
  //       {
  //         targetPath: `${name}.totalMethodValues.${idx}`,
  //         deps: [`${name}.detail.roomIncome.${idx}`],
  //         compute: ({ getValues }) => {
  //           return getValues(`${name}.detail.roomIncome.${idx}`) ?? 0;
  //         },
  //       },
  //     ];
  //   },
  // );
  // useDerivedFields({ rules });

  return (
    <>
      {expanded && (
        <MethodSpecifiedRentalIncomePerMonthTable
          name={name}
          totalNumberOfYear={totalNumberOfYears}
        />
      )}
    </>
  );
}

interface MethodSpecifiedRentalIncomePerMonthTableProps {
  name: string;
  totalNumberOfYear: number;
}
function MethodSpecifiedRentalIncomePerMonthTable({
  name,
  totalNumberOfYear,
}: MethodSpecifiedRentalIncomePerMonthTableProps) {
  const rowHeaderStyle =
    'pl-24 px-1.5 h-12 text-sm text-gray-500 border-b border-gray-300 bg-white';
  const rowBodyStyle =
    'px-1.5 h-12 text-sm text-right text-gray-500 border-b border-gray-300 bg-white';

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
                <RHFInputCell
                  fieldName={`${name}.detail.roomIncome.${idx}`}
                  inputType="display"
                  accessor={({ value }) => (
                    <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                  )}
                />
              </div>
            </td>
          );
        })}
      </tr>
    </>
  );
}
