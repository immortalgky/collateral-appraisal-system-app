import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { RHFInputCell } from '../../table/RHFInputCell';
import type { MethodSpecifiedRentalIncomePerSquareMeterWrapper } from '../../../types/dcf';

interface MethodSpecifiedRentalIncomePerSquareMeterProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedRentalIncomePerSquareMeterWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodSpecifiedRentalIncomePerSquareMeter({
  name,
  expanded,
  totalNumberOfYears,
  method,
  baseStyles,
  isReadOnly,
}: MethodSpecifiedRentalIncomePerSquareMeterProps) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>{t('dcf.common.saleableArea')}</td>
            {Array.from({ length: totalNumberOfYears }).map((_, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">
                    {method.detail?.sumSaleableArea
                      ? method.detail?.sumSaleableArea.toLocaleString()
                      : 0}
                  </span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              <div className="flex flex-row gap-1.5 items-center">
                <span>{t('dcf.common.occupancyRateFirstYearAmt')}</span>
                <div className="w-20">
                  <RHFInputCell
                    fieldName={`${name}.detail.occupancyRateFirstYearPct`}
                    inputType="number"
                    disabled={isReadOnly}
                    number={{
                      decimalPlaces: 2,
                      maxIntegerDigits: 3,
                      maxValue: 100,
                      allowNegative: false,
                    }}
                  />
                </div>
                <span>{t('dcf.common.percentGrowth')}</span>
                <div className="w-20">
                  <RHFInputCell
                    fieldName={`${name}.detail.occupancyRatePct`}
                    inputType="number"
                    disabled={isReadOnly}
                    number={{
                      decimalPlaces: 2,
                      maxIntegerDigits: 3,
                      maxValue: 100,
                      allowNegative: false,
                    }}
                  />
                </div>
                <span>{t('dcf.common.percentEvery')}</span>
                <div className="w-20">
                  <RHFInputCell
                    fieldName={`${name}.detail.occupancyRateYrs`}
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
            </td>
            {Array.from({ length: totalNumberOfYears }).map((_, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <div className="flex justify-end items-center">
                    <div className="flex justify-end items-center w-16">
                      <RHFInputCell
                        fieldName={`${name}.detail.occupancyRate.${idx}`}
                        inputType="number"
                        disabled={isReadOnly}
                        number={{
                          decimalPlaces: 2,
                          maxIntegerDigits: 3,
                          maxValue: 100,
                          minValue: 0,
                          allowNegative: false,
                        }}
                      />
                    </div>
                  </div>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              {t('dcf.common.totalNumberOfSaleableArea')}
            </td>
            {(method.detail?.totalSaleableAreaDeductByOccRate ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>{t('dcf.common.increaseRate')}</td>
            {(method.detail?.rentalRateIncrease ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className={clsx('text-right', val > 0 ? 'text-primary' : '')}>
                    {val ? val.toLocaleString() : 0}
                  </span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              {t('dcf.methods.rentalIncomePerSquareMeter.averageRentalRate')}
            </td>
            {(method.detail?.avgRentalRate ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              <span>{t('dcf.methods.rentalIncomePerSquareMeter.totalRentalIncome')}</span>
            </td>
            {(method.detail?.totalRentalIncome ?? []).map((val, idx) => {
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
