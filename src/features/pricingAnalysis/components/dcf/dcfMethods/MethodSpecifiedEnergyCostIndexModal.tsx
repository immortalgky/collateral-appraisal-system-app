import { RHFInputCell } from '../../table/RHFInputCell';

interface MethodSpecifiedEnergyCostIndexModalProps {
  name: string;
}
export function MethodSpecifiedEnergyCostIndexModal({
  name,
}: MethodSpecifiedEnergyCostIndexModalProps) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Energy Cost Index</span>
        <div className={'w-44'}>
          <RHFInputCell fieldName={`${name}.energyCostIndex`} inputType={'number'} />
        </div>
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-56'}>Energy Cost Increase Rate</span>
        <div className="w-24">
          <RHFInputCell fieldName={`${name}.increaseRatePct`} inputType={'number'} />
        </div>
        <span className={''}>% every</span>
        <div className="w-24">
          <RHFInputCell fieldName={`${name}.increaseRateYrs`} inputType={'number'} />
        </div>
        <span className={''}>year(s)</span>
      </div>
    </div>
  );
}
