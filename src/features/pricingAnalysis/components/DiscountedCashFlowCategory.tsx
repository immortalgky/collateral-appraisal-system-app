import { useMemo, useState } from 'react';
import type { DCFCategoryFormType } from '../schemas/dcfForm';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { DiscountedCashFlowAssumption } from './DiscountedCashFlowAssumption';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import { useDerivedFields, type DerivedFieldRule } from '../adapters/useDerivedFieldArray';
import { useFormContext, useWatch } from 'react-hook-form';
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
  const [expanded, setExpanded] = useState(false);

  const [editing, setEditing] = useState<string | null>(null);
  const handleOnCancelEditMode = () => {
    setEditing(null);
  };
  const handleOnOpenEditMode = (assumptionType: string) => {
    console.log(assumptionType);
    setEditing(assumptionType);
  };

  const { control } = useFormContext();
  const watchAssumptions = useWatch({ name: `${name}.assumptions`, control });
  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.totalCategoryValues.${idx}`,
          deps: [`${name}.totalMethoValue.${idx}`],
          compute: ({ getValues }) => {
            const assumptions = getValues(`${name}.assumptions`) ?? [];
            const totalCategoryValue = assumptions.reduce((prev, curr) => {
              console.log(`${idx}`, curr.totalAssumptionValues?.[idx]);
              return prev + Number(curr.totalAssumptionValues?.[idx] ?? 0);
            }, 0);
            return Number(totalCategoryValue);
          },
        },
      ];
    });
  }, [watchAssumptions]);
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
              />
            </td>
          );
        })}
      </tr>

      {/* Assumption rows */}
      {expanded &&
        (category?.assumptions ?? []).map((assumption, idx) => (
          <DiscountedCashFlowAssumption
            key={assumption.id}
            name={`${name}.assumptions.${idx}`}
            assumption={assumption}
            totalNumberOfYears={totalNumberOfYears}
            editing={editing}
            onOpenEditMode={handleOnOpenEditMode}
            onCancelEditMode={handleOnCancelEditMode}
            // color={color}
            // isLast={idx === category.assumptions.length - 1}
            // onEdit={() => onEditAssumption(assumption)}
          />
        ))}
    </>
  );
}
