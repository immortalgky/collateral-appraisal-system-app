import clsx from 'clsx';
import type { MethodPositionBasedSalaryCalculationWrapper } from '../../types/dcf';

interface MethodPositionBasedSalaryCalculationProps {
  expanded: boolean;
  method: MethodPositionBasedSalaryCalculationWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodPositionBasedSalaryCalculation({
  expanded,
  method,
  baseStyles,
}: MethodPositionBasedSalaryCalculationProps) {
  return (
    expanded && (
      <>
        <tr>
          <td className={clsx(baseStyles.rowHeader)}>Increase Rate</td>
          {(method.detail?.increaseRate ?? []).map((val, idx) => {
            return (
              <td key={idx} className={clsx(baseStyles.rowBody)}>
                <span className="text-right">{val ? val.toLocaleString() : 0}</span>
              </td>
            );
          })}
        </tr>
        <tr>
          <td className={clsx(baseStyles.rowHeader)}>
            <span>Total</span>
          </td>
          {(method.detail?.totalPositionBasedSalaryPerYear ?? []).map((val, idx) => {
            return (
              <td key={idx} className={clsx(baseStyles.rowBody)}>
                <span className="text-right">{val ? val.toLocaleString() : 0}</span>
              </td>
            );
          })}
        </tr>
      </>
    )
  );
}
