import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { MethodRoomCostBasedOnExpensesPerRoomPerDayWrapper } from '../../../types/dcf';

interface MethodRoomCostBasedOnExpensesPerRoomPerDayProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodRoomCostBasedOnExpensesPerRoomPerDayWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodRoomCostBasedOnExpensesPerRoomPerDay({
  expanded,
  method,
  baseStyles,
}: MethodRoomCostBasedOnExpensesPerRoomPerDayProps) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>{t('dcf.common.increaseRate')}</td>
            {(method.detail?.roomRateIncrease ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              <span>{t('dcf.common.roomIncome')}</span>
              <span>
                {t('dcf.common.roomsCount', {
                  count: method.detail?.sumSaleableArea ?? 0,
                })}
              </span>
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
