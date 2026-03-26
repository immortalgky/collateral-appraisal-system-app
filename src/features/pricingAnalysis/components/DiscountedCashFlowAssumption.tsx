import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { DiscountedCashFlowMethodRenderer } from './DiscountedCashFlowMethodRenderer';
import { useDerivedFields, type DerivedFieldRule } from '../adapters/useDerivedFieldArray';
import { RHFInputCell } from './table/RHFInputCell';
import type { DCFAssumption } from '../types/dcf';
import { assumptionParams, methodParams } from '../data/dcfParameters';

interface DiscountedCashFlowAssumptionProps {
  name: string;
  totalNumberOfYears: number;
  assumption: DCFAssumption;
  editing: string | null;
  onCancelEditMode: () => void;
  onOpenEditMode: (assumptionType: string) => void;
  onRemoveAssumption: () => void;
}

export function DiscountedCashFlowAssumption({
  name,
  totalNumberOfYears,
  assumption,
  editing,
  onCancelEditMode,
  onOpenEditMode,
  onRemoveAssumption,
}: DiscountedCashFlowAssumptionProps) {
  const [expanded, setExpanded] = useState(false);

  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.totalAssumptionValues.${idx}`,
          deps: [`${name}.method.totalMethodValues.${idx}`],
          compute: ({ getValues }) => {
            const totalMethodValue = getValues(`${name}.method.totalMethodValues.${idx}`) ?? 0;
            return Number(totalMethodValue);
          },
        },
      ];
    });
  }, [name, totalNumberOfYears]);
  useDerivedFields({ rules });

  return (
    <>
      <tr>
        <td
          className={clsx(
            'flex flex-row items-center justify-between px-1 py-1.5 pl-15 gap-1.5',
            'text-sm',
            'text-right',
            'bg-white',
            'border-b border-gray-300',
          )}
        >
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex flex-row gap-1.5 cursor-pointer"
          >
            <Icon
              name="chevron-down"
              style="solid"
              className={clsx(
                'size-2 transition-transform duration-300 ease-in-out shrink-0',
                expanded ? 'rotate-180' : '',
              )}
            />
            <RHFInputCell
              fieldName={`${name}.assumptionType`}
              inputType="display"
              accessor={({ value }) => (
                <span
                  className="truncate"
                  title={assumptionParams.find(p => p.code === value)?.description ?? ''}
                >
                  {assumptionParams.find(p => p.code === value)?.description ?? ''}
                </span>
              )}
            />
          </button>
          <div className="flex flex-row w-full gap-1.5 items-center justify-end">
            <RHFInputCell
              fieldName={`${name}.method.methodType`}
              inputType="display"
              accessor={({ value }) => (
                <span
                  className="truncate"
                  title={methodParams.find(p => p.code === value)?.description ?? ''}
                >
                  {methodParams.find(p => p.code === value)?.description ?? ''}
                </span>
              )}
            />
            <button
              type="button"
              className="flex justify-center items-center gap-2 p-1.5 border border-dashed border-primary text-primary rounded-lg hover:bg-primary/10 duration-200 transition-all cursor-pointer font-medium"
              onClick={() => {
                onOpenEditMode(assumption.clientId);
              }}
            >
              <Icon name="pencil" style="regular" className="size-4" />
            </button>
            <button
              type="button"
              className="flex justify-center items-center gap-2 p-1.5 border border-dashed border-danger text-danger rounded-lg hover:bg-danger/10 duration-200 transition-all cursor-pointer font-medium"
              onClick={onRemoveAssumption}
            >
              <Icon name="trash" style="regular" className="size-4" />
            </button>
          </div>
        </td>
        {Array.from({ length: totalNumberOfYears }, (_, index) => {
          return (
            <td
              key={index}
              className={clsx(
                'px-1.5 py-1.5 text-right border-b border-gray-300 text-sm',
                // color.badge,
                'bg-white',
              )}
            >
              <RHFInputCell
                fieldName={`${name}.totalAssumptionValues.${index}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      <DiscountedCashFlowMethodRenderer
        name={`${name}.method`}
        editing={editing}
        expanded={expanded}
        assumptionId={assumption.clientId}
        assumptionName={assumption.assumptionName}
        method={assumption.method}
        totalNumberOfYear={totalNumberOfYears}
        onCancelEditMode={onCancelEditMode}
      />
    </>
  );
}
