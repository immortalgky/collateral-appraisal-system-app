import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayPropsModalProps {
  name: string;
  isReadOnly?: boolean;
}
export function MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayModal({
  name,
  isReadOnly,
}: MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayPropsModalProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Food and Beverage Expenses</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.firstYearAmt`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
          />
        </div>
        <span className={''}>Baht/ Room/ Day</span>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Increase</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRatePct`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 2, maxIntegerDigits: 3, allowNegative: false }}
          />
        </div>
        <span className={''}>% every</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRateYrs`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{ decimalPlaces: 0, maxIntegerDigits: 3, maxValue: 100, allowNegative: false }}
          />
        </div>
        <span className={''}>year(s)</span>
      </div>
    </div>
  );
}
