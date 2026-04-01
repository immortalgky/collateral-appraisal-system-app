import clsx from 'clsx';
import { RHFInputCell } from '../table/RHFInputCell';

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
