/**
 * BulkRcnReferenceDialog
 *
 * The RCN column header's "pull from WQS" affordance: one row per machine, a per-machine
 * source dropdown, one apply action. mock:1861 emits the header chip (`.thref`) and
 * mock:1825 (`bulkHtml`) is the dialog this mirrors.
 *
 * Copy-only, deliberately. mock:1818 records the user's decision of 19/09/2569 —
 * "ข้อมูลอ้างอิง = คัดลอกราคาไปใช้เท่านั้น ไม่เก็บลิงก์ว่าช่องไหนใช้อ้างอิงไหน" — and mock:1820's
 * `refField` then forces `linked = false`, so the mock's own `mcLinked` map and its
 * `ติดลิงก์แล้ว` chip are dead code from an earlier design round. Applying a value here is a
 * plain setValue in the caller, exactly what the per-cell MarketReferenceButton already does.
 * Nothing records which reference a figure came from.
 *
 * The value applied is a method's `valuePerUnit`, not its `finalValue` — same field
 * MarketReferenceList applies (see its apply button).
 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Icon } from '@/shared/components';
import { PricingAnalysisSubjectType, useGetReferencesForAnchors } from '../api/references';
import { formatNumber, methodTypeLabel } from './MarketReferenceList';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BulkRcnTargetRow {
  /** Index into the machineryCosts field array — what the caller writes the value back to. */
  rowIndex: number;
  /** Anchor for this machine's own saved references (subject = that machine). */
  appraisalPropertyId: string;
  machineName: string | null;
  /**
   * Set when the row cannot receive a value, and says why. The row is still LISTED — it is
   * shown disabled with this reason in place of the source dropdown. The mock drops locked
   * machines from the list entirely (mock:1830), which leaves the appraiser to work out for
   * themselves why a machine they can see in the table is missing from this dialog.
   */
  disabledReason?: ReactNode;
}

interface SourceOption {
  key: string;
  ownerRowIndex: number;
  label: string;
  /** null = the reference exists but has not been calculated; offered disabled, not hidden. */
  value: number | null;
}

