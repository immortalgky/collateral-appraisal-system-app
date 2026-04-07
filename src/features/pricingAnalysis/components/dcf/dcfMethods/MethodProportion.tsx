import clsx from 'clsx';
import type { MethodProportionWrapper } from '../../../types/dcf';

interface MethodProportionProps {
  expanded: boolean;
  method: MethodProportionWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodProportion({ expanded, method, baseStyles }: MethodProportionProps) {
  return (
    <>
      {expanded && (
        <>
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
