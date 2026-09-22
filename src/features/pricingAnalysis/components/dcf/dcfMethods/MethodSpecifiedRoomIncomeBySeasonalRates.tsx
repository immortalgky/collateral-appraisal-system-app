import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { RHFInputCell } from '../../table/RHFInputCell';
import type { MethodSpecifiedRoomIncomeBySeasonalRatesWrapper } from '../../../types/dcf';

interface MethodSpecifiedRoomIncomeBySeasonalRatesProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedRoomIncomeBySeasonalRatesWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodSpecifiedRoomIncomeBySeasonalRates({
  name,
  expanded,
  totalNumberOfYears,
  method,
  baseStyles,
  isReadOnly,
}: MethodSpecifiedRoomIncomeBySeasonalRatesProps) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <>
      {expanded && (
        <>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              <span>{t('dcf.common.saleableArea')}</span>
              <RHFInputCell
                fieldName={`${name}.detail.sumSaleableArea`}
                inputType="display"
                accessor={({ value }) => (
                  <span>{t('dcf.common.roomsCount', { count: value ?? 0 })}</span>
                )}
              />
            </td>
            {(method.detail?.saleableArea ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
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
                  <div className="flex flex-row justify-end items-center">
                    <div className="w-16">
                      <RHFInputCell
                        fieldName={`${name}.detail.occupancyRate.${idx}`}
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
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>{t('dcf.common.increaseRate')}</td>
            {(method.detail?.roomRateIncrease ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              {t('dcf.common.averageDailyRate')}
            </td>
            {(method.detail?.avgDailyRate ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>
              <span>{t('dcf.common.totalRoomIncome')}</span>
            </td>
            {(method.detail?.roomIncome ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val.toLocaleString() ?? 0}</span>
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
