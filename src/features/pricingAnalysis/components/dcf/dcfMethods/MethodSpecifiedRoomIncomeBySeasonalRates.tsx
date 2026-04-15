import clsx from 'clsx';
import { RHFInputCell } from '../../table/RHFInputCell';
import type { MethodSpecifiedRoomIncomeBySeasonalRatesWrapper } from '../../../types/dcf';

interface MethodSpecifiedRoomIncomeBySeasonalRatesProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedRoomIncomeBySeasonalRatesWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly: boolean;
}
export function MethodSpecifiedRoomIncomeBySeasonalRates({
  name,
  expanded,
  totalNumberOfYears,
  method,
  baseStyles,
  isReadOnly,
}: MethodSpecifiedRoomIncomeBySeasonalRatesProps) {
  return (
    <>
      {expanded && (
        <>
          <tr className={clsx('group transition-colors')}>
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
          <tr className={clsx('group transition-colors')}>
            <td className={clsx(baseStyles.rowHeader)}>
              <div className="flex flex-row gap-1.5 items-center">
                <span>Occupancy Rate - 1st year amt</span>
                <div className="w-20">
                  <RHFInputCell
                    fieldName={`${name}.detail.occupancyRateFirstYearPct`}
                    inputType="number"
                    number={{
                      decimalPlaces: 2,
                      maxIntegerDigits: 3,
                      maxValue: 100,
                      allowNegative: false,
                    }}
                    disabled={isReadOnly}
                  />
                </div>
                <span>% growth</span>
                <div className="w-20">
                  <RHFInputCell
                    fieldName={`${name}.detail.occupancyRatePct`}
                    inputType="number"
                    number={{
                      decimalPlaces: 2,
                      maxIntegerDigits: 3,
                      maxValue: 100,
                      allowNegative: false,
                    }}
                    disabled={isReadOnly}
                  />
                </div>
                <span>% every</span>
                <div className="w-20">
                  <RHFInputCell
                    fieldName={`${name}.detail.occupancyRateYrs`}
                    inputType="number"
                    number={{
                      decimalPlaces: 0,
                      maxIntegerDigits: 3,
                      maxValue: 100,
                      allowNegative: false,
                    }}
                    disabled={isReadOnly}
                  />
                </div>
                <span>year(s)</span>
              </div>
            </td>
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
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </td>
              );
            })}
          </tr>
          <tr className={clsx('group transition-colors')}>
            <td className={clsx(baseStyles.rowHeader)}>Total Number of Saleable Area</td>
            {(method.detail?.totalSaleableAreaDeductByOccRate ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className={clsx('group transition-colors')}>
            <td className={clsx(baseStyles.rowHeader)}>Increase Rate</td>
            {(method.detail?.roomRateIncrease ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className={clsx('group transition-colors')}>
            <td className={clsx(baseStyles.rowHeader)}>Average Daily Rate (ADR)</td>
            {(method.detail?.avgDailyRate ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className={clsx('group transition-colors')}>
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
