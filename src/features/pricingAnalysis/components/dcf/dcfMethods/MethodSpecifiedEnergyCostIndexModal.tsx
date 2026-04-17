import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedEnergyCostIndexModalProps {
  name: string;
  isReadOnly?: boolean;
}
export function MethodSpecifiedEnergyCostIndexModal({
  name,
  isReadOnly,
}: MethodSpecifiedEnergyCostIndexModalProps) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Energy Cost Index</span>
        <div className={'w-44'}>
          <RHFInputCell fieldName={`${name}.energyCostIndex`} inputType={'number'} disabled={isReadOnly} />
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Energy Cost Increase Rate</span>
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
          <RHFInputCell fieldName={`${name}.increaseRateYrs`} inputType={'number'} disabled={isReadOnly} />
        </div>
        <span className={''}>year(s)</span>
      </div>
    </div>
  );
}
