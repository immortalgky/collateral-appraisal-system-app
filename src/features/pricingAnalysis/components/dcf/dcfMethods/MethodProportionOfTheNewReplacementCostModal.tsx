import type { UseFormGetValues } from 'react-hook-form';
import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodProportionOfTheNewReplacementCostModalProps {
  name: string;
  isReadOnly?: boolean;
  getOuterFormValues: UseFormGetValues<any>;
}
export function MethodProportionOfTheNewReplacementCostModal({
  name,
  isReadOnly,
  getOuterFormValues,
}: MethodProportionOfTheNewReplacementCostModalProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Proportions</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.proportionPct`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{
              decimalPlaces: 2,
              maxIntegerDigits: 3,
              allowNegative: false,
            }}
          />
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={''}>% of new replacement cost</span>
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Increase Rate</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRatePct`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{
              decimalPlaces: 2,
              maxIntegerDigits: 3,
              allowNegative: false,
            }}
          />
        </div>
        <span className={''}>% every</span>
        <div className="w-24">
          <RHFInputCell
            fieldName={`${name}.increaseRateYrs`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{
              decimalPlaces: 0,
              maxIntegerDigits: 3,
              maxValue: 100,
              allowNegative: false,
            }}
          />
        </div>
        <span className={''}>year(s)</span>
      </div>
      <div className="flex flex-row gap-1.5">
        <span className={'w-56'}>Start In</span>
        <div className={'w-44'}>
          <RHFInputCell
            fieldName={`${name}.startIn`}
            inputType={'number'}
            disabled={isReadOnly}
            number={{
              decimalPlaces: 2,
              maxIntegerDigits: 3,
              maxValue: getOuterFormValues('totalNumberOfYears') ?? 100,
              allowNegative: false,
            }}
          />
        </div>
        <span className={''}>year(s)</span>
      </div>
    </div>
  );
}
