import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { MethodSpecifiedValueWithGrowthWrapper } from '../../../types/dcf';
import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedValueWithGrowthProps {
  name: string;
  expanded: boolean;
  method: MethodSpecifiedValueWithGrowthWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodSpecifiedValueWithGrowth({
  name,
  expanded,
  method,
  baseStyles,
  isReadOnly,
}: MethodSpecifiedValueWithGrowthProps) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              <div className="flex flex-row justify-between items-center gap-3">
                <span>{t('dcf.common.increaseRate')}</span>
                <div className="flex flex-row gap-1.5 items-center">
                  <span>{t('dcf.common.firstYearAmt')}</span>
                  <div className="w-32">
                    <RHFInputCell
                      fieldName={`${name}.detail.firstYearAmt`}
                      inputType="number"
                      disabled={isReadOnly}
                      number={{
                        decimalPlaces: 2,
                        maxIntegerDigits: 15,
                        allowNegative: false,
                      }}
                    />
                  </div>
                  <span>{t('dcf.common.growth')}</span>
                  <div className="w-20">
                    <RHFInputCell
                      fieldName={`${name}.detail.increaseRatePct`}
                      inputType="number"
                      disabled={isReadOnly}
                      number={{
                        decimalPlaces: 2,
                        maxIntegerDigits: 3,
                        allowNegative: false,
                      }}
                    />
                  </div>
                  <span>{t('dcf.common.percentEvery')}</span>
                  <div className="w-20">
                    <RHFInputCell
                      fieldName={`${name}.detail.increaseRateYrs`}
                      inputType="number"
                      disabled={isReadOnly}
                      number={{
                        decimalPlaces: 0,
                        maxIntegerDigits: 3,
                        maxValue: 100,
                        allowNegative: false,
                      }}
                    />
                  </div>
                  <span>{t('dcf.common.year')}</span>
                </div>
              </div>
            </td>
            {(method.detail?.increaseRates ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>{t('dcf.common.total')}</td>
            {(method.totalMethodValues ?? []).map((val, idx) => {
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
