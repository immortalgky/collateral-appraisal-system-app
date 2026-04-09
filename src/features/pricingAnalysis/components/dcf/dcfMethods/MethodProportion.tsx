import clsx from 'clsx';
import type { MethodProportionWrapper } from '../../../types/dcf';
import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodProportionProps {
  name: string;
  expanded: boolean;
  method: MethodProportionWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodProportion({ name, expanded, method, baseStyles }: MethodProportionProps) {
  return (
    <>
      {expanded && (
        <>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>
              <div className="flex flex-row gap-3 items-center justify-between">
                <span>Total</span>
                <div className="flex flex-row gap-1.5 items-center">
                  <div className="w-20">
                    <RHFInputCell fieldName={`${name}.detail.proportionPct`} inputType="number" />
                  </div>
                  <span>% of</span>
                  <div className="w-32">
                    <RHFInputCell fieldName={`${name}.detail.refTargetId`} inputType="select" />
                  </div>
                </div>
              </div>
            </td>
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
