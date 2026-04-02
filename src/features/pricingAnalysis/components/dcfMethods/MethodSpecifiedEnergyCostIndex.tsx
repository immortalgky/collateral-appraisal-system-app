import clsx from 'clsx';
import type { MethodSpecifiedEnergyCostIndexWrapper } from '../../types/dcf';

interface MethodSpecifiedEnergyCostIndexProps {
  expanded: boolean;
  method: MethodSpecifiedEnergyCostIndexWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodSpecifiedEnergyCostIndex({
  expanded,
  method,
  baseStyles,
}: MethodSpecifiedEnergyCostIndexProps) {
  return (
    <>
      {expanded && (
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
              <span>Enegy Cost Index</span>
            </td>
            {(method.detail?.energyCostIndexIncrease ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>
              <span>Total Energy Cost</span>
            </td>
            {(method.detail?.totalEnegyCost ?? []).map((val, idx) => {
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
