import { RHFInputCell } from '../../table/RHFInputCell';
import clsx from 'clsx';
import type { MethodProportionOfTheNewReplacementCostWrapper } from '../../../types/dcf';
interface MethodProportionOfTheNewReplacementCostProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodProportionOfTheNewReplacementCostWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly: boolean;
}
export function MethodProportionOfTheNewReplacementCost({
  name = '',
  expanded,
  totalNumberOfYears,
  method,
  baseStyles,
  isReadOnly,
}: MethodProportionOfTheNewReplacementCostProps) {
  return (
    <>
      {expanded && (
        <>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>New Replacement Cost</td>
            {Array.from({ length: totalNumberOfYears }).map((_, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <RHFInputCell
                    fieldName={`${name}.detail.newReplacementCost`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                    )}
                  />
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Increase Rate</td>
            {Array.from({ length: totalNumberOfYears }).map((_, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <RHFInputCell
                    fieldName={`${name}.detail.increaseRate.${idx}`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                    )}
                  />
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Total</td>
            {(method.detail?.proportionOfNewReplacementCosts ?? []).map((val, idx) => {
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
