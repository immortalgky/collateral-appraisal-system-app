import clsx from 'clsx';
import { RHFInputCell } from '../table/RHFInputCell';
import type { MethodSpecifiedRentalIncomePerSquareMeterWrapper } from '../../types/dcf';

interface MethodSpecifiedRentalIncomePerSquareMeterProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedRentalIncomePerSquareMeterWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodSpecifiedRentalIncomePerSquareMeter({
  name,
  expanded,
  totalNumberOfYears,
  method,
  baseStyles,
}: MethodSpecifiedRentalIncomePerSquareMeterProps) {
  return (
    <>
      {expanded && (
        <>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Saleable Area</td>
            {Array.from({ length: totalNumberOfYears }).map((_, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">
                    {method.detail?.sumSaleableArea
                      ? method.detail?.sumSaleableArea.toLocaleString()
                      : 0}
                  </span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Occupancy Rate</td>
            {Array.from({ length: totalNumberOfYears }).map((_, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <div className="flex justify-end items-center">
                    <div className="flex justify-end items-center w-16">
                      <RHFInputCell
                        fieldName={`${name}.detail.occupancyRate.${idx}`}
                        inputType="number"
                        number={{
                          decimalPlaces: 2,
                          maxIntegerDigits: 3,
                          maxValue: 100,
                          minValue: 0,
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
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Increase Rate</td>
            {(method.detail?.rentalRateIncrease ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className={clsx('text-right', val > 0 ? 'text-primary' : '')}>
                    {val ? val.toLocaleString() : 0}
                  </span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Average Rental Rate</td>
            {(method.detail?.avgRentalRate ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>
              <span>Total Rental Income</span>
            </td>
            {(method.detail?.totalRentalIncome ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <div className="flex flex-row justify-end items-center">
                    <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                  </div>
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
