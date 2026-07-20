import type { UseFormGetValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayPropsModalProps {
  name: string;
  isReadOnly?: boolean;
  getOuterFormValues: UseFormGetValues<any>;
}
export function MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayModal({
  name,
  isReadOnly,
  getOuterFormValues,
}: MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayPropsModalProps) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>{t('dcf.methods.foodAndBeverageExpenses.label')}</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.firstYearAmt`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
          />
        </div>
        <span className={''}>{t('dcf.methods.foodAndBeverageExpenses.unitPerRoomDay')}</span>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>{t('dcf.common.increase')}</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRatePct`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 2, maxIntegerDigits: 3, allowNegative: false }}
          />
        </div>
        <span className={''}>{t('dcf.common.percentEvery')}</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRateYrs`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 0, maxIntegerDigits: 3, maxValue: 100, allowNegative: false }}
          />
        </div>
        <span className={''}>{t('dcf.common.year')}</span>
      </div>
      <div className="flex flex-row gap-1.5">
        <span className={'w-56'}>{t('dcf.common.startIn')}</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.startIn`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{
              decimalPlaces: 0,
              maxIntegerDigits: 3,
              maxValue: getOuterFormValues('totalNumberOfYears') ?? 100,
              allowNegative: false,
            }}
          />
        </div>
        <span className={''}>{t('dcf.common.year')}</span>
      </div>
    </div>
  );
}
