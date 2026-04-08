import type { MethodParameterBasedOnTierOfPropertyValueWrapper } from '@/features/pricingAnalysis/types/dcf';
import clsx from 'clsx';

interface MethodParameterBasedOnTierOfPrpertyValueProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodParameterBasedOnTierOfPropertyValueWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function MethodParameterBasedOnTierOfPropertyValue({
  expanded,
  method,
  totalNumberOfYears,
  baseStyles,
}: MethodParameterBasedOnTierOfPrpertyValueProps) {
  console.log(method);
  return (
    <>
      {expanded && (
        <>
          <tr>
            <td className={clsx(baseStyles.rowHeader)}>
              <span>Total</span>
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
