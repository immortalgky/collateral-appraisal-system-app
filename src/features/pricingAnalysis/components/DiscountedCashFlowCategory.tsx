import { Fragment, useEffect, useState } from 'react';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { DiscountedCashFlowAssumption } from './DiscountedCashFlowAssumption';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { RHFInputCell } from './table/RHFInputCell';
import { getNewId } from '../domain/getNewId';
import { type DCFAssumption, type DCFCategory, type DCFSection } from '../types/dcf';
import {
  DiscountedCashFlowMethodModal,
  type AssumptionEditDraft,
} from './DiscountedCashFlowMethodModal';
import { editAssumption } from '../domain/dcf/editAssumption';
import { useAssumptionManagement } from '../domain/dcf/useAssumptionManagement';

interface DiscountedCashFlowCategoryProps {
  name: string;
  property: Record<string, unknown> | undefined;
  section: DCFSection;
  category: DCFCategory;
  totalNumberOfYears: number;
  color: SectionColor;
}

export function DiscountedCashFlowCategory({
  name,
  property,
  section,
  category,
  totalNumberOfYears,
  color,
}: DiscountedCashFlowCategoryProps) {
  const { getValues, setValue, control } = useFormContext();

  const {
    fields,
    editing,
    handleOnAddAssumption,
    handleOnRemoveAssumption,
    handleOnOpenEditMode,
    handleOnCancelEditMode,
    handleOnSaveEditMode,
  } = useAssumptionManagement(name, getValues, setValue, control);

  const [isExpanded, setExpanded] = useState(true);

  const rowHeaderStyle = 'pl-8 px-1 py-1.5 h-12 text-sm border-b border-gray-300';
  const rowBodyStyle = 'pl-8 px-1.5 py-1.5 h-12 text-sm text-right border-b border-gray-300';
  const rowStyle = 'cursor-pointer bg-white';

  return (
    <>
      <tr className={clsx(rowStyle)} onClick={() => setExpanded(!isExpanded)}>
        <td
          className={clsx(
            rowHeaderStyle,
            isExpanded ? 'bg-gray-50 transition-colors duration-300' : '',
          )}
        >
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
                'flex items-center justify-center text-sm',
                color.textAccent,
                color.bg,
                'rounded-full w-6 h-6',
              )}
            >
              {fields.length}
            </span>
          </div>
        </td>
        {Array.from({ length: totalNumberOfYears }, (_, index) => (
          <td
            key={index}
            className={clsx(
              rowBodyStyle,
              isExpanded ? 'bg-gray-50 transition-colors duration-300' : '',
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
        ))}
      </tr>

      {isExpanded && (
        <>
          {fields.map((field, idx) => {
            const assumption = getValues(`${name}.assumptions.${idx}`) as DCFAssumption;

            if (!assumption) return null;

            return (
              <Fragment key={field.id}>
                <DiscountedCashFlowAssumption
                  name={`${name}.assumptions.${idx}`}
                  property={property}
                  editing={editing}
                  assumption={assumption}
                  totalNumberOfYears={totalNumberOfYears}
                  onOpenEditMode={handleOnOpenEditMode}
                  onRemoveAssumption={() => handleOnRemoveAssumption(idx)}
                />

                {editing === assumption?.clientId && (
                  <DiscountedCashFlowMethodModal
                    initialData={{
                      targetSectionClientId: section.clientId,
                      targetCategoryClientId: category.clientId,
                      targetAssumptionClientId: assumption?.clientId,
                      assumptionType: assumption?.assumptionType ?? null,
                      assumptionName: assumption?.assumptionName ?? null,
                      displayName: assumption?.assumptionName ?? null,
                      method: assumption?.method ?? null,
                    }}
                    getOuterFormValues={getValues}
                    editing={editing}
                    onCancelEditMode={handleOnCancelEditMode}
                    onSaveEditMode={handleOnSaveEditMode}
                    size="xl"
                  />
                )}
              </Fragment>
            );
          })}

          <tr>
            <td className={clsx(rowHeaderStyle)}>
              <div className="flex flex-row items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOnAddAssumption}
                  className="px-1.5 py-1.5 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                >
                  + Add Assumption
                </button>
              </div>
            </td>
            {Array.from({ length: totalNumberOfYears }, (_, index) => (
              <td key={index} className={clsx(rowBodyStyle)} />
            ))}
          </tr>
        </>
      )}
    </>
  );
}
