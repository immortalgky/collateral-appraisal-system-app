import { useMemo, useState } from 'react';
import type { DCFCategoryFormType } from '../schemas/dcfForm';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { DiscountedCashFlowAssumption } from './DiscountedCashFlowAssumption';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import { useDerivedFields, type DerivedFieldRule } from '../adapters/useDerivedFieldArray';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { RHFInputCell } from './table/RHFInputCell';

interface DiscountedCashFlowCategoryProps {
  name: string;
  category: DCFCategoryFormType;
  totalNumberOfYears: number;
  color: SectionColor;
  onEditAssumption: () => void;
}

export function DiscountedCashFlowCategory({
  name,
  category,
  totalNumberOfYears,
  color,
  onEditAssumption,
}: DiscountedCashFlowCategoryProps) {
  const { append, remove } = useFieldArray({ name: `${name}.assumptions` });

  const [expanded, setExpanded] = useState(false);

  const [editing, setEditing] = useState<string | null>(null);
  const handleOnCancelEditMode = () => {
    setEditing(null);
  };
  const handleOnOpenEditMode = (assumptionType: string) => {
    setEditing(assumptionType);
  };

  const handleOnAddAssumption = () => {
    append({ assumptionType: null, method: { methodType: null } });
  };

  const handleOnRemoveAssumption = (index: number) => {
    remove(index);
  };

  const { fields } = useFieldArray({ name: `${name}.assumptions` });
  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.totalCategoryValues.${idx}`,
          deps: [`${name}.assumptions`],
          compute: ({ getValues }) => {
            const assumptions = getValues(`${name}.assumptions`) ?? [];
            const totalCategoryValue = assumptions.reduce((prev, curr) => {
              return prev + Number(curr.totalAssumptionValues?.[idx] ?? 0);
            }, 0);
            return Number(totalCategoryValue);
          },
        },
      ];
    });
  }, [fields]);
  useDerivedFields({ rules });

  return (
    <>
      {/* Category header */}
      <tr style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setExpanded(!expanded)}>
        <td
          className={clsx(
            'flex flex-row items-center justify-between px-1 py-1.5 pl-8 gap-1.5',
            'text-[13px]',
            color.text,
            'text-right',
            'bg-white',
            'border-b border-gray-300',
          )}
        >
          <div className="flex flex-row items-center gap-1.5">
            <Icon
              name="chevron-down"
              style="solid"
              className={clsx(
                'size-2 transition-transform duration-300 ease-in-out shrink-0',
                expanded ? 'rotate-180' : '',
              )}
            />
            {category?.categoryName ?? ''}
            <span
              className={clsx(
                'flex items-center justify-center text-sm',
                color.textAccent,
                color.bg,
                'rounded-full w-6 h-6',
              )}
            >
              {category?.assumptions?.length ?? 0}
            </span>
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
                fieldName={`${name}.totalCategoryValues.${index}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>

      {/* Assumption rows */}
      {expanded && (
        <>
          {(category?.assumptions ?? []).map((assumption, idx) => (
            <DiscountedCashFlowAssumption
              key={assumption.id}
              name={`${name}.assumptions.${idx}`}
              assumption={assumption}
              totalNumberOfYears={totalNumberOfYears}
              editing={editing}
              onOpenEditMode={handleOnOpenEditMode}
              onCancelEditMode={handleOnCancelEditMode}
              onRemoveAssumption={() => handleOnRemoveAssumption(idx)}
              // color={color}
              // isLast={idx === category.assumptions.length - 1}
              // onEdit={() => onEditAssumption(assumption)}
            />
          ))}
          <tr>
            <td
              className={clsx(
                'flex flex-row items-center justify-between px-1 py-1.5 pl-8 gap-1.5',
                'text-[13px]',
                color.text,
                'text-right',
                'bg-white',
                'border-b border-gray-300',
              )}
            >
              <div className="flex flex-row items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOnAddAssumption()}
                  className="px-1.5 py-1.5 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                >
                  + Add Assumption
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
                ></td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
