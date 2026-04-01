import { useFormContext, useWatch } from 'react-hook-form';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import clsx from 'clsx';
import type { DCFSection } from '../../types/dcf';

function resolveRefTarget(sections: DCFSection[], refTargetId: DcfRefTargetId | null | undefined) {
  if (!refTargetId) return null;

  const [kind, id] = refTargetId.split(':');

  if (kind === 'section') {
    const section = sections.find(s => s.clientId === id);
    return section ? section.totalSectionValues : null;
  }

  if (kind === 'category') {
    const category = sections.flatMap(s => s.categories ?? []).find(c => c.clientId === id);
    return category ? category.totalCategoryValues : null;
  }

  const assumption = sections
    .flatMap(s => s.categories ?? [])
    .flatMap(c => c.assumptions ?? [])
    .find(a => a.clientId === id);

  return assumption ? assumption.totalAssumptionValues : null;
}

interface MethodProportionProps {
  name: string;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodProportion({
  name = '',
  expanded,
  totalNumberOfYears,
}: MethodProportionProps) {
  const { getValues } = useFormContext();

  const refTargetId = useWatch({ name: `${name}.detail.refTargetId` });
  const watchSecions = useWatch({ name: 'sections' });

  const refTarget = useMemo(() => {
    return resolveRefTarget(getValues('sections'), refTargetId);
  }, [getValues, refTargetId, watchSecions]);

  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.totalMethodValues.${idx}`,
          deps: [`${name}.detail.proportionPct`, `${name}.detail.refAssumption`],
          compute: ({ getValues, ctx }) => {
            const proportionPct = getValues(`${name}.detail.proportionPct`);
            const totalAssumptionValue = ctx.refTarget?.[idx] ?? 0;
            return toNumber((Number(proportionPct) / 100) * Number(totalAssumptionValue));
          },
        },
      ];
    });
  }, [totalNumberOfYears, name]);

  useDerivedFields({ rules, ctx: { refTarget } });

  return (
    <>
      {expanded && (
        <MethodProportionTable name={`${name}`} totalNumberOfYear={totalNumberOfYears} />
      )}
    </>
  );
}

interface MethodProportionTable {
  name: string;
  totalNumberOfYear: number;
}
function MethodProportionTable({ name, totalNumberOfYear }: MethodProportionTable) {
  const rowHeaderStyle = 'pl-20 px-1.5 h-12 text-sm text-gray-500';
  const rowBodyStyle = 'px-1.5 h-12 text-sm text-right text-gray-500';

  return (
    <>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Total</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.totalMethodValues.${idx}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? Number(value).toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
    </>
  );
}
