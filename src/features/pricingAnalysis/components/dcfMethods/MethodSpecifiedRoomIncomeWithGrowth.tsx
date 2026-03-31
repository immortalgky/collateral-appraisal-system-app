import clsx from 'clsx';
import { RHFInputCell } from '../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { toNumber } from '../../domain/calculation';

interface MethodSpecifiedRoomIncomeWithGrowthProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodSpecifiedRoomIncomeWithGrowth({
  name = '',
  expanded,
  totalNumberOfYears,
}: MethodSpecifiedRoomIncomeWithGrowthProps) {
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
  //         deps: [`${name}.detail.roomRateIncrease.${idx}`, `${name}.detail.firstYearAmt`],
  //         compute: ({ getValues }) => {
  //           const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;

  //           if (idx === 0) return firstYearAmt;

  //           const prevRoomIncome = getValues(`${name}.detail.roomIncome.${idx - 1}`);
  //           const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

  //           return toNumber(prevRoomIncome * (1 + roomRateIncrease / 100));
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
        <MethodSpecifiedRoomIncomeWithGrowthTabe
          name={name}
          totalNumberOfYear={totalNumberOfYears}
        />
      )}
    </>
  );
}

interface MethodSpecifiedRoomIncomeWithGrowthTabeProps {
  name: string;
  totalNumberOfYear: number;
}
function MethodSpecifiedRoomIncomeWithGrowthTabe({
  name,
  totalNumberOfYear,
}: MethodSpecifiedRoomIncomeWithGrowthTabeProps) {
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
            fieldName={`${name}.detail.saleableArea`}
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
                    fieldName={`${name}.detail.roomIncome.${idx}`}
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
