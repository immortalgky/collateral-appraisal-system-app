import { useState } from 'react';
import type { DCFCategoryFormType } from '../schemas/dcfForm';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { DiscountedCashFlowAssumption } from './DiscountedCashFlowAssumption';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';

interface DiscountedCashFlowCategoryProps {
  category: DCFCategoryFormType;
  totalNumberOfYears: number;
  color: SectionColor;
  onEditAssumption: () => void;
}

export function DiscountedCashFlowCategory({
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
              {category.totalCategoryValues?.[index].value ?? 0}
            </td>
          );
        })}
      </tr>

      {/* Assumption rows */}
      {expanded &&
        (category?.assumptions ?? []).map((assumption, idx) => (
          <DiscountedCashFlowAssumption
            key={assumption.id}
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
