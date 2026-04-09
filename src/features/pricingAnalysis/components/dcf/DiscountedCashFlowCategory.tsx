import { Fragment, useMemo, useState } from 'react';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { DiscountedCashFlowAssumption } from './DiscountedCashFlowAssumption';
import type { SectionColor } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import { useFormContext } from 'react-hook-form';
import { type DCFAssumption, type DCFCategory, type DCFSection } from '../../types/dcf';
import { DiscountedCashFlowMethodModal } from './DiscountedCashFlowMethodModal';
import { useAssumptionManagement } from '../../domain/dcf/useAssumptionManagement';

interface DiscountedCashFlowCategoryProps {
  name: string;
  properties: Record<string, unknown>[];
  section: DCFSection;
  category: DCFCategory;
  totalNumberOfYears: number;
  color: SectionColor;
  baseStyles: { rowHeader: string; rowBody: string };
}

export function DiscountedCashFlowCategory({
  name,
  properties,
  section,
  category,
  totalNumberOfYears,
  color,
  baseStyles,
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

  const activeAssumption = fields
    .map((_, idx) => getValues(`${name}.assumptions.${idx}`) as DCFAssumption)
    .find(a => a?.clientId === editing);

  const modalInitialData = useMemo(() => {
    if (!activeAssumption) return null;

    return {
      targetSectionClientId: section.clientId,
      targetCategoryClientId: category.clientId,
      targetAssumptionClientId: activeAssumption.clientId,
      assumptionType: activeAssumption.assumptionType ?? null,
      assumptionName: activeAssumption.assumptionName ?? null,
      displayName: activeAssumption.assumptionName ?? null,
      method: activeAssumption.method ?? null,
    };
  }, [
    section.clientId,
    category.clientId,
    activeAssumption?.clientId,
    activeAssumption?.assumptionType,
    activeAssumption?.assumptionName,
    activeAssumption?.method,
  ]);

  const [isExpanded, setExpanded] = useState(true);

  return (
    <>
      <tr onClick={() => setExpanded(!isExpanded)} data-category={{ category: category }}>
        <td
          className={clsx(
            baseStyles.rowHeader,
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
              baseStyles.rowBody,
              isExpanded ? 'bg-gray-50 transition-colors duration-300' : '',
            )}
          >
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
            />
          )}

          <tr>
            <td className={clsx(baseStyles.rowHeader)}>
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
              <td key={index} className={clsx(baseStyles.rowBody)} />
            ))}
          </tr>
        </>
      )}
    </>
  );
}
