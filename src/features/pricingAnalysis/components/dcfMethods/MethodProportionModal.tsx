import { assumptionParams } from '../../data/dcfParameters';
import { RHFInputCell } from '../table/RHFInputCell';

export function MethodProportionModal({ name }: { name: string }) {
  return (
    <div className="flex flex-row gap-1.5 items-center">
      <span className={'w-44'}>Proportions</span>
      <div className={'w-44'}>
        <RHFInputCell fieldName={`${name}.proportionPct`} inputType={'number'} />
      </div>
      <div className="flex flex-row gap-1.5">
        <span className={''}>% of</span>
        <div className="w-44">
          <RHFInputCell
            fieldName={`${name}.refAssumptionType`}
            inputType={'select'}
            options={assumptionParams.map(param => ({
              value: param.code,
              label: param.description,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
