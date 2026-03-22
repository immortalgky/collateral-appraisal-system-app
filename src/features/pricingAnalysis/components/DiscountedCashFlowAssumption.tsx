import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useState } from 'react';
import type { DCFAssumptionFormType } from '../schemas/dcfForm';
import { DiscountedCashFlowMethodRenderer } from './DiscountedCashFlowMethodRenderer';

interface DiscountedCashFlowAssumptionProps {
  totalNumberOfYears: number;
  assumption: DCFAssumptionFormType;
  editing: string | null;
  onCancelEditMode: () => void;
  onOpenEditMode: (assumptionType: string) => void;
}

export function DiscountedCashFlowAssumption({
  totalNumberOfYears,
  assumption,
  editing,
  onCancelEditMode,
  onOpenEditMode,
}: DiscountedCashFlowAssumptionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr>
        <td
          className={clsx(
            'flex flex-row items-center justify-between px-1 py-1.5 pl-15 gap-1.5',
            'text-sm',
            'text-right',
            'bg-gray-50',
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
            {assumption.assumptionName ?? ''}
          </button>
          <div className="flex flex-row gap-1.5 items-center justify-center">
            <span className={'text-sm'}>{assumption.method.methodType}</span>
            <button
              type="button"
              className="flex justify-center items-center gap-2 w-full p-1.5 border border-dashed border-primary text-primary rounded-lg hover:bg-primary/10 duration-200 transition-all cursor-pointer font-medium"
              onClick={() => {
                onOpenEditMode(assumption.method.methodType);
              }}
            >
              <Icon name="pencil" style="regular" className="size-4" />
            </button>
            <button
              type="button"
              className="flex justify-center items-center gap-2 w-full p-1.5 border border-dashed border-danger text-danger rounded-lg hover:bg-danger/10 duration-200 transition-all cursor-pointer font-medium"
              onClick={() => null}
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
                'bg-gray-50',
              )}
            >
              {assumption.totalAssumptionValues?.[index].value ?? 0}
            </td>
          );
        })}
      </tr>
      <DiscountedCashFlowMethodRenderer
        editing={editing}
        expanded={expanded}
        assumptionId={assumption.id}
        assumptionName={assumption.assumptionName}
        method={assumption.method}
        totalNumberOfYear={totalNumberOfYears}
        onCancelEditMode={onCancelEditMode}
      />
    </>
  );
}
