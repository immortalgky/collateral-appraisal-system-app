import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { RHFInputCell } from '../../table/RHFInputCell';
import type { MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateWrapper } from '../../../types/dcf';

interface MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
  method: MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateWrapper;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
}
export function MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate({
  name = '',
  expanded,
  totalNumberOfYears,
  method,
  baseStyles,
  isReadOnly,
}: MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateProps) {
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
              {t('dcf.methods.roomIncomeWithGrowthByOccupancyRate.incomeAdjustedByGrowthRate')}
            </td>
            {(method.detail?.roomIncomeAdjustedValuedByGrowthRates ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span className="text-right">{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
          <tr className="group transition-colors">
            <td colSpan={2} className={clsx(baseStyles.rowHeader)}>{t('dcf.common.occupancyRate')}</td>
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
              <span>{t('dcf.common.roomIncome')}</span>
              <span>{t('dcf.common.roomsCount', { count: method.detail?.saleableArea ?? 0 })}</span>
            </td>
            {(method.detail?.roomIncome ?? []).map((val, idx) => {
              return (
                <td key={idx} className={clsx(baseStyles.rowBody)}>
                  <span>{val ? val.toLocaleString() : 0}</span>
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
