import clsx from 'clsx';
import type { MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayWrapper } from '../../../types/dcf';

interface MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay({
  expanded,
  method,
  baseStyles,
}: MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayProps) {
  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td className={clsx(baseStyles.rowHeader)}>Increase Rate</td>
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
              <span>Total Food and Beverage per Room per Day</span>
            </td>
            {(method.detail?.totalFoodAndBeveragePerRoomPerDay ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td className={clsx(baseStyles.rowHeader)}>
              <span>Total</span>
            </td>
            {(method.detail?.totalFoodAndBeveragePerRoomPerYear ?? []).map((val, idx) => {
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
