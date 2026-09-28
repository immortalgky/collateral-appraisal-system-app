import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('pricingAnalysis');
  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>{t('dcf.common.increaseRate')}</td>
            {(method.detail?.increaseRate ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              <span>{t('dcf.methods.foodAndBeverageExpenses.totalPerRoomPerDay')}</span>
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
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              <span>{t('dcf.common.total')}</span>
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
