import clsx from 'clsx';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';

interface MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate({
  name = '',
  expanded,
  totalNumberOfYears,
}: MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateProps) {
  const rules: DerivedFieldRule<unknown>[] = Array.from({ length: totalNumberOfYears }).flatMap(
    (_, idx) => {
      return [
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
          compute: ({ value, getValues }) => {
            const occupancyRateFirstYearPct =
              getValues(`${name}.detail.occupancyRateFirstYearPct`) ?? 0;
            const occupancyRatePct = getValues(`${name}.detail.occupancyRatePct`) ?? 0;
            const occupancyRateYrs = getValues(`${name}.detail.occupancyRateYrs`) ?? 0;

            if (idx === 0) return occupancyRateFirstYearPct;

            const prevOccupancyRate = getValues(`${name}.detail.occupancyRate.${idx - 1}`) ?? 0;

            if (idx % occupancyRateYrs === 0) return prevOccupancyRate + occupancyRatePct;

            return prevOccupancyRate;
          },
        },
        {
          targetPath: `${name}.detail.roomRateIncrease.${idx}`,
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
          targetPath: `${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx}`,
          deps: [`${name}.detail.roomRateIncrease.${idx}`, `${name}.detail.firstYearAmt`],
          compute: ({ getValues }) => {
            const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;

            if (idx === 0) return toNumber(firstYearAmt);

            const prevAdjutedValue = getValues(
              `${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx - 1}`,
            );
            const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

            return toNumber(prevAdjutedValue * (1 + roomRateIncrease / 100));
          },
        },
        {
          targetPath: `${name}.detail.roomIncome.${idx}`,
          deps: [
            `${name}.detail.occupancyRate.${idx}`,
            `${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx}`,
          ],
          compute: ({ getValues }) => {
            const adjRoomIncome =
              getValues(`${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx}`) ?? 0;
            const occupancyRate = getValues(`${name}.detail.occupancyRate.${idx}`) ?? 0;

            return toNumber(adjRoomIncome * occupancyRate);
          },
        },
        {
          targetPath: `${name}.totalMethodValues.${idx}`,
          deps: [`${name}.detail.roomIncome.${idx}`],
          compute: ({ getValues }) => {
            return getValues(`${name}.detail.roomIncome.${idx}`) ?? 0;
          },
        },
      ];
    },
  );
  useDerivedFields({ rules });

  return (
    <>
      {expanded && (
        <MethodSpecifiedRoomIncomeWithGrowthTable
          name={name}
          totalNumberOfYear={totalNumberOfYears}
        />
      )}
    </>
  );
}

interface MethodSpecifiedRoomIncomeWithGrowthTableProps {
  name: string;
  totalNumberOfYear: number;
}
function MethodSpecifiedRoomIncomeWithGrowthTable({
  name,
  totalNumberOfYear,
}: MethodSpecifiedRoomIncomeWithGrowthTableProps) {
  const rowHeaderStyle = 'pl-24 px-1.5 h-12 text-sm text-gray-600 border-b border-gray-300';
  const rowBodyStyle = 'px-1.5 h-12 text-sm text-right text-gray-600 border-b border-gray-300';

  return (
    <>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Occupancy Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell fieldName={`${name}.detail.occupancyRate.${idx}`} inputType="number" />
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
        <td className={clsx(rowHeaderStyle)}>Income Adjusted by Growth Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx}`}
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
