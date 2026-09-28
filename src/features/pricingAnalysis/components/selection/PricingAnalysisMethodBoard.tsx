import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Icon } from '@/shared/components';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import type { Approach, ManualCostBreakdownContext, MethodRole } from '../../types/selection';
import type { PricingAnalysisConfigType, MarketComparableDetailType } from '../../schemas';
import type { PropertyGroupItemDto } from '@features/appraisal/api';
import type { MethodKey } from '../../hooks/useSelectionActions';
import { PricingAnalysisMethodBoardRow } from './PricingAnalysisMethodBoardRow';
import { PricingAnalysisCostFormulaRow } from './PricingAnalysisCostFormulaRow';
import { AddMethodPopover } from './AddMethodPopover';
import { GroupReferencesSection } from '../GroupReferencesSection';

/** `openAddFor` sentinel for the no-approaches empty state — see its row below. Not a valid
 *  approachType, and cannot collide with one: no approach exists while that row renders. */
const OPEN_ADD_FOR_EMPTY = '__empty__';

interface PricingAnalysisMethodBoardProps {
  approaches: Approach[];
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  /** Approach type → candidate methods not yet added, from PricingAnalysisConfig. */
  configMethodsByApproach?: Map<string, PricingAnalysisConfigType['methods'] | undefined>;
  /** Full config, unfiltered — passed straight to AddMethodPopover, scoped per approach. */
  pricingConfiguration?: PricingAnalysisConfigType[];
  /** Adds one or more methods in one go — backs both the top bar's popover and this board's
   *  per-approach "+ เพิ่มวิธี" button (same AddMethodPopover, scoped to one approach here). */
  onAddMethods?: (picks: MethodKey[]) => Promise<{ succeeded: MethodKey[]; failed: MethodKey[] }>;
  onManualValueSync?: (arg: {
    approachType: string;
    methodType: string;
    value: number;
    methodId?: string;
  }) => void;
  /** Present only for the Cost approach in manual mode — see ManualCostBreakdown. */
  manualCostBreakdown?: ManualCostBreakdownContext;
  onSelectMethodRole?: (arg: {
    approachType: string;
    methodType: string;
    role: MethodRole;
  }) => void;
  /** Bound to `Method.remark` — see PricingAnalysisMethodBoardRow for the "fold into the same
   *  updateMethod call" contract and the empty-string-clears semantics. Undefined hides the
   *  editable note input (rows fall back to read-only display) rather than rendering one with
   *  nowhere to send what's typed. */
  onManualNoteSync?: (arg: {
    approachType: string;
    methodType: string;
    remark: string;
    methodId?: string;
  }) => void;
  disabled?: boolean;
  /** ข้อมูลอ้างอิง — rendered as the table's last group of rows (GroupReferencesSection
   *  returns bare <tr>s for exactly this). Undefined for model subjects. */
  references?: {
    pricingAnalysisId: string;
    groupMethods: Array<{ id?: string; methodType: string; label: string }>;
    groupProperties: PropertyGroupItemDto[];
    marketSurveys: MarketComparableDetailType[];
  };
}

/**
 * Summary-mode approach/method selector — a single table replacing the old 2-3 column card
 * grid (PricingAnalysisMethodCard viewLayout="grid") and its list variant. One row per
 * approach (pick it as the group's final value, "+ Add method"), followed by its method rows
 * (pick it as the approach's value, open it, delete it, manual value entry).
 *
 * Editing mode is untouched — it still renders PricingAnalysisApproachAccordion's simple
 * include/exclude list, a genuinely different step in the workflow (which methods exist on an
 * approach) from this board (which one is picked, and its value).
 */
