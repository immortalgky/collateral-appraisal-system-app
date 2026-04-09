import { RHFInputCell } from '../../table/RHFInputCell';
import { getDCFFilteredAssumptions } from '../../../domain/getDCFFilteredAssumptions';
import type { DCFSection } from '../../../types/dcf';
import type { UseFormGetValues } from 'react-hook-form';
import type { FormValues } from '@/features/appraisal/components/tables/bType';
import { buildMethodProportionOptions } from '@/features/pricingAnalysis/domain/dcf/buildMethodProportionOptions';

export function MethodProportionModal({
  assumptionType,
  name,
  getOuterFormValues,
}: {
  assumptionType: string;
  name: string;
  getOuterFormValues: UseFormGetValues<FormValues>;
}) {
  const sections = (getOuterFormValues('sections') ?? []).filter(
    (s: DCFSection) => s.identifier !== 'empty',
  );

  const assumptions = getDCFFilteredAssumptions(
    getOuterFormValues,
    a => assumptionType !== a.assumptionType,
  );

  const refTargetOptions = buildMethodProportionOptions({
    sections,
    assumptions,
  });

  return (
    <div className="flex flex-row gap-1.5 items-center">
      <span className={'w-44'}>Proportions</span>
      <div className={'w-44'}>
        <RHFInputCell
          fieldName={`${name}.proportionPct`}
          inputType={'number'}
          number={{
            decimalPlaces: 2,
            maxIntegerDigits: 3,
            allowNegative: false,
          }}
        />
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={''}>% of</span>
        <div className="w-64">
          <RHFInputCell
            fieldName={`${name}.refTarget.clientId`}
            inputType={'select'}
            options={refTargetOptions}
          />
        </div>
      </div>
    </div>
  );
}
