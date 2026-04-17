import clsx from 'clsx';
import type { MethodSpecifiedEnergyCostIndexWrapper } from '../../../types/dcf';
import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedEnergyCostIndexProps {
  name: string;
  expanded: boolean;
  method: MethodSpecifiedEnergyCostIndexWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodSpecifiedEnergyCostIndex({
  name,
  expanded,
  method,
  baseStyles,
  isReadOnly,
}: MethodSpecifiedEnergyCostIndexProps) {
  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td className={clsx(baseStyles.rowHeader)}>
              <div className="flex flex-row gap-1.5 items-center">
                <span>Increase Rate - 1st year amt</span>
                <div className="w-32">
                  <RHFInputCell
                    fieldName={`${name}.detail.energyCostIndex`}
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
            </td>
            {(method.detail?.increaseRate ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
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
          <tr className="group transition-colors">
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
