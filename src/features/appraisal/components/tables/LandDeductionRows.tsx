import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useController, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import Input from '@/shared/components/Input';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { Dropdown, NumberInput } from '@/shared/components/inputs';
import FormBooleanToggle from '@/shared/components/inputs/FormBooleanToggle';
import { useBooleanToggleOptions } from '@/shared/components/inputs/toggleOptions';
import { FormTableCell, FormTableDash } from '@/shared/components/form';
import { useFormLayout } from '@/shared/components/form/formLayoutContext';
import { tableStyles } from '@/shared/components/form/table/styles';
import RowTrash from './RowTrash';
import RowDragHandle, { type HandleProps } from './RowDragHandle';
import { useFormReadOnly } from '@/shared/components/form/context';
import { sumColumn } from '@features/request/components/tables/formTableUtils';
import { formatNumber } from '@/shared/utils/formatUtils';
import { toRaiNganWa } from '../TitleFormView';

/** The columns of the deed table the ledger lines up under (`LandTitleTable`'s column keys). */
type LedgerColumn = { key: string };

/** The three deed columns (type, document, position) the reason and the remark run across. */
const BODY_KEYS = ['type', 'document', 'position'];

interface Slots {
  handle?: ReactNode;
  index?: ReactNode;
  body?: ReactNode;
  area?: ReactNode;
  action?: ReactNode;
}

/**
 * One entry per column of the deed table, so a deduction line has the deed table's own columns: the
 * number under "#", the reason and the remark across type..position, the amount under the area column,
 * the trash in the action column. `th` makes them header cells.
 */
function laid(columns: LedgerColumn[], slots: Slots) {
  const out: {
    key: string;
    colSpan?: number;
    kind?: 'index' | 'action';
    align?: 'end';
    content: ReactNode;
  }[] = [];
  for (let i = 0; i < columns.length; i += 1) {
    const { key } = columns[i];
    if (BODY_KEYS.includes(key)) {
      let end = i + 1;
      while (end < columns.length && BODY_KEYS.includes(columns[end].key)) end += 1;
      out.push({ key, colSpan: end - i, content: slots.body });
      i = end - 1;
    } else if (key === 'handle') out.push({ key, kind: 'action', content: slots.handle });
    else if (key === 'no') out.push({ key, kind: 'index', content: slots.index });
    else if (key === 'area') out.push({ key, align: 'end', content: slots.area });
    else if (key === 'actions') out.push({ key, kind: 'action', content: slots.action });
    else out.push({ key, content: null });
  }
  return out;
}

/** The reason takes its share of the deed columns, the remark the rest; stacked below 48rem. */
const BODY_GRID =
  'grid grid-cols-[minmax(0,38fr)_minmax(0,62fr)] gap-x-2 @max-[48rem]/form-shell:grid-cols-1 @max-[48rem]/form-shell:gap-y-1';

type DeductionData = { reasonCode?: string | null; areaInSqWa?: unknown; remark?: string | null };

type CellField = 'reasonCode' | 'areaInSqWa' | 'remark';

const NAME = 'landAreaDeductions';

/** One editable cell. `data-field` is the scroll target for its error. */
function DeductionCell({ index, field }: { index: number; field: CellField }) {
  const { control } = useFormContext();
  const path = `${NAME}.${index}.${field}`;
  const { field: f, fieldState } = useController({ name: path, control });
  const error = fieldState.error?.message;
  return (
    <div data-field={path} className="min-w-0">
      {field === 'reasonCode' && (
        <Dropdown {...f} cell group="LandAreaDeductionReason" error={error} />
      )}
      {field === 'areaInSqWa' && (
        <NumberInput
          {...f}
          cell
          decimalPlaces={2}
          maxIntegerDigits={8}
          error={error}
          className="text-right"
        />
      )}
      {field === 'remark' && <Input {...f} cell maxLength={4000} error={error} />}
    </div>
  );
}

const LINK =
  'text-xs font-semibold text-(--palette-accent-ink) hover:underline disabled:cursor-not-allowed disabled:opacity-40';

/** A deduction line that can be dragged by its handle only, the same as a deed row. */
function SortableDeductionRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (handle: HandleProps) => ReactNode;
}) {
  const sortable = useSortable({ id, disabled, animateLayoutChanges: () => false });
  const handle = useSortableHandle(sortable);
  return (
    <tr
      ref={sortable.setNodeRef}
      className="group/row"
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
        position: 'relative',
        zIndex: sortable.isDragging ? 20 : undefined,
        opacity: sortable.isDragging ? 0.6 : undefined,
      }}
    >
      {children(handle)}
    </tr>
  );
}

