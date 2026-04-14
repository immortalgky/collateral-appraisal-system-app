import clsx from 'clsx';
import type { MethodSpecifiedRoomIncomeWithGrowthWrapper } from '../../../types/dcf';

interface MethodSpecifiedRoomIncomeWithGrowthProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedRoomIncomeWithGrowthWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly: boolean;
}
export function MethodSpecifiedRoomIncomeWithGrowth({
  expanded,
  method,
  baseStyles,
  isReadOnly,
}: MethodSpecifiedRoomIncomeWithGrowthProps) {
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
              <span>({method.detail?.saleableArea ?? 0} rooms)</span>
            </td>
            {(method.detail?.roomIncome ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <div className="flex flex-row justify-end items-center">
                    <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                  </div>
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
