import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { MethodSpecifiedRoomIncomeWithGrowthWrapper } from '../../../types/dcf';

interface MethodSpecifiedRoomIncomeWithGrowthProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedRoomIncomeWithGrowthWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodSpecifiedRoomIncomeWithGrowth({
  expanded,
  method,
  baseStyles,
}: MethodSpecifiedRoomIncomeWithGrowthProps) {
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
              <span>{t('dcf.common.roomsCount', { count: method.detail?.saleableArea ?? 0 })}</span>
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
