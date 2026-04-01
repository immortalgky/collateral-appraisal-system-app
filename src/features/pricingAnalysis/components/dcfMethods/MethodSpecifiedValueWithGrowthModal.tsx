import { RHFInputCell } from '../table/RHFInputCell';

export function MethodSpecifiedValueWithGrowthModal({ name }: { name: string }) {
  return (
    <div className="flex flex-row gap-1.5 items-center">
      <span className={'w-56'}>First year amount</span>
      <div className={'w-44'}>
        <RHFInputCell fieldName={`${name}.firstYearAmt`} inputType={'number'} />
      </div>
      <span className={''}>increase</span>
      <div className="w-24">
        <RHFInputCell fieldName={`${name}.increaseRatePct`} inputType={'number'} />
      </div>
      <span className={''}>% every</span>
      <div className="w-24">
        <RHFInputCell fieldName={`${name}.increaseRateYrs`} inputType={'number'} />
      </div>
      <span className={''}>year(s)</span>
    </div>
  );
}
