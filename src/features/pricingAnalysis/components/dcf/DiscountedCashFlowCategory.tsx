import { Fragment, useState } from 'react';
import clsx from 'clsx';
import { DiscountedCashFlowAssumption } from './DiscountedCashFlowAssumption';
import type { SectionColor } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import { useFormContext } from 'react-hook-form';
import { type DCFAssumption, type DCFCategory, type DCFSection } from '../../types/dcf';
import { DiscountedCashFlowMethodModal } from './DiscountedCashFlowMethodModal';
import { useAssumptionManagement } from '../../domain/dcf/useAssumptionManagement';
import { useAssumptionEditor } from '../../domain/dcf/useAssumptionEditor';
import { useTranslation } from 'react-i18next';
import { dcfCategoryLabel } from '../../domain/dcf/dcfNameLabel';
import { STKW_CLASS, STK_CLASS_FLEX, STK2_CLASS, YEAR_CELL_CLASS } from './dcfTableCellStyles';
import { DenseProvider } from '../table/RHFInputCell';

interface DiscountedCashFlowCategoryProps {
  name: string;
  properties: Record<string, unknown>[];
  section: DCFSection;
  category: DCFCategory;
  totalNumberOfYears: number;
  color: SectionColor;
  isReadOnly?: boolean;
  onStructuralChange?: () => void;
  incomeAnalysisId?: string;
  hostMethodId?: string;
  marketSurveys?: import('@/features/pricingAnalysis/schemas').MarketComparableDetailType[];
  ensureIncomeAnalysisId?: () => Promise<string | undefined>;
}

export function DiscountedCashFlowCategory({
  name,
  properties,
  section,
  category,
  totalNumberOfYears,
  isReadOnly,
  onStructuralChange,
  incomeAnalysisId,
  hostMethodId,
  marketSurveys,
  ensureIncomeAnalysisId,
}: DiscountedCashFlowCategoryProps) {
  const { t } = useTranslation('pricingAnalysis');
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
      {/* Category row — mock's catrow: two sticky cells (item with chevron/name/count,
          then an empty stk2 — categories have no "assumption" of their own), rather than
          a colspan'd wide cell. */}
      <tr
        onClick={() => setExpanded(!isExpanded)}
        data-category={{ category: category }}
        className="cursor-pointer hover:bg-gray-50/60"
      >
        <td className={clsx(STK_CLASS_FLEX, 'font-semibold')}>
          <div className="flex flex-row items-center gap-1.5">
            {/* mock `.g.dcf .chev2` — a ▾/▸ glyph, 10px wide, ink-3. */}
            <span className="inline-block w-[10px] shrink-0 text-[#8a96a0]" aria-hidden>
              {isExpanded ? '▾' : '▸'}
            </span>
            <span
              className="truncate"
              title={dcfCategoryLabel(t, category.categoryName, category?.categoryName ?? '')}
            >
              {dcfCategoryLabel(t, category.categoryName, category?.categoryName ?? '')}
            </span>
            <span
              className={clsx(
                // mock `.g.dcf .cnt` — neutral chip, not the section colour.
                'inline-flex items-center justify-center min-w-4 h-[15px] px-[5px] rounded-lg text-[10.5px] font-medium shrink-0 bg-[#edf1f1] text-[#55636f]',
              )}
            >
              {fields.length}
            </span>
          </div>
        </td>
        <td className={STK2_CLASS} />
        {Array.from({ length: totalNumberOfYears }, (_, index) => (
          <td key={index} className={YEAR_CELL_CLASS}>
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
            // Reset to non-dense: this is a spacious edit modal, not a table row — without
            // this it would inherit `dense` from DiscountedCashFlowTable's DenseProvider
            // (a React context value, unaffected by the modal's own DOM/portal placement).
            <DenseProvider value={false}>
              <DiscountedCashFlowMethodModal
                initialData={modalInitialData}
                properties={properties}
                getOuterFormValues={getValues}
                editing={editing}
                onCancelEditMode={handleOnCancelEditMode}
                onSaveEditMode={handleOnSaveEditMode}
                size="2xl"
                isReadOnly={isReadOnly}
                incomeAnalysisId={incomeAnalysisId}
                hostMethodId={hostMethodId}
                marketSurveys={marketSurveys}
                ensureIncomeAnalysisId={ensureIncomeAnalysisId}
              />
            </DenseProvider>
          )}

          {!isReadOnly && (
            <tr>
              {/* mock:2123 — `<td class="stkw" colspan="2">…</td><td colspan="${n}">`:
                  one wide sticky cell for the button, one plain cell spanning every year
                  column instead of N empty cells. */}
              <td colSpan={2} className={clsx(STKW_CLASS, 'bg-white')}>
                <div className="flex flex-row items-center h-[26px]">
                  <button
                    type="button"
                    onClick={handleOnAddAssumption}
                    // mock `.addrow` (mock:350): 11px, line-height 18px, padding 1px 8px →
                    // 22px tall, so it sits inside the 26px row. Without its own leading it
                    // inherited the cell's 25px and overflowed, clipping the dashed border.
                    className="inline-flex items-center px-[8px] py-[1px] text-[11px] leading-[18px] text-primary rounded-[6px] border border-dashed border-primary hover:bg-primary/10 cursor-pointer"
                  >
                    + {t('dcf.assumption.addAssumption')}
                  </button>
                </div>
              </td>
              <td colSpan={totalNumberOfYears} className="border-b border-gray-300 bg-white" />
            </tr>
          )}
        </>
      )}
    </>
  );
}
