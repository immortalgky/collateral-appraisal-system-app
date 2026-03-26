import { Fragment, useMemo, useState } from 'react';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { DiscountedCashFlowAssumption } from './DiscountedCashFlowAssumption';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import { useDerivedFields, type DerivedFieldRule } from '../adapters/useDerivedFieldArray';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { RHFInputCell } from './table/RHFInputCell';
import { getNewId } from '../domain/getNewId';
import { type DCFAssumption, type DCFCategory, type DCFSection } from '../types/dcf';
import {
  DiscountedCashFlowMethodModal,
  type AssumptionEditDraft,
} from './DiscountedCashFlowMethodModal';
import { editAssumption } from '../domain/dcf/editAssumption';

interface DiscountedCashFlowCategoryProps {
  name: string;
  section: DCFSection;
  category: DCFCategory;
  totalNumberOfYears: number;
  color: SectionColor;
}

export function DiscountedCashFlowCategory({
  name,
  section,
  category,
  totalNumberOfYears,
  color,
}: DiscountedCashFlowCategoryProps) {
  const { getValues, setValue, control } = useFormContext();
  const { append, remove } = useFieldArray({ name: `${name}.assumptions` });

  const watchedAssumptions =
    useWatch({
      control,
      name: `${name}.assumptions`,
    }) ?? [];
  const [expanded, setExpanded] = useState(true);

  const [editing, setEditing] = useState<string | null>(null);
  const handleOnCancelEditMode = () => {
    setEditing(null);
  };
  const handleOnOpenEditMode = (assumptionId: string) => {
    setEditing(assumptionId);
  };

  const handleOnSaveEditMode = (draft: AssumptionEditDraft) => {
    const nextSections = editAssumption(getValues('sections'), draft);
    setValue('sections', nextSections, {
      shouldDirty: false,
      shouldValidate: true,
    });
  };

  const handleOnAddAssumption = () => {
    const assumptionLength = getValues(`${name}.assumptions`).length ?? null;
    const newAssumptionId = getNewId();
    append({
      clientId: newAssumptionId,
      assumptionType: null,
      displaySeq: assumptionLength,
      method: { id: getNewId(), methodType: null },
    });
    setEditing(newAssumptionId);
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

  const rowHeaderStyle = 'pl-8 px-1 py-1.5 h-12 text-sm border-b border-gray-300';
  const rowBodyStyle = 'pl-8 px-1.5 py-1.5 h-12 text-sm text-right border-b border-gray-300';
  const rowStyle = 'cursor-pointer bg-white';

  return (
    <>
      {/* Category header */}
      <tr className={clsx(rowStyle)} onClick={() => setExpanded(!expanded)}>
        <td
          className={clsx(
            rowHeaderStyle,
            expanded ? 'bg-gray-50 transition-colors duration-300' : '',
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
                rowBodyStyle,
                expanded ? 'bg-gray-50 transition-colors duration-300' : '',
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
          {fields.map((field, idx) => {
            const assumption = watchedAssumptions[idx];

            return (
              <Fragment key={field.id}>
                <DiscountedCashFlowAssumption
                  name={`${name}.assumptions.${idx}`}
                  assumption={assumption}
                  totalNumberOfYears={totalNumberOfYears}
                  editing={editing}
                  onOpenEditMode={handleOnOpenEditMode}
                  onCancelEditMode={handleOnCancelEditMode}
                  onRemoveAssumption={() => handleOnRemoveAssumption(idx)}
                />

                {editing === assumption?.clientId && (
                  <DiscountedCashFlowMethodModal
                    name={`${name}.assumptions.${idx}.method`}
                    assumptionName={assumption?.assumptionName}
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
                  onClick={() => handleOnAddAssumption()}
                  className="px-1.5 py-1.5 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                >
                  + Add Assumption
                </button>
              </div>
            </td>
            {Array.from({ length: totalNumberOfYears }, (_, index) => {
              return <td key={index} className={clsx(rowBodyStyle)}></td>;
            })}
          </tr>
        </>
      )}
    </>
  );
}