/** The attributes, listeners and activator ref of a row's handle. */
function useSortableHandle(sortable: ReturnType<typeof useSortable>): HandleProps {
  return {
    ...sortable.attributes,
    ...sortable.listeners,
    ref: sortable.setActivatorNodeRef,
  } as HandleProps;
}

interface LandDeductionRowsProps {
  /** The deed table's columns as drawn (the action column is gone on a read page). */
  columns: LedgerColumn[];
}

/**
 * The deduction switch and its rows, under the deed rows in the same table so the amounts line up
 * in the one column. Render it as `FormTable`'s `tail`; the figures they add up to are pinned in
 * `LandAreaFooter`.
 */
export default function LandDeductionRows({ columns }: LandDeductionRowsProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const readOnly = useFormReadOnly();
  const { control, setValue, getValues } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name: NAME });
  const rows = (useWatch({ control, name: NAME }) as DeductionData[] | null) ?? [];
  const hasAreaDeductions = useWatch({ control, name: 'isEncroached' }) === true;
  const toggleCaptions = useBooleanToggleOptions('isEncroached', undefined, ['No', 'Yes']);

  // Switching the toggle off clears the deduction rows. Hiding the rows alone left them in form
  // state and they went on being saved, so the appraised area stayed reduced by rows nobody
  // could see. An empty list is the API's "delete them all" (null means "leave alone"), and the
  // handler recalculates the stored DeductedAreaInSqWa afterwards — so clearing here is what
  // reaches the database, and the net area goes back to the registered area.
  //
  // Only on a genuine on -> off flip by the appraiser, the same rule the shared clearOnHide
  // effect uses: the form defaults isEncroached to false, so neither mount nor the reset() that
  // lands a saved record looks like a flip, and a stored record opens with its rows untouched.
  const wasEncroachedRef = useRef<boolean | null>(null);
  // How many rows are waiting on the appraiser's confirmation; null means no dialog is open.
  const [pendingClearCount, setPendingClearCount] = useState<number | null>(null);

  useEffect(() => {
    const wasEncroached = wasEncroachedRef.current;
    wasEncroachedRef.current = hasAreaDeductions;

    if (wasEncroached !== true || hasAreaDeductions) return;
    const rowCount = ((getValues(NAME) as unknown[] | null) ?? []).length;
    // Nothing to lose, nothing to ask: with no rows entered this stays a plain toggle.
    if (rowCount === 0) return;

    // Put the switch back ON and ask first. The toggle has already written its own value by the
    // time this runs, so leaving it off while the rows still exist would put the screen at odds
    // with the data — the very thing the clearing is here to prevent. Restoring it also means
    // Cancel needs no undo path: the switch simply never stayed off. shouldDirty lets RHF
    // re-derive the flag against the loaded record, so restoring it on a record that was already
    // encroached drops the dirty mark rather than leaving a phantom unsaved change.
    setValue('isEncroached', true, { shouldDirty: true, shouldValidate: false });
    setPendingClearCount(rowCount);
  }, [hasAreaDeductions, getValues, setValue]);

  // Confirmed: drop the rows first, then let the switch go off. That order is what stops the
  // dialog reopening itself — the effect re-fires on the flip and stops at its own "nothing to
  // lose" guard, because by then there is nothing left to lose.
  //
  // Dirty on purpose: the stored rows really do change, so the form must offer to save it and
  // the unsaved-changes prompt must fire if the appraiser leaves.
  const confirmClearDeductions = () => {
    setValue(NAME, [], { shouldDirty: true, shouldValidate: false });
    setValue('isEncroached', false, { shouldDirty: true, shouldValidate: false });
    setPendingClearCount(null);
  };

  // Drag to reorder, as the deeds above: the order of the array is the order saved. A move keeps
  // each row's id. Dropping with the keyboard puts focus back on the moved row's handle.
  const canOrder = !readOnly && fields.length > 1;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const pos = (id: string | number) => fields.findIndex(f => f.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      t('landCharacteristicsForm.deductionTable.dnd.pickedUp', { pos: pos(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t('landCharacteristicsForm.deductionTable.dnd.movedTo', {
            pos: pos(active.id),
            to: pos(over.id),
          })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('landCharacteristicsForm.deductionTable.dnd.dropped', {
            pos: pos(active.id),
            to: pos(over.id),
          })
        : t('landCharacteristicsForm.deductionTable.dnd.cancelled', { pos: pos(active.id) }),
    onDragCancel: ({ active }) =>
      t('landCharacteristicsForm.deductionTable.dnd.cancelled', { pos: pos(active.id) }),
  };
  const handleDragEnd = ({ active, over, activatorEvent }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = fields.findIndex(f => f.id === active.id);
    const to = fields.findIndex(f => f.id === over.id);
    move(from, to);
    if (activatorEvent instanceof KeyboardEvent)
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`[data-deduction-handle="${to}"]`)?.focus(),
      );
  };

  const layout = useFormLayout();
  const th = tableStyles[layout].th;
  const headAt = columns.findIndex(c => c.key !== 'handle');
  const unit = t('properties.units.sqwa');

  return (
    <>
      {/* The switch */}
      <tr>
        <FormTableCell colSpan={columns.length}>
          <div data-field={NAME} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-(--palette-ink-strong)">
              {t('landCharacteristicsForm.deductionsHeading')}
            </span>
            {readOnly ? (
              <span className="text-sm text-(--palette-ink)">
                {toggleCaptions[hasAreaDeductions ? 1 : 0]}
              </span>
            ) : (
              <FormBooleanToggle name="isEncroached" options={['No', 'Yes']} size="sm" />
            )}
          </div>
        </FormTableCell>
      </tr>

      {hasAreaDeductions && (
        <>
          {/* The head of the deduction table, in the deed table's columns and style */}
          <tr>
            {laid(columns, {
              handle: (
                <span className="sr-only">
                  {t('landCharacteristicsForm.deductionTable.dnd.handle')}
                </span>
              ),
              index: '#',
              body: (
                <div className={BODY_GRID}>
                  <span>{t('landCharacteristicsForm.deductionTable.reason')}</span>
                  <span className="@max-[48rem]/form-shell:hidden">
                    {t('landCharacteristicsForm.deductionTable.remark')}
                  </span>
                </div>
              ),
              area: `${t('landCharacteristicsForm.deductionTable.amount')} (${unit})`,
            }).map(c => (
              <th
                key={c.key}
                scope="col"
                colSpan={c.colSpan}
                className={clsx(
                  th,
                  c.kind === 'index'
                    ? 'text-center'
                    : c.align === 'end'
                      ? 'text-right'
                      : 'text-left',
                )}
              >
                {c.content}
              </th>
            ))}
          </tr>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: {
                draggable: t('landCharacteristicsForm.deductionTable.dnd.instructions'),
              },
            }}
          >
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              {fields.map((field, index) => {
                const row = rows[index] ?? {};
                const area = parseFloat(String(row.areaInSqWa ?? ''));
                return (
                  <SortableDeductionRow key={field.id} id={field.id} disabled={!canOrder}>
                    {handle =>
                      laid(columns, {
                        handle: canOrder ? (
                          <RowDragHandle
                            handle={handle}
                            label={t('landCharacteristicsForm.deductionTable.dnd.handle')}
                            data-deduction-handle={index}
                          />
                        ) : null,
                        index: index + 1,
                        body: readOnly ? (
                          <div className={BODY_GRID}>
                            {row.reasonCode ? (
                              <ParameterDisplay
                                group="LandAreaDeductionReason"
                                code={row.reasonCode}
                              />
                            ) : (
                              <FormTableDash />
                            )}
                            <span className="text-(--palette-ink-2)">
                              {row.remark || <FormTableDash />}
                            </span>
                          </div>
                        ) : (
                          <div className={BODY_GRID}>
                            <DeductionCell index={index} field="reasonCode" />
                            <DeductionCell index={index} field="remark" />
                          </div>
                        ),
                        area: readOnly ? (
                          Number.isNaN(area) ? (
                            <FormTableDash />
                          ) : (
                            <span className="whitespace-nowrap">{formatNumber(area, 2)}</span>
                          )
                        ) : (
                          <div className="w-full">
                            <DeductionCell index={index} field="areaInSqWa" />
                          </div>
                        ),
                        action: <RowTrash position={index} onDelete={() => remove(index)} />,
                      }).map(c => (
                        <FormTableCell
                          key={c.key}
                          kind={c.kind}
                          align={c.align}
                          colSpan={c.colSpan}
                        >
                          {c.content}
                        </FormTableCell>
                      ))
                    }
                  </SortableDeductionRow>
                );
              })}
            </SortableContext>
          </DndContext>

          {/* The add row: the last row of the deduction table, as under the deeds */}
          {!readOnly && (
            <tr>
              {columns.slice(0, headAt).map(c => (
                <FormTableCell key={c.key} className="border-dashed border-(--palette-line)" />
              ))}
              <FormTableCell
                colSpan={columns.length - headAt}
                className="border-dashed border-(--palette-line)"
              >
                <button
                  type="button"
                  className={LINK}
                  onClick={() => append({ reasonCode: '', areaInSqWa: '', remark: '' })}
                >
                  + {t('landCharacteristicsForm.addDeductionItem')}
                </button>
              </FormTableCell>
            </tr>
          )}
        </>
      )}

      {/* One row takes two clicks (ConfirmDeleteButton); wiping every row at once keeps this dialog. */}
      <ConfirmDialog
        isOpen={pendingClearCount !== null}
        onClose={() => setPendingClearCount(null)}
        onConfirm={confirmClearDeductions}
        title={t('landCharacteristicsForm.confirmClearDeductions.title')}
        message={t('landCharacteristicsForm.confirmClearDeductions.message', {
          count: pendingClearCount ?? 0,
        })}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />
    </>
  );
}

