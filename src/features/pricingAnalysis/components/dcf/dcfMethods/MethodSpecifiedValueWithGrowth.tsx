import clsx from 'clsx';
import type { MethodSpecifiedValueWithGrowthWrapper } from '../../../types/dcf';

interface MethodSpecifiedValueWithGrowthProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedValueWithGrowthWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodSpecifiedValueWithGrowth({
  expanded,
  method,
  baseStyles,
}: MethodSpecifiedValueWithGrowthProps) {
  return (
    <>
      {expanded && (
        <>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Increase Rate</td>
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
