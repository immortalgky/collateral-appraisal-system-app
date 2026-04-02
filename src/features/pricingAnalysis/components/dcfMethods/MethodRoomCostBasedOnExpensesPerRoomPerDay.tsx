import clsx from 'clsx';
import type { MethodRoomCostBasedOnExpensesPerRoomPerDayWrapper } from '../../types/dcf';

interface MethodRoomCostBasedOnExpensesPerRoomPerDayProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodRoomCostBasedOnExpensesPerRoomPerDayWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodRoomCostBasedOnExpensesPerRoomPerDay({
  expanded,
  method,
  baseStyles,
}: MethodRoomCostBasedOnExpensesPerRoomPerDayProps) {
  return (
    <>
      {expanded && (
        <>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>Increase Rate</td>
            {(method.detail?.roomRateIncrease ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>
              <span>Room Income</span>
              <span>({method.detail?.sumSaleableArea ?? 0} rooms)</span>
            </td>
            {(method.detail?.roomExpense ?? []).map((val, idx) => {
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
