import { Fragment, useMemo, useState } from 'react';
import type { DCFCategoryFormType } from '../schemas/dcfForm';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { DiscountedCashFlowAssumption } from './DiscountedCashFlowAssumption';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import { useDerivedFields, type DerivedFieldRule } from '../adapters/useDerivedFieldArray';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { RHFInputCell } from './table/RHFInputCell';
import { DiscountedCashFlowMethodRenderer } from './DiscountedCashFlowMethodRenderer';
import { DiscountedCashFlowModalRenderer } from './DiscountedCashFlowMethodModalRenderer';
import { getNewId } from '../domain/getNewId';
import type { DCFCategory } from '../types/dcf';

interface DiscountedCashFlowCategoryProps {
  name: string;
  category: DCFCategory;
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
    append({ id: getNewId(), assumptionType: null, method: { id: getNewId(), methodType: null } });
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
          {(category?.assumptions ?? []).map((assumption, idx) => (
            <Fragment key={assumption.clientId ?? `${name}.assumptions.${idx}`}>
              <DiscountedCashFlowAssumption
                name={`${name}.assumptions.${idx}`}
                assumption={assumption}
                totalNumberOfYears={totalNumberOfYears}
                editing={editing}
                onOpenEditMode={handleOnOpenEditMode}
                onCancelEditMode={handleOnCancelEditMode}
                onRemoveAssumption={() => handleOnRemoveAssumption(idx)}
              />
              <DiscountedCashFlowModalRenderer
                name={`${name}.assumptions.${idx}.method`}
                assumptionName={assumption.assumptionName}
                method={assumption.method}
                totalNumberOfYear={totalNumberOfYears}
                editing={editing}
                onCancelEditMode={handleOnCancelEditMode}
              />
            </Fragment>
          ))}
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
