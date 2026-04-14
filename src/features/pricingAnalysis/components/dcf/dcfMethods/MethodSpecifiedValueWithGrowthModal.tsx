import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedValueWithGrowthModalProps {
  name: string;
  isReadOnly: boolean;
}
export function MethodSpecifiedValueWithGrowthModal({
  name,
  isReadOnly,
}: MethodSpecifiedValueWithGrowthModalProps) {
  return (
    <div className="flex flex-row gap-1.5 items-center">
      <span className={'w-80'}>First year amount</span>
      <div className={'w-44'}>
        <RHFInputCell
          fieldName={`${name}.firstYearAmt`}
          inputType={'number'}
          number={{
            decimalPlaces: 2,
            maxIntegerDigits: 15,
            allowNegative: false,
          }}
          disabled={isReadOnly}
        />
      </div>
      <span className={''}>increase</span>
      <div className="w-24">
        <RHFInputCell
          fieldName={`${name}.increaseRatePct`}
          inputType={'number'}
          number={{
            decimalPlaces: 2,
            maxIntegerDigits: 3,
            allowNegative: false,
          }}
          disabled={isReadOnly}
        />
      </div>
      <span className={''}>% every</span>
      <div className="w-24">
        <RHFInputCell
          fieldName={`${name}.increaseRateYrs`}
          inputType={'number'}
          number={{
            decimalPlaces: 0,
            maxIntegerDigits: 3,
            maxValue: 100,
            allowNegative: false,
          }}
          disabled={isReadOnly}
        />
      </div>
      <span className={''}>year(s)</span>
    </div>
  );
}
