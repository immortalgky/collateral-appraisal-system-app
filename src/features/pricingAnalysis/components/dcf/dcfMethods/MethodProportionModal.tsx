import { RHFInputCell } from '../../table/RHFInputCell';
import { getDCFFilteredAssumptions } from '../../../domain/getDCFFilteredAssumptions';
import type { DCFSection } from '../../../types/dcf';
import { assumptionParams } from '../../../data/dcfParameters';
import type { UseFormGetValues } from 'react-hook-form';
import type { FormValues } from '@/features/appraisal/components/tables/bType';

interface MethodProportionModalProps {
  name: string;
  getOuterFormValues: UseFormGetValues<FormValues>;
  isReadOnly: boolean;
}
export function MethodProportionModal({
  name,
  getOuterFormValues,
  isReadOnly,
}: MethodProportionModalProps) {
  const sections = (getOuterFormValues('sections') ?? []).filter(
    (s: DCFSection) => s.identifier !== 'empty',
  );

  const categories = (sections ?? [])
    .filter((s: DCFSection) => s.categories)
    .flatMap((s: DCFSection) => s.categories);

  const currAssumptionType = getOuterFormValues(name.split('.method'))?.[0];
  const assumptions = getDCFFilteredAssumptions(
    sections,
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
    ...assumptions.map(a => ({
      value: `assumption:${a.assumption.clientId}`,
      label: `${a.section.sectionName} - ${a.assumption.assumptionName ? a.assumption.assumptionName : assumptionParams.find(p => p.code === a.assumption.assumptionType)?.description}`,
    })),
  ];

  return (
    <div className="flex flex-row gap-1.5 items-center">
      <span className={'w-80'}>Proportions</span>
      <div className={'w-44'}>
        <RHFInputCell
          fieldName={`${name}.proportionPct`}
          inputType={'number'}
          number={{ decimalPlaces: 2, maxIntegerDigits: 3, maxValue: 100, allowNegative: false }}
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
            disabled={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
