import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayPropsModalProps {
  name: string;
  isReadOnly: boolean;
}
export function MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayModal({
  name,
  isReadOnly,
}: MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayPropsModalProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-80'}>Food and Beverage Expenses</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.firstYearAmt`}
            inputType={'number'}
            number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
            disabled={isReadOnly}
          />
        </div>
        <span className={''}>Baht/ Room/ Day</span>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-80'}>Increase</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRatePct`}
            inputType={'number'}
            number={{ decimalPlaces: 2, maxIntegerDigits: 3, allowNegative: false }}
            disabled={isReadOnly}
          />
        </div>
        <span className={''}>% every</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRateYrs`}
            inputType={'number'}
            number={{ decimalPlaces: 0, maxIntegerDigits: 3, maxValue: 100, allowNegative: false }}
            disabled={isReadOnly}
          />
        </div>
        <span className={''}>year(s)</span>
      </div>
    </div>
  );
}