export const PricingAnalysisMethodBoard = ({
  approaches,
  onSelectCalculationMethod,
  onSelectCandidateMethod,
  onSelectCandidateApproach,
  onDeleteMethod,
  configMethodsByApproach,
  pricingConfiguration,
  onAddMethods,
  onManualValueSync,
  manualCostBreakdown,
  onSelectMethodRole,
  onManualNoteSync,
  disabled = false,
  references,
}: PricingAnalysisMethodBoardProps) => {
  const { t } = useTranslation('pricingAnalysis');
  const isReadOnly = usePageReadOnly();
  const [openAddFor, setOpenAddFor] = useState<string | null>(null);

  return (
    <table
      className={clsx(
        'text-[12px] leading-[25px] w-full min-w-0 rounded-none',
        // Mock's `.g th, .g td` border spec (mock:133-137) — applied once here rather than
        // per-cell across this file, PricingAnalysisMethodBoardRow.tsx and
        // GroupReferencesSection.tsx, since all three render <tr>s into this one <table>.
        '[&_td]:border-b [&_td]:border-b-[#eef2f2] [&_td]:border-r [&_td]:border-r-[#eef2f2]',
        '[&_th]:border-r [&_th]:border-r-[#eef2f2]',
        // Header override (mock:138-141): darker bottom border, taller line-height.
        '[&_thead_th]:border-b [&_thead_th]:border-b-[#e3e9e8] [&_thead_th]:leading-[26px]',
      )}
    >
      {/* Sticky to the accordion's scroller: the board and the documents card share one
          scroll container (mock:3390), so without this the header scrolls away as soon as the
          user reaches for the card below. The background sits on the cells, not the row — a
          transparent sticky cell lets the rows show through as they pass underneath. */}
      <thead className="sticky top-0 z-20 [&_th]:bg-[#f8fafa]">
        <tr className="bg-[#f8fafa] text-left text-[#55636f]">
          <th className="px-[8px] py-0 w-[36px] font-medium whitespace-nowrap">
            {t('board.selectColumn')}
          </th>
          <th className="px-[8px] py-0 font-medium whitespace-nowrap">
            {t('board.approachMethodColumn')}
          </th>
          <th className="px-[8px] py-0 font-medium whitespace-nowrap">{t('board.statusColumn')}</th>
          <th className="px-[8px] py-0 text-right font-medium whitespace-nowrap">
            {t('board.valueColumn')}
          </th>
          <th className="px-[8px] py-0 font-medium whitespace-nowrap">
            {t('board.updatedColumn')}
          </th>
          <th className="px-[8px] py-0 whitespace-nowrap"></th>
        </tr>
      </thead>
      <tbody>
        {approaches.map(approach => {
          const availableMethods = (
            configMethodsByApproach?.get(approach.approachType) ?? []
          ).filter(cm => !approach.methods.some(m => m.methodType === cm.methodType));
          const isAddOpen = openAddFor === approach.approachType;

          return (
            <Fragment key={approach.approachType}>
              {/* Approach heading. Departs from the mock (mock:314-315, `.apr` = #f8fafa with a
                  border-top, `.on` = accent-wash) on the user's instruction, twice over:

                  1. DARKER, because the mock's #f8fafa is byte-identical to the sticky <thead>
                     above it — on a real board the two merged into one band and these stopped
                     reading as headings. Raising the fill wasn't enough on its own; the two had
                     to stop being the same colour.
                  2. GREY IN BOTH STATES, never the accent wash. Selected METHOD rows are already
                     green (`bg-primary/5`), so an accent-washed heading spoke the same language
                     as the rows under it and the eye could no longer tell a section from a
                     selection ("เวลาเลือกมันเป็นสีเขียวเลยดูแยกลำบาก"). The board now keeps one
                     rule: green means picked, grey means heading. Which approach is selected is
                     still carried by this row's own ticked checkbox.

                  Fill only — no border ("เอาแค่สีพื้นหลังไม่เอาขอบ"). The table's shared 1px
                  rules already draw every boundary this row needs. Both greys are existing
                  values in this feature (#edf1f1 the method-code chip, #e3e9e8 the thead's
                  bottom rule); the selected one is a half-step darker so the heading still
                  registers a state change without borrowing the accent. */}
              <tr
                className={clsx('h-[30px]', approach.isSelected ? 'bg-[#e3e9e8]' : 'bg-[#edf1f1]')}
              >
                <td className="px-[8px] py-0 border-r border-r-[#eef2f2] whitespace-nowrap">
                  {isReadOnly ? (
                    <div
                      className={clsx(
                        'size-3.5 rounded-sm border flex items-center justify-center shrink-0',
                        approach.isSelected ? 'bg-primary border-primary' : 'border-gray-300',
                      )}
                    >
                      {approach.isSelected && (
                        <Icon name="check" style="solid" className="size-2 text-white" />
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled || approach.methods.length === 0}
                      aria-label={approach.label}
                      onClick={() => onSelectCandidateApproach(approach.approachType)}
                      className={clsx(
                        'shrink-0',
                        disabled || approach.methods.length === 0
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer',
                      )}
                    >
                      <div
                        className={clsx(
                          'size-3.5 rounded-sm border flex items-center justify-center transition-all',
                          approach.isSelected
                            ? 'bg-primary border-primary'
                            : 'border-gray-300 hover:border-gray-400',
                        )}
                      >
                        {approach.isSelected && (
                          <Icon name="check" style="solid" className="size-2 text-white" />
                        )}
                      </div>
                    </button>
                  )}
                </td>
                <td className="px-[8px] py-0 border-r border-r-[#eef2f2]" colSpan={2}>
                  {/* Near-black, not the gray-800 the method rows' own labels use: the fill
                      change alone still left the heading the same weight of ink as the
                      content under it. #1f2937 is already this feature's darkest text. */}
                  <span className="font-semibold text-[#1f2937]">{approach.label}</span>{' '}
                  <span className="text-[#8a96a0]">
                    {t('board.methodCount', { count: approach.methods.length })}
                  </span>
                </td>
                <td className="px-[8px] py-0 text-right font-semibold border-r border-r-[#eef2f2] tabular-nums whitespace-nowrap">
                  {Number(approach.appraisalValue).toLocaleString()}
                </td>
                <td className="px-[8px] py-0 border-r border-r-[#eef2f2] whitespace-nowrap"></td>
                <td className="px-[8px] py-0 text-right whitespace-nowrap">
                  {!isReadOnly && onAddMethods && availableMethods.length > 0 && (
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        disabled={disabled}
                        className="text-primary text-[12px] font-medium hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => setOpenAddFor(isAddOpen ? null : approach.approachType)}
                      >
                        {t('board.addMethod')}
                      </button>
                      {/* Same popover as the top bar (AddMethodPopover), scoped to this one
                          approach — a single-entry pricingConfiguration array both restricts
                          the method list and (via its own `length > 1` check) suppresses the
                          approach-name group header, matching mock:3866-3867. */}
                      {isAddOpen && (
                        <AddMethodPopover
                          pricingConfiguration={
                            pricingConfiguration?.filter(
                              c => c.approachType === approach.approachType,
                            ) ?? []
                          }
                          addedApproaches={approaches.filter(
                            a => a.approachType === approach.approachType,
                          )}
                          onClose={() => setOpenAddFor(null)}
                          onAdd={onAddMethods}
                        />
                      )}
                    </div>
                  )}
                </td>
              </tr>

              {approach.methods.length === 0 && (
                <tr>
                  <td></td>
                  <td colSpan={5} className="px-[8px] py-0 text-[11.5px] text-[#8a96a0] italic">
                    {t('board.noMethods')}
                  </td>
                </tr>
              )}

              {approach.approachType === 'COSTAPPR' && (
                <PricingAnalysisCostFormulaRow methods={approach.methods} />
              )}

              {approach.methods.map(method => (
                <PricingAnalysisMethodBoardRow
                  key={method.methodType}
                  approachType={approach.approachType}
                  method={method}
                  onSelectCalculationMethod={onSelectCalculationMethod}
                  onSelectCandidateMethod={onSelectCandidateMethod}
                  onDeleteMethod={onDeleteMethod}
                  onManualValueSync={onManualValueSync}
                  manualCostBreakdown={
                    approach.approachType === 'COSTAPPR' ? manualCostBreakdown : undefined
                  }
                  onSelectMethodRole={onSelectMethodRole}
                  onManualNoteSync={onManualNoteSync}
                  disabled={disabled}
                />
              ))}
            </Fragment>
          );
        })}

        {/* Nothing added yet. Without this the table rendered its header, then the references
            band, and nothing in between — no way in, and no statement that anything was
            missing. The user asked for the add-method button to BE the empty state
            ("ตอนที่ยังไม่มี method/approach อะไรเราเพิ่มปุ่มเพิ่มวิธีเป็น empty state ได้ไหม").

            Unscoped on purpose. Every other "+ เพิ่มวิธี" on this board is filtered to one
            approach, but there is no approach to scope to here — so this passes the whole
            configuration and the whole (empty) added list, exactly as the top bar's own copy
            does. The popover then shows its approach-name group headers, which is what you
            want when picking the first method of all.

            OPEN_ADD_FOR_EMPTY reuses the existing `openAddFor` state rather than adding a
            second one. It is a sentinel, not an approachType: no real approach exists while
            this row is showing, so it can never collide with one. */}
        {approaches.length === 0 && !isReadOnly && onAddMethods && pricingConfiguration && (
          <tr className="h-[52px]">
            <td className="px-[8px] py-0 border-r border-r-[#eef2f2]"></td>
            <td colSpan={5} className="px-[8px] py-0">
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-[#8a96a0] italic">
                  {t('board.noApproaches')}
                </span>
                {/* Button then popover, same parent and nothing between them:
                    AddMethodPopover portals itself to <body> and finds its trigger via
                    `previousElementSibling` on its own in-place marker. */}
                <div className="relative inline-block text-left">
                  <button
                    type="button"
                    disabled={disabled}
                    className="text-primary text-[12px] font-medium hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() =>
                      setOpenAddFor(openAddFor === OPEN_ADD_FOR_EMPTY ? null : OPEN_ADD_FOR_EMPTY)
                    }
                  >
                    {t('board.addMethod')}
                  </button>
                  {openAddFor === OPEN_ADD_FOR_EMPTY && (
                    <AddMethodPopover
                      pricingConfiguration={pricingConfiguration}
                      addedApproaches={approaches}
                      onClose={() => setOpenAddFor(null)}
                      onAdd={onAddMethods}
                    />
                  )}
                </div>
              </div>
            </td>
          </tr>
        )}

        {references && (
          <GroupReferencesSection
            pricingAnalysisId={references.pricingAnalysisId}
            groupMethods={references.groupMethods}
            groupProperties={references.groupProperties}
          />
        )}
      </tbody>
    </table>
  );
};
