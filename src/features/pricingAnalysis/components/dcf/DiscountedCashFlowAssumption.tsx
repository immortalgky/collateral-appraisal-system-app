import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useState } from 'react';
import { DiscountedCashFlowMethodRenderer } from './DiscountedCashFlowMethodRenderer';
import { RHFInputCell } from '../table/RHFInputCell';
import type { DCFAssumption } from '../../types/dcf';
import { methodParams } from '../../data/dcfParameters';

interface DiscountedCashFlowAssumptionProps {
  name: string;
  totalNumberOfYears: number;
  assumption: DCFAssumption;
  editing: string | null;
  onOpenEditMode: (assumptionType: string) => void;
  onRemoveAssumption: () => void;
  isReadOnly?: boolean;
}

export function DiscountedCashFlowAssumption({
  name,
  totalNumberOfYears,
  assumption,
  editing,
  onOpenEditMode,
  onRemoveAssumption,
  isReadOnly,
}: DiscountedCashFlowAssumptionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="group">
        <td className="bg-white border-b border-gray-200">
          <div
            className={clsx(
              'text-xs text-right bg-white flex flex-row items-center justify-between px-1 py-0.5 pl-10 gap-4',
            )}
          >
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex flex-row gap-1.5 items-center cursor-pointer"
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
                fieldName={`${name}.assumptionName`}
                inputType="display"
                accessor={({ value }) => {
                  const label = typeof value === 'string' ? value : '';
                  return (
                    <span className="truncate" title={label}>
                      {label}
                    </span>
                  );
                }}
              />
            </button>
            <div className="flex gap-1 items-center justify-end">
              <RHFInputCell
                fieldName={`${name}.method.methodType`}
                inputType="display"
                accessor={({ value }) => {
                  const desc = methodParams.find(p => p.code === value)?.description ?? '';
                  return (
                    <span className="truncate text-[11px] text-gray-500" title={desc}>
                      {desc}
                    </span>
                  );
                }}
              />
              {!isReadOnly && (
                <div className="flex gap-0.5 items-center">
                  <button
                    type="button"
                    className="size-6 rounded-md inline-flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 cursor-pointer"
                    onClick={() => {
                      onOpenEditMode(assumption.clientId);
                    }}
                    aria-label="Edit assumption"
                  >
                    <Icon name="pencil" style="regular" className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="size-6 rounded-md inline-flex items-center justify-center text-gray-500 hover:text-danger hover:bg-danger/10 cursor-pointer"
                    onClick={onRemoveAssumption}
                    aria-label="Delete assumption"
                  >
                    <Icon name="trash" style="regular" className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </td>
        {Array.from({ length: totalNumberOfYears }, (_, index) => {
          return (
            <td
              key={index}
              className={clsx(
                'px-1 py-0.5 text-right border-b border-gray-200 text-xs',
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
        key={assumption.dbId ?? assumption.clientId}
        name={`${name}.method`}
        editing={editing}
        expanded={expanded}
        assumption={assumption}
        method={assumption.method}
        totalNumberOfYear={totalNumberOfYears}
        isReadOnly={isReadOnly}
      />
    </>
  );
}
