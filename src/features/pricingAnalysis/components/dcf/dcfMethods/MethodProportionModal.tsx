import { RHFInputCell } from '../../table/RHFInputCell';
import { getDCFFilteredAssumptions } from '../../../domain/getDCFFilteredAssumptions';
import type { DCFSection } from '../../../types/dcf';
import type { UseFormGetValues } from 'react-hook-form';
import type { FormValues } from '@/features/appraisal/components/tables/bType';
import type { AssumptionEditDraft } from '../DiscountedCashFlowMethodModal';

export function MethodProportionModal({
  name,
  getOuterFormValues,
  initialData,
  isReadOnly,
}: {
  name: string;
  getOuterFormValues: UseFormGetValues<FormValues>;
  initialData: AssumptionEditDraft;
  isReadOnly?: boolean;
}) {
  const sections = (getOuterFormValues('sections') ?? []).filter(
    (s: DCFSection) => s.identifier !== 'empty',
  );

  const categories = (sections ?? [])
    .filter((s: DCFSection) => s.categories)
    .flatMap((s: DCFSection) => s.categories);

  const currAssumptionType = getOuterFormValues(name.split('.method'))?.[0];
  const assumptions = getDCFFilteredAssumptions(
    getOuterFormValues,
    a => currAssumptionType !== a.assumptionType,
  );

  const options = [
    ...sections.map(s => ({
      value: `section:${s.clientId}`,
      label: `Total - ${s.sectionName}`,
    })),
    ...categories.map(c => ({
      value: `category:${c.clientId}`,
      label: `Total - ${c.categoryName}`,
    })),
    ...assumptions
      .filter(a => a.assumption.clientId != initialData.targetAssumptionClientId)
      .map(a => ({
        value: `assumption:${a.assumption.clientId}`,
        label: `${a.section.sectionName} - ${a.assumption.assumptionName ?? ''}`,
      })),
  ];

  return (
    <div className="flex flex-row gap-1.5 items-center">
      <span className={'w-44'}>Proportions</span>
      <div className={'w-44'}>
        <RHFInputCell
          fieldName={`${name}.proportionPct`}
          inputType={'number'}
          disabled={isReadOnly}
        />
      </div>
      <div className="flex flex-row gap-1.5 items-center">
        <span className={''}>% of</span>
        <div className="w-64">
          <RHFInputCell
            fieldName={`${name}.refTarget.clientId`}
            inputType={'select'}
            options={options}
            dropdown={{ showValue: false }}
          />
        </div>
      </div>
    </div>
  );
}
