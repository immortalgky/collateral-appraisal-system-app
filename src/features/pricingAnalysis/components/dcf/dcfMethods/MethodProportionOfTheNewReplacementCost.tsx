import { RHFInputCell } from '../../table/RHFInputCell';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { MethodProportionOfTheNewReplacementCostWrapper } from '../../../types/dcf';
interface MethodProportionOfTheNewReplacementCostProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodProportionOfTheNewReplacementCostWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodProportionOfTheNewReplacementCost({
  name = '',
  expanded,
  totalNumberOfYears,
  method,
  baseStyles,
}: MethodProportionOfTheNewReplacementCostProps) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              {t('dcf.methods.proportionOfNewReplacementCost.newReplacementCost')}
            </td>
            {Array.from({ length: totalNumberOfYears }).map((_, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <RHFInputCell
                    fieldName={`${name}.detail.newReplacementCost`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                    )}
                  />
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>{t('dcf.common.increaseRate')}</td>
            {Array.from({ length: totalNumberOfYears }).map((_, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <RHFInputCell
                    fieldName={`${name}.detail.increaseRate.${idx}`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                    )}
                  />{' '}
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>{t('dcf.common.total')}</td>
            {(
              method.detail?.proportionOfNewReplacementCosts ??
              new Array<number>(totalNumberOfYears).fill(0)
            ).map((_val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <RHFInputCell
                    fieldName={`${name}.detail.totalMethodValues.${idx}`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                    )}
                  />
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
