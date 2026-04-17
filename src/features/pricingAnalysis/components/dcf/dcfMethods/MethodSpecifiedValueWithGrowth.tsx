import clsx from 'clsx';
import type { MethodSpecifiedValueWithGrowthWrapper } from '../../../types/dcf';
import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedValueWithGrowthProps {
  name: string;
  expanded: boolean;
  method: MethodSpecifiedValueWithGrowthWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodSpecifiedValueWithGrowth({
  name,
  expanded,
  method,
  baseStyles,
  isReadOnly,
}: MethodSpecifiedValueWithGrowthProps) {
  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td className={clsx(baseStyles.rowHeader)}>
              <div className="flex flex-row justify-between items-center gap-3">
                <span>Increase Rate</span>
                <div className="flex flex-row gap-1.5 items-center">
                  <span>1st year amt</span>
                  <div className="w-32">
                    <RHFInputCell
                      fieldName={`${name}.detail.firstYearAmt`}
                      inputType="number"
                      disabled={isReadOnly}
                      number={{
                        decimalPlaces: 2,
                        maxIntegerDigits: 15,
                        allowNegative: false,
                      }}
                    />
                  </div>
                  <span>growth</span>
                  <div className="w-20">
                    <RHFInputCell
                      fieldName={`${name}.detail.increaseRatePct`}
                      inputType="number"
                      disabled={isReadOnly}
                      number={{
                        decimalPlaces: 2,
                        maxIntegerDigits: 3,
                        allowNegative: false,
                      }}
                    />
                  </div>
                  <span>% every</span>
                  <div className="w-20">
                    <RHFInputCell
                      fieldName={`${name}.detail.increaseRateYrs`}
                      inputType="number"
                      disabled={isReadOnly}
                      number={{
                        decimalPlaces: 0,
                        maxIntegerDigits: 3,
                        maxValue: 100,
                        allowNegative: false,
                      }}
                    />
                  </div>
                  <span>year(s)</span>
                </div>
              </div>
            </td>
            {(method.detail?.increaseRates ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td className={clsx(baseStyles.rowHeader)}>Total</td>
            {(method.totalMethodValues ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
