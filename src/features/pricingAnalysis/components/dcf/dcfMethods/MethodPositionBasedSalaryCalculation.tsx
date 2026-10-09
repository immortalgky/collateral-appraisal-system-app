import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { MethodPositionBasedSalaryCalculationWrapper } from '../../../types/dcf';

interface MethodPositionBasedSalaryCalculationProps {
  expanded: boolean;
  method: MethodPositionBasedSalaryCalculationWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodPositionBasedSalaryCalculation({
  expanded,
  method,
  baseStyles,
}: MethodPositionBasedSalaryCalculationProps) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    expanded && (
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
            <span>{t('dcf.common.total')}</span>
          </td>
          {(method.detail?.totalPositionBasedSalaryPerYear ?? []).map((val, idx) => {
            return (
              <td key={idx} className={clsx(baseStyles.rowBody)}>
                <span className="text-right">{val ? val.toLocaleString() : 0}</span>
              </td>
            );
          })}
        </tr>
      </>
    )
  );
}
