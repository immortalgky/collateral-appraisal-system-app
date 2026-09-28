import type { MethodParameterBasedOnTierOfPropertyValueWrapper } from '@/features/pricingAnalysis/types/dcf';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface MethodParameterBasedOnTierOfPrpertyValueProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodParameterBasedOnTierOfPropertyValueWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodParameterBasedOnTierOfPropertyValue({
  expanded,
  method,
  totalNumberOfYears,
  baseStyles,
}: MethodParameterBasedOnTierOfPrpertyValueProps) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              <span>{t('dcf.common.total')}</span>
            </td>
            {Array.from({ length: totalNumberOfYears }, (_, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>
                    {method.totalMethodValues?.[idx]
                      ? method.totalMethodValues?.[idx].toLocaleString()
                      : 0}
                  </span>
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
