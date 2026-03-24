import { useFieldArray, useFormContext } from 'react-hook-form';
import type { DCFMethodFormType } from '../../schemas/dcfForm';
import { DiscountedCashFlowMethodModal } from '../DiscountedCashFlowMethodModal';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { RHFInputCell } from '../table/RHFInputCell';
import { assumptionParams } from '../../data/dcfParameters';
import clsx from 'clsx';
import { formatFixed2 } from '../../domain/calculation';

interface MethodProportionProps {
  name: string;
  editing: string | null;
  expanded: boolean;
  assumptionId: string;
  assumptionName: string;
  method: DCFMethodFormType;
  totalNumberOfYears: number;
  onCancelEditMode: () => void;
}
export function MethodProportion({
  name = '',
  editing,
  expanded,
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYears,
  onCancelEditMode,
}: MethodProportionProps) {
  const { getValues, control } = useFormContext();
  const { fields } = useFieldArray({ control, name: name });

  const mapAssumptions = new Map(
    (getValues('sections') ?? []).flatMap(s => {
      return (s.categories ?? []).flatMap(c => {
        return (c.assumptions ?? []).map(a => {
          return [a.assumptionType, a];
        });
      });
    }),
  );

  const refAssumptionType = getValues(`${name}.detail.refAssumptionType`);
  const assumption = mapAssumptions.get(refAssumptionType);

  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.totalMethodValues.${idx}`,
          deps: [`${name}.detail.proportionPct`, `${name}.detail.refAssumption`],
          compute: ({ getValues, ctx }) => {
            const proportionPct = getValues(`${name}.detail.proportionPct`);
            const totalAssumptionValue = ctx.assumption?.totalAssumptionValues?.[idx] ?? 0;
            return formatFixed2((Number(proportionPct) / 100) * Number(totalAssumptionValue));
          },
        },
      ];
    });
  }, [fields]);
  useDerivedFields({ rules, ctx: { assumption } });

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
  const rowHeaderStyle = 'pl-20 px-1.5 h-12 text-sm text-gray-400';
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
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
    </>
  );
}
