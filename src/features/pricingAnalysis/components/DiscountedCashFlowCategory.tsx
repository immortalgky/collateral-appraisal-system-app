import { useState } from 'react';
import { DiscountedCashFlowAssumption } from './DiscountedCashFlowAssumption';
import type { DCFCategoryFormType } from '../schemas/dcfForm';
import type { SectionColor } from './DiscountedCashFlowScoringSection';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useFormContext } from 'react-hook-form';

interface DiscountedCashFlowCategoryProps {
  category: DCFCategoryFormType;
  color: SectionColor;
  onEditAssumption: () => void;
}

export function DiscountedCashFlowCategory({
  category,
  color,
  onEditAssumption,
}: DiscountedCashFlowCategoryProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      {/* Category header */}
      <tr style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setExpanded(!expanded)}>
        <td
          className={clsx(
            'flex flex-row items-center just px-1 py-1.5 pl-10 gap-1.5',
            'text-[13px]',
            color.text,
            'text-right',
            'bg-gray-50',
            'border-b border-gray-300',
          )}
        >
          <Icon
            name="chevron-down"
            style="solid"
            className={clsx(
              'size-2 transition-transform duration-300 ease-in-out shrink-0',
              expanded ? '' : 'rotate-180',
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
        </td>
        {(category?.totalCategoryValues ?? []).map((v, i) => (
          <td
            key={i}
            className={clsx(
              'px-1 py-1.5 text-right border-b border-gray-300 text-sm',
              color.badge,
              'bg-gray-50',
            )}
          >
            {v.value}
          </td>
        ))}
      </tr>

      {/* Assumption rows */}
      {expanded &&
        (category?.assumptions ?? []).map((assumption, idx) => (
          // <DiscountedCashFlowAssumption
          //   key={assumption.id}
          //   assumption={assumption}
          //   // color={color}
          //   // isLast={idx === category.assumptions.length - 1}
          //   // onEdit={() => onEditAssumption(assumption)}
          // />
          <></>
        ))}
    </>
  );
}
