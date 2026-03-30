import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { useMemo } from 'react';
import { RHFInputCell, toNumber } from '../table/RHFInputCell';
import clsx from 'clsx';
interface MethodProportionOfTheNewReplacementCostProps {
  name: string;
  property: Record<string, unknown> | undefined;
  expanded: boolean;
  totalNumberOfYears: number;
}
export function MethodProportionOfTheNewReplacementCost({
  name = '',
  property,
  expanded,
  totalNumberOfYears,
}: MethodProportionOfTheNewReplacementCostProps) {
  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return [
      ...Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
        return [
          {
            targetPath: `${name}.detail.proportionOfNewReplacementCosts.${idx}`,
            deps: [`${name}.detail.proportionPct`, `${name}.detail.newReplacementCost`],
            compute: ({ getValues }) => {
              const proportionPct = getValues(`${name}.detail.proportionPct`) ?? 0;
              const newReplacementCost = getValues(`${name}.detail.newReplacementCost`) ?? 0;

              return toNumber((Number(proportionPct) / 100) * Number(newReplacementCost));
            },
          },
          {
            targetPath: `${name}.totalMethodValues.${idx}`,
            deps: [`${name}.detail.proportionOfNewReplacementCosts.${idx}`],
            compute: ({ getValues }) => {
              const proportionOfNewReplacementCost =
                getValues(`${name}.detail.proportionOfNewReplacementCosts.${idx}`) ?? 0;

              return proportionOfNewReplacementCost;
            },
          },
        ];
      }),
      {
        targetPath: `${name}.detail.newReplacementCost`,
        deps: [],
        compute: ({ ctx }) => {
          const depreciationDetails = ctx?.property?.depreciationDetails ?? null;

          if (!depreciationDetails) return 0;

          const newReplacementCost = depreciationDetails.reduce((prev, curr) => {
            const isBuilding = curr.isBuilding ?? false;
            const priceBeforeDepreciation = curr.priceBeforeDepreciation ?? 0;

            if (isBuilding) {
              return prev + priceBeforeDepreciation;
            }
            return prev;
          }, 0);

          return toNumber(newReplacementCost);
        },
      },
    ];
  }, [totalNumberOfYears, name]);

  useDerivedFields({ rules, ctx: { property } });

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
        <td className={clsx(rowHeaderStyle)}>New Replacement Cost</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.newReplacementCost`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? Number(value).toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Total</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className={clsx(rowBodyStyle)}>
              <RHFInputCell
                fieldName={`${name}.detail.proportionOfNewReplacementCosts.${idx}`}
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