interface BulkRcnReferenceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rows: BulkRcnTargetRow[];
  onApply: (applications: { rowIndex: number; value: number }[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BulkRcnReferenceDialog({
  isOpen,
  onClose,
  rows,
  onApply,
}: BulkRcnReferenceDialogProps) {
  const { t } = useTranslation('pricingAnalysis');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [sourceByRow, setSourceByRow] = useState<Record<number, string>>({});

  // `isOpen` is the enable gate: a 40-machine table issues no requests until the picker is
  // actually opened. Same cache entries the per-cell WQS buttons already populate.
  const queries = useGetReferencesForAnchors(
    PricingAnalysisSubjectType.MachineryCostRef,
    rows.map(r => r.appraisalPropertyId),
    isOpen,
  );
  const isLoading = queries.some(q => q.isLoading);

  // One option per METHOD, not per machine: a machine may carry more than one reference and
  // each reference more than one method, and the mock's one-WQS-per-machine shape is a
  // property of its fixture rather than of the data.
  const sources: SourceOption[] = [];
  rows.forEach((row, i) => {
    for (const ref of queries[i]?.data?.references ?? []) {
      for (const method of ref.methods) {
        sources.push({
          key: `${row.rowIndex}:${method.methodId}`,
          ownerRowIndex: row.rowIndex,
          label: `${methodTypeLabel(method.methodType)} · ${row.rowIndex + 1}. ${row.machineName ?? ''}`,
          value: method.valuePerUnit,
        });
      }
    }
  });
  const usableSources = sources.filter(s => s.value != null);

  // A machine's OWN reference is still pre-picked — that is the machine's own figure, and the
  // mock pre-selects it (mock:1832 marks `k === i` selected).
  //
  // What is deliberately gone is the fallback to `usableSources[0]`: a machine with no reference
  // of its own used to open pre-pointed at a SIBLING machine's reference, so ticking and applying
  // copied one machine's replacement cost onto a different machine — visible only if you read the
  // row number in the option label. RCN is a money field, and with the per-cell WQS button now
  // removed this dialog is the only route to a value here, which made that default the path of
  // least resistance into a wrong number that looks computed. User ruling, 20/09/2569:
  // ตั้งต้นเป็นยังไม่เลือก. Choosing another machine's reference stays possible — it just has to
  // be chosen. Do not reintroduce an auto-pick that reaches outside the row's own machine.
  const NO_SOURCE = '';
  const sourceKeyFor = (rowIndex: number) =>
    sourceByRow[rowIndex] ??
    usableSources.find(s => s.ownerRowIndex === rowIndex)?.key ??
    NO_SOURCE;

  // A row with no chosen source is not applicable, so it does not count towards the Apply
  // button's enabled state either — the count the button acts on and the count it looks like it
  // will act on have to be the same number.
  const selectedRows = rows.filter(
    r =>
      r.disabledReason == null && checked[r.rowIndex] && sourceKeyFor(r.rowIndex) !== NO_SOURCE,
  );

  const handleClose = () => {
    setChecked({});
    setSourceByRow({});
    onClose();
  };

  const handleApply = () => {
    const applications = selectedRows.flatMap(row => {
      const source = sources.find(s => s.key === sourceKeyFor(row.rowIndex));
      return source?.value == null ? [] : [{ rowIndex: row.rowIndex, value: source.value }];
    });
    if (applications.length === 0) return;
    onApply(applications);
    toast.success(t('marketRef.bulk.applied', { count: applications.length }));
    handleClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-start justify-center p-4 pt-16">
          {/* mock:364 — the bulk popover is held to a 560px minimum by its rows. */}
          <DialogPanel
            transition
            className="w-full max-w-[560px] overflow-hidden rounded-xl bg-white shadow-xl transition-all duration-300 ease-out data-closed:scale-95 data-closed:opacity-0"
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name="link" style="solid" className="size-3.5" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  {t('marketRef.bulk.title')}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 transition-colors hover:text-gray-600"
                aria-label={t('marketRef.bulk.cancel')}
              >
                <Icon name="xmark" style="regular" className="size-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : usableSources.length === 0 ? (
                <p className="px-[12px] py-[10px] text-[12px] text-[#8a96a0]">
                  {t('marketRef.bulk.empty')}
                </p>
              ) : (
                <div className="py-1">
                  {rows.map(row => {
                    const isDisabled = row.disabledReason != null;
                    const hasSource = sourceKeyFor(row.rowIndex) !== NO_SOURCE;
                    const inputId = `bulk-rcn-${row.rowIndex}`;
                    return (
                      // mock:365 `.bulkrow` — grid auto/1fr/210px, 8px gap, 5px 8px padding,
                      // 12px text. Written in px because the 13px root would otherwise shrink
                      // every rem utility to 0.8125x.
                      <div
                        key={row.rowIndex}
                        className="grid grid-cols-[auto_1fr_210px] items-center gap-[8px] px-[8px] py-[5px] text-[12px]"
                      >
                        {/* Blocked rather than silently skipped at apply time: a tick that
                            quietly does nothing is the same class of lie as a guessed value.
                            The dropdown beside it states the reason, so the dead checkbox is
                            never unexplained. */}
                        <input
                          id={inputId}
                          type="checkbox"
                          disabled={isDisabled || !hasSource}
                          checked={!isDisabled && hasSource && !!checked[row.rowIndex]}
                          onChange={e =>
                            setChecked(prev => ({ ...prev, [row.rowIndex]: e.target.checked }))
                          }
                          className="size-[14px] accent-[#0d9488] disabled:cursor-not-allowed"
                        />
                        <label
                          htmlFor={inputId}
                          className={clsx(
                            'truncate',
                            isDisabled ? 'text-gray-400' : 'cursor-pointer text-gray-700',
                          )}
                        >
                          {row.rowIndex + 1}. {row.machineName ?? ''}
                        </label>
                        {isDisabled ? (
                          <span className="truncate text-[11px] text-amber-700">
                            {row.disabledReason}
                          </span>
                        ) : (
                          // mock:366 `.bulkrow .in` — 24px tall, left-aligned.
                          <select
                            value={sourceKeyFor(row.rowIndex)}
                            onChange={e =>
                              setSourceByRow(prev => ({ ...prev, [row.rowIndex]: e.target.value }))
                            }
                            aria-label={t('marketRef.bulk.sourceLabel', {
                              name: row.machineName ?? '',
                            })}
                            className="h-[24px] w-full rounded-[5px] border border-[#e3e9e8] bg-white px-[6px] text-left text-[12px] text-gray-700"
                          >
                            {/* A placeholder, not a source. This is what a machine with no
                                reference of its own now opens on, and it is also the row's
                                standing explanation for why its checkbox is dead. Disabled, so
                                it cannot be re-picked as though it were a value; to drop a row
                                from the batch, untick it. Distinct from the whole-dialog
                                marketRef.bulk.empty state, which says no usable reference exists
                                anywhere in the group. */}
                            <option value={NO_SOURCE} disabled>
                              {t('marketRef.bulk.noSourceSelected')}
                            </option>
                            {sources.map(source => (
                              // A reference with no calculated value is offered DISABLED rather
                              // than filtered out (which is what the mock does at mock:1827):
                              // silently missing, the appraiser cannot tell an uncalculated
                              // reference from one that was never created.
                              <option
                                key={source.key}
                                value={source.key}
                                disabled={source.value == null}
                              >
                                {source.value == null
                                  ? `${source.label} · ${t('marketRef.noValue')}`
                                  : `${source.label} · ${formatNumber(source.value)}`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
              >
                {t('marketRef.bulk.cancel')}
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={selectedRows.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Icon name="check" className="size-3" />
                {t('marketRef.bulk.apply')}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
