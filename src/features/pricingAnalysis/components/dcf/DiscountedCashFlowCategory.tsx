import { Fragment, useState } from 'react';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { DiscountedCashFlowAssumption } from './DiscountedCashFlowAssumption';
import type { SectionColor } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import { useFormContext } from 'react-hook-form';
import { type DCFAssumption, type DCFCategory, type DCFSection } from '../../types/dcf';
import { DiscountedCashFlowMethodModal } from './DiscountedCashFlowMethodModal';
import { useAssumptionManagement } from '../../domain/dcf/useAssumptionManagement';
import { useAssumptionEditor } from '../../domain/dcf/useAssumptionEditor';

interface DiscountedCashFlowCategoryProps {
  name: string;
  properties: Record<string, unknown>[];
  section: DCFSection;
  category: DCFCategory;
  totalNumberOfYears: number;
  color: SectionColor;
  baseStyles: { rowHeader: string; rowBody: string };
  isReadOnly?: boolean;
  onStructuralChange?: () => void;
}

export function DiscountedCashFlowCategory({
  name,
  properties,
  section,
  category,
  totalNumberOfYears,
  color,
  baseStyles,
  isReadOnly,
  onStructuralChange,
}: DiscountedCashFlowCategoryProps) {
  const { getValues, setValue, control } = useFormContext();

  const {
    fields,
    editing,
    activeAssumption,
    handleOnAddAssumption,
    handleOnRemoveAssumption,
    handleOnOpenEditMode,
    handleOnCancelEditMode,
    handleOnSaveEditMode,
  } = useAssumptionManagement({
    name,
    getValues,
    setValue,
    control,
    onStructuralChange,
  });

  const { modalInitialData } = useAssumptionEditor({ section, category, activeAssumption });

  const [isExpanded, setExpanded] = useState(true);

  return (
    <>
      <tr
        onClick={() => setExpanded(!isExpanded)}
        data-category={{ category: category }}
        className="cursor-pointer hover:bg-gray-50/60"
      >
        <td className={clsx(baseStyles.rowHeader)}>
          <div className="flex flex-row items-center gap-1.5">
            <Icon
              name="chevron-down"
              style="solid"
              className={clsx(
                'size-2 transition-transform duration-300 ease-in-out shrink-0',
                isExpanded ? 'rotate-180' : '',
              )}
            />
            {category?.categoryName ?? ''}
            <span
              className={clsx(
                'inline-flex items-center justify-center min-w-5 h-4 px-1 rounded text-[10px] font-semibold',
                color.textAccent,
                color.bg,
              )}
            >
              {fields.length}
            </span>
          </div>
        </td>
        {Array.from({ length: totalNumberOfYears }, (_, index) => (
          <td key={index} className={clsx(baseStyles.rowBody)}>
            <span>
              {category.totalCategoryValues?.[index]
                ? category.totalCategoryValues?.[index].toLocaleString()
                : 0}
            </span>
          </td>
        ))}
      </tr>

      {isExpanded && (
        <>
          {fields.map((field, idx) => {
            const assumption = getValues(`${name}.assumptions.${idx}`) as DCFAssumption;

            if (!assumption) return null;

            return (
              <Fragment key={assumption.dbId ?? assumption.clientId ?? field.id}>
                <DiscountedCashFlowAssumption
                  name={`${name}.assumptions.${idx}`}
                  editing={editing}
                  assumption={assumption}
                  totalNumberOfYears={totalNumberOfYears}
                  onOpenEditMode={handleOnOpenEditMode}
                  onRemoveAssumption={() => handleOnRemoveAssumption(idx)}
                  isReadOnly={isReadOnly}
                />
              </Fragment>
            );
          })}

          {editing && modalInitialData && (
            <DiscountedCashFlowMethodModal
              initialData={modalInitialData}
              properties={properties}
              getOuterFormValues={getValues}
              editing={editing}
              onCancelEditMode={handleOnCancelEditMode}
              onSaveEditMode={handleOnSaveEditMode}
              size="2xl"
              isReadOnly={isReadOnly}
            />
          )}

          {!isReadOnly && (
            <tr>
              <td className="border-b border-gray-200 bg-white">
                <div className="flex flex-row items-center pl-10 px-1 py-0.5">
                  <button
                    type="button"
                    onClick={handleOnAddAssumption}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-primary rounded-md border border-dashed border-primary/40 hover:bg-primary/10 cursor-pointer"
                  >
                    <Icon name="plus" style="solid" className="size-2.5" />
                    Add assumption
                  </button>
                </div>
              </td>
              {Array.from({ length: totalNumberOfYears }, (_, index) => (
                <td key={index} className="border-b border-gray-200 bg-white" />
              ))}
            </tr>
          )}
        </>
      )}
    </>
  );
}
