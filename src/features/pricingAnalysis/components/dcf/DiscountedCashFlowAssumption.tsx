import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DiscountedCashFlowMethodRenderer } from './DiscountedCashFlowMethodRenderer';
import { useFormContext } from 'react-hook-form';
import { DisplayOnlyProvider, RHFInputCell } from '../table/RHFInputCell';
import type { DCFAssumption, DCFSection } from '../../types/dcf';
import { methodParams } from '../../data/dcfParameters';
import { dcfAssumptionSummary, resolveM13RefLabel } from '../../domain/dcf/dcfAssumptionSummary';
import { dcfAssumptionLabel } from '../../domain/dcf/dcfNameLabel';
import { STK2_CLASS_FLEX, STK_CLASS_FLEX, YEAR_CELL_CLASS } from './dcfTableCellStyles';

interface DiscountedCashFlowAssumptionProps {
  name: string;
  totalNumberOfYears: number;
  assumption: DCFAssumption;
  editing: string | null;
  onOpenEditMode: (assumptionType: string) => void;
  onRemoveAssumption: () => void;
  isReadOnly?: boolean;
}

export function DiscountedCashFlowAssumption({
  name,
  totalNumberOfYears,
  assumption,
  editing,
  onOpenEditMode,
  onRemoveAssumption,
  isReadOnly,
}: DiscountedCashFlowAssumptionProps) {
  const { t } = useTranslation('pricingAnalysis');
  // mock: rows start collapsed (▸) — the summary column carries the assumption; the
  // detail lines are a read-only breakdown, opened on demand.
  const [expanded, setExpanded] = useState(false);
  const { getValues } = useFormContext();
  const methodDesc =
    methodParams.find(p => p.code === assumption.method?.methodType)?.description ?? '';
  const refLabel = resolveM13RefLabel(t, (getValues('sections') ?? []) as DCFSection[], assumption);
  const summary = dcfAssumptionSummary(t, assumption.method, refLabel);

  return (
    <>
      {/* Two sticky columns (mock's asmrow: td.stk = item, td.stk2 = assumption) instead
          of one combined cell — td.stk gets the mock's extra 16px indent
          (`tr.asmrow td.stk{padding-left:16px}`, mock:682) since it now carries only the
          chevron + name, not the method summary/actions too. */}
      {/* Named group: ScrollableTableContainer's scroller is itself a `group`, so a bare
          group-hover would light up every row's icons while the pointer is anywhere over the
          table. */}
      <tr className="group/asm">
        <td className={clsx(STK_CLASS_FLEX, 'pl-4 bg-white')}>
          <div className="flex flex-row gap-1 items-center w-full min-w-0">
            {/* mock `.g.dcf .chevb` — borderless ▾/▸ glyph button, 16px wide, ink-3. */}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={t('aria.toggleAccordion')}
              className="shrink-0 w-4 mr-[2px] p-0 border-0 bg-transparent text-[#8a96a0] cursor-pointer"
            >
              {expanded ? '▾' : '▸'}
            </button>
            <RHFInputCell
              fieldName={`${name}.assumptionName`}
              inputType="display"
              accessor={({ value }) => {
                const raw = typeof value === 'string' ? value : '';
                const label = dcfAssumptionLabel(t, assumption.assumptionType, raw);
                // mock `.rowname` — the name opens the Edit Assumption modal.
                return (
                  <button
                    type="button"
                    onClick={() => onOpenEditMode(assumption.clientId)}
                    className="truncate text-left cursor-pointer hover:text-primary hover:underline min-w-0"
                    title={label}
                  >
                    {label}
                  </button>
                );
              }}
            />
          </div>
        </td>
        <td className={clsx(STK2_CLASS_FLEX, 'bg-white')}>
          <div className="relative flex flex-row items-center">
            <span
              className="truncate text-[11px] text-gray-500 min-w-0 flex-1"
              title={summary ? `${methodDesc}\n${summary}` : methodDesc}
            >
              {summary || methodDesc}
            </span>
            {!isReadOnly && (
              // mock `.g.dcf tr.asmrow .ib` — absolutely placed over the text's right end on a
              // white backing, so the summary keeps the full column when not hovered.
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-0.5 items-center bg-white pl-1 opacity-0 group-hover/asm:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  className="size-6 rounded-md inline-flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 cursor-pointer"
                  onClick={() => {
                    onOpenEditMode(assumption.clientId);
                  }}
                  aria-label={t('dcf.assumption.editAssumption')}
                >
                  <Icon name="pencil" style="regular" className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="size-6 rounded-md inline-flex items-center justify-center text-gray-500 hover:text-danger hover:bg-danger/10 cursor-pointer"
                  onClick={onRemoveAssumption}
                  aria-label={t('dcf.assumption.deleteAssumption')}
                >
                  <Icon name="trash" style="regular" className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </td>
        {Array.from({ length: totalNumberOfYears }, (_, index) => {
          return (
            <td key={index} className={clsx(YEAR_CELL_CLASS, 'bg-white')}>
              <RHFInputCell
                fieldName={`${name}.totalAssumptionValues.${index}`}
                inputType="display"
                accessor={({ value }) => (
                  <span className="text-right">{value ? value.toLocaleString() : 0}</span>
                )}
              />
            </td>
          );
        })}
      </tr>
      {/* Detail lines are a read-only breakdown (mock tr.dtl); edits go through the
          Edit Assumption modal. DisplayOnlyProvider turns every RHFInputCell inside the 14
          Method* rows into plain text without touching those components. */}
      <DisplayOnlyProvider value={true}>
        <DiscountedCashFlowMethodRenderer
          key={assumption.dbId ?? assumption.clientId}
          name={`${name}.method`}
          editing={editing}
          expanded={expanded}
          assumption={assumption}
          method={assumption.method}
          totalNumberOfYear={totalNumberOfYears}
          isReadOnly={isReadOnly}
        />
      </DisplayOnlyProvider>
    </>
  );
}
