import { RHFInputCell } from '../table/RHFInputCell';

interface MethodProportionOfTheNewReplacementCostModalProps {
  name: string;
}
export function MethodProportionOfTheNewReplacementCostModal({
  name,
}: MethodProportionOfTheNewReplacementCostModalProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-1.5 items-center">
        <span className={'w-44'}>Proportions</span>
        <div className={'w-44'}>
          <RHFInputCell fieldName={`${name}.proportionPct`} inputType={'number'} />
        </div>
        <div className="flex flex-row gap-1.5">
          <span className={''}>% of new replacement cost</span>
        </div>
      </div>
    </div>
  );
}
