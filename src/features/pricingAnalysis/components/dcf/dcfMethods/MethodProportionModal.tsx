import { RHFInputCell } from '../../table/RHFInputCell';
import { getDCFFilteredAssumptions } from '../../../domain/getDCFFilteredAssumptions';
import type { DCFSection } from '../../../types/dcf';
import { mapDCFMethodCodeToSystemType } from '../../../domain/mapDCFMethodCodeToSystemType';
import { assumptionParams } from '../../../data/dcfParameters';

export function MethodProportionModal({
  name,
  getOuterFormValues,
}: {
  name: string;
  getOuterFormValues: (name: string) => object;
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
    ...assumptions.map(a => ({
      value: `assumption:${a.assumption.clientId}`,
      label: `${a.section.sectionName} - ${a.assumption.assumptionName ? a.assumption.assumptionName : assumptionParams.find(p => p.code === a.assumption.assumptionType)?.description}`,
    })),
  ];

  return (
    <div className="flex flex-row gap-1.5 items-center">
      <span className={'w-44'}>Proportions</span>
      <div className={'w-44'}>
        <RHFInputCell fieldName={`${name}.proportionPct`} inputType={'number'} />
      </div>
      <div className="flex flex-row gap-1.5">
        <span className={''}>% of</span>
        <div className="w-64">
          <RHFInputCell fieldName={`${name}.refTargetId`} inputType={'select'} options={options} />
        </div>
      </div>
    </div>
  );
}