interface LandAreaSummaryProps {
  /** Sum of the deeds' areas in sq.wa. */
  deedWa: number;
  /** Number of deeds. */
  deedCount: number;
  /** The deed table's own area format (rai-ngan-wa and sq.wa). */
  areaText: (wa: number) => ReactNode;
}

/** A tile: a small label on top, its figure below. Below 48rem the tiles stack. */
const TILE = 'min-w-0 flex-1 px-4 py-2.5';
/** The sign between two tiles ("−", "="); gone when the tiles stack. */
const OPERATOR =
  'flex w-8 shrink-0 items-center justify-center text-(--palette-ink-2) @max-[48rem]/form-shell:hidden';

/**
 * The area summary, a strip right under the deed table's scroll box (outside it, so it is always in
 * view): the deeds' area, less what the deductions take off, equals the area left to appraise. The
 * middle tile and its sign are left out while nothing is deducted. It reads the deduction rows
 * itself, so it follows an edit.
 *
 * The figures are the server's own (LandAppraisalDetail): the registered area from rai / ngan / wa,
 * less the deduction rows, never below zero.
 */
export function LandAreaSummary({ deedWa, deedCount, areaText }: LandAreaSummaryProps) {
  const { t } = useTranslation('appraisal');
  const rows = (useWatch({ name: NAME }) as DeductionData[] | null) ?? [];
  const encroached = useWatch({ name: 'isEncroached' }) === true;
  const withDeductions = encroached && rows.length > 0;
  const deductedWa = sumColumn(rows, 'areaInSqWa');
  const netWa = withDeductions ? Math.max(0, deedWa - deductedWa) : deedWa;
  const muted = 'text-xs text-(--palette-ink-2)';
  const unit = t('properties.units.sqwa');

  return (
    <div
      data-area-summary=""
      className="mt-3 flex overflow-hidden rounded-[0.7143rem] border border-(--palette-line) bg-(--palette-surface) tabular-nums @max-[48rem]/form-shell:flex-col"
    >
      <div data-tile="deed" className={TILE}>
        <div className="text-xs text-(--palette-ink-2)">
          {t('landCharacteristicsForm.netArea.deed')}{' '}
          <span className="text-(--palette-ink-3)">
            {t('landCharacteristicsForm.netArea.parcels', { n: deedCount })}
          </span>
        </div>
        <div className="mt-0.5 whitespace-nowrap text-[1.0714rem]">{areaText(deedWa)}</div>
      </div>
      {withDeductions && (
        <>
          <div aria-hidden className={OPERATOR}>
            −
          </div>
          <div
            data-tile="deducted"
            className={clsx(TILE, 'border-(--palette-line) @max-[48rem]/form-shell:border-t')}
          >
            <div className="text-xs text-(--palette-ink-2)">
              {t('landCharacteristicsForm.netArea.deducted')}{' '}
              <span className="text-(--palette-ink-3)">
                {t('landCharacteristicsForm.netArea.items', { n: rows.length })}
              </span>
            </div>
            <div className="mt-0.5 whitespace-nowrap text-[1.0714rem] font-bold text-danger-600 dark:text-(--palette-danger)">
              {formatNumber(deductedWa, 2)} {unit}
            </div>
          </div>
        </>
      )}
      <div aria-hidden className={OPERATOR}>
        =
      </div>
      <div
        data-tile="net"
        className={clsx(
          TILE,
          'bg-(--palette-accent-wash) text-(--palette-accent-ink)',
          'border-l border-(--palette-line) @max-[48rem]/form-shell:border-t @max-[48rem]/form-shell:border-l-0',
        )}
      >
        <div className="text-xs font-semibold">{t('landCharacteristicsForm.netArea.assessed')}</div>
        <div className="mt-0.5 whitespace-nowrap">
          <span className="text-[1.2143rem] font-semibold">
            {t('titleEntry.list.rai', { rnw: toRaiNganWa(netWa) })}
          </span>{' '}
          <span className={muted}>{t('titleEntry.list.wa', { wa: formatNumber(netWa, 2) })}</span>
        </div>
      </div>
    </div>
  );
}
