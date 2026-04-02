import clsx from 'clsx';
import { RHFInputCell } from '../table/RHFInputCell';
import type { MethodSpecifiedRoomIncomePerDayWrapper } from '../../types/dcf';

interface MethodSpecifiedRoomIncomePerDayProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedRoomIncomePerDayWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodSpecifiedRoomIncomePerDay({
  name,
  expanded,
  totalNumberOfYears,
  method,
  baseStyles,
}: MethodSpecifiedRoomIncomePerDayProps) {
  return (
    <>
      {expanded && (
        <>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>
              <span>Saleable Area</span>
              <RHFInputCell
                fieldName={`${name}.detail.sumSaleableArea`}
                inputType="display"
                accessor={({ value }) => <span>({value ?? 0} rooms)</span>}
              />
            </td>
            {(method.detail?.saleableArea ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Occupancy Rate</td>
            {Array.from({ length: totalNumberOfYears }).map((_, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
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
            <td className={clsx(baseStyles.rowHeader)}>Total Number of Saleable Area</td>
            {(method.detail?.totalSaleableAreaDeductByOccRate ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Increase Rate</td>
            {(method.detail?.roomRateIncrease ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Average Daily Rate (ADR)</td>
            {(method.detail?.avgDailyRate ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>
              <span>Total Room Income</span>
            </td>
            {(method.detail?.roomIncome ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
