import clsx from 'clsx';
import type { MethodSpecifiedRentalIncomePerMonthWrapper } from '../../../types/dcf';

interface MethodSpecifiedRentalIncomePerMonthProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedRentalIncomePerMonthWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly: boolean;
}
export function MethodSpecifiedRentalIncomePerMonth({
  expanded,
  method,
  baseStyles,
  isReadOnly,
}: MethodSpecifiedRentalIncomePerMonthProps) {
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
            {(method.detail?.roomIncome ?? []).map((val, idx) => {
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
