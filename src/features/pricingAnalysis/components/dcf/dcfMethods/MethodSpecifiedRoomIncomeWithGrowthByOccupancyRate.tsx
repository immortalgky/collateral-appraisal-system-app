import clsx from 'clsx';
import { RHFInputCell } from '../../table/RHFInputCell';
import type { MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateWrapper } from '../../../types/dcf';

interface MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly: boolean;
}
export function MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate({
  name = '',
  expanded,
  totalNumberOfYears,
  method,
  baseStyles,
  isReadOnly,
}: MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateProps) {
  return (
    <>
      {expanded && (
        <>
          <tr className={clsx('group transition-colors')}>
            <td className={clsx(baseStyles.rowHeader)}>Increase Rate</td>
            {(method.detail?.roomRateIncrease ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className={clsx('group transition-colors')}>
            <td className={clsx(baseStyles.rowHeader)}>Income Adjusted by Growth Rate</td>
            {(method.detail?.roomIncomeAdjustedValuedByGrowthRates ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className={clsx('group transition-colors')}>
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
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </td>
              );
            })}
          </tr>
          <tr className={clsx('group transition-colors')}>
            <td className={clsx(baseStyles.rowHeader)}>
              <span>Room Income</span>
              <span>({method.detail?.saleableArea ?? 0} rooms)</span>
            </td>
            {(method.detail?.roomIncome ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
