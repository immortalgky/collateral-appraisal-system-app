import clsx from 'clsx';
import type { MethodSpecifiedEnergyCostIndexWrapper } from '../../../types/dcf';
import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedEnergyCostIndexProps {
  name: string;
  expanded: boolean;
  method: MethodSpecifiedEnergyCostIndexWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodSpecifiedEnergyCostIndex({
  name,
  expanded,
  method,
  baseStyles,
}: MethodSpecifiedEnergyCostIndexProps) {
  return (
    <>
      {expanded && (
        <>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>
              <div className="flex flex-row gap-1.5 items-center">
                <span>Increase Rate - 1st year amt</span>
                <div className="w-32">
                  <RHFInputCell fieldName={`${name}.detail.energyCostIndex`} inputType="number" />
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
            </td>
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
