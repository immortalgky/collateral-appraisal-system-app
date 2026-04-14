import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodProportionOfTheNewReplacementCostModalProps {
  name: string;
  isReadOnly: boolean;
}
export function MethodProportionOfTheNewReplacementCostModal({
  name,
  isReadOnly,
}: MethodProportionOfTheNewReplacementCostModalProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-80'}>Proportions</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.proportionPct`}
            inputType={'number'}
            number={{
              decimalPlaces: 2,
              maxIntegerDigits: 3,
              allowNegative: false,
            }}
            disabled={isReadOnly}
          />
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={''}>% of new replacement cost</span>
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-80'}>Increase Rate</span>
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
    </div>
  );
}
