import clsx from 'clsx';
import type { MethodSpecifiedValueWithGrowthWrapper } from '../../../types/dcf';
import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedValueWithGrowthProps {
  name: string;
  expanded: boolean;
  method: MethodSpecifiedValueWithGrowthWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodSpecifiedValueWithGrowth({
  name,
  expanded,
  method,
  baseStyles,
}: MethodSpecifiedValueWithGrowthProps) {
  return (
    <>
      {expanded && (
        <>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>
              <div className="flex flex-row justify-between items-center gap-3">
                <span>Increase Rate</span>
                <div className="flex flex-row gap-1.5 items-center">
                  <span>1st year amt</span>
                  <div className="w-32">
                    <RHFInputCell fieldName={`${name}.detail.firstYearAmt`} inputType="number" />
                  </div>
                  <span>growth</span>
                  <div className="w-20">
                    <RHFInputCell fieldName={`${name}.detail.increaseRatePct`} inputType="number" />
                  </div>
                  <span>% every</span>
                  <div className="w-20">
                    <RHFInputCell fieldName={`${name}.detail.increaseRateYrs`} inputType="number" />
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
          <tr>
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
