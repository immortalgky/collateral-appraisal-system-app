import Icon from '@/shared/components/Icon';
import ConfirmDeleteButton from '@/shared/components/ConfirmDeleteButton';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { type FormField } from '@/shared/components/form';
import { formatNumber } from '@/shared/utils/formatUtils';
import clsx from 'clsx';
import { useMemo, useRef, useState, type HTMLAttributes, type ReactNode, type Ref } from 'react';
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
import { get, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useFormReadOnly } from '@/shared/components/form/context';
import LandTitleInputModal from '../LandTitleInputModal';
import { toRaiNganWa } from '../TitleFormView';
import { TD, TH } from './denseTable';

interface LandTitleTableProps {
  name: string;
  fields: FormField[];
  /** Order controls: off where the order is not saved (a block project's land). */
  orderable?: boolean;
}

const byTitleNumber = new Intl.Collator('th', { numeric: true }).compare;

type TitleRow = Record<string, unknown>;

/** The dot beside the type: the same colours as the emblem on the document view. */
const TYPE_DOT: Record<string, string> = {
  DEED: 'bg-[#D69BA1]',
  NS3K: 'bg-[#7FBF95]',
  NS3: 'bg-[#AEB5BA]',
  NS3KO: 'bg-[#AEB5BA]',
};

/**
 * Where the parcel sits, in the order the dialog asks for it. Each title type fills only some of
 * these, so a row shows just the ones it has rather than a column per field left mostly empty.
 */
const POSITION_KEYS = {
  rawang: 'titleEntry.fields.rawang',
  aerialMapName: 'titleEntry.fields.aerialMapName',
  aerialMapNumber: 'titleEntry.fields.aerialMapNumber',
  mapSheetNumber: 'titleEntry.fields.mapSheetNumber',
  landParcelNumber: 'titleEntry.fields.landParcelNumber',
  surveyNumber: 'titleEntry.fields.surveyNumber',
} as const;

/** The header row stays in view while many parcels scroll under it. */
const STICKY = 'sticky top-0 z-10 bg-[#f8fafa]';

/** What a row's drag handle needs from `useSortable`. */
type HandleProps = HTMLAttributes<HTMLElement> & { ref: Ref<HTMLButtonElement> };

/**
 * A title row that can be dragged by its handle only: the row itself opens the dialog on a click
 * and its buttons take focus, so the whole row cannot be the drag target. Rows are keyed and
 * identified by position (an edit must not remount its row), so after a drop the table re-renders
 * the same rows with the moved title's content.
 */
const SortableTr = ({
  id,
  disabled,
  children,
  ...rest
}: {
  id: string;
  disabled: boolean;
  children: (handle: HandleProps) => ReactNode;
} & Omit<HTMLAttributes<HTMLTableRowElement>, 'children'>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    // No animation on a drop: the ids are positions, so `move` swaps the content under them while
    // dnd-kit releases each row's offset; animating that release replays the move after the preview.
  } = useSortable({ id, disabled, animateLayoutChanges: () => false });
  return (
    <tr
      ref={setNodeRef}
      {...rest}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 20 : undefined,
        opacity: isDragging ? 0.6 : undefined,
      }}
    >
      {children({ ...attributes, ...listeners, ref: setActivatorNodeRef } as HandleProps)}
    </tr>
  );
};

const hasValue = (value: unknown) => value != null && String(value).trim() !== '';

/** Always from rai/ngan/wa, never the stored total, which can be stale on older rows. */
const totalWaOf = (row: TitleRow) =>
  (Number(row.rai) || 0) * 400 + (Number(row.ngan) || 0) * 100 + (Number(row.squareWa) || 0);

const LandTitleTable = ({ name, fields, orderable = true }: LandTitleTableProps) => {
  const { t } = useTranslation('appraisal');
  const readOnly = useFormReadOnly();
  const { control, formState, trigger } = useFormContext();
  const { append, remove, update, move, replace } = useFieldArray({ control, name });
  const tableRef = useRef<HTMLTableElement>(null);
  const values = (useWatch({ control, name }) as TitleRow[] | undefined) ?? [];

  const [modalState, setModalState] = useState<
    { type: 'add' } | { type: 'edit'; index: number } | null
  >(null);
  const grandTotalWa = values.reduce((sum, row) => sum + totalWaOf(row), 0);
  // Read-only viewers can still open a title; the dialog shows it without a Save button.
  const open = (index: number) => setModalState({ type: 'edit', index });

  const summary = values.length > 0 && (
    <>
      {t('titleEntry.list.total', { count: values.length })} ·{' '}
      {t('titleEntry.list.rai', { rnw: toRaiNganWa(grandTotalWa) })} (
      {t('titleEntry.list.wa', { wa: formatNumber(grandTotalWa, 2) })})
    </>
  );
  // The order is the order saved (LandTitles.SequenceNumber), and the first title is the one LOS,
  // AS400 and the collateral master take. Moving keeps each row's id: a move, not delete + re-add.
  const canOrder = orderable && !readOnly && values.length > 1;
  // Titles without a number go last: whatever is first is the title the other systems take.
  const byNumber = useMemo(
    () =>
      canOrder
        ? [...values].sort((a, b) => {
            const [x, y] = [a.titleNumber, b.titleNumber].map(n =>
              hasValue(n) ? String(n) : null,
            );
            if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
            return byTitleNumber(x, y);
          })
        : values,
    [canOrder, values],
  );
  const isSortedByNumber = byNumber.every((row, i) => row === values[i]);
  const sortByNumber = () => {
    replace(byNumber);
    // replace() leaves validation errors at the old positions; re-check so they follow the rows. A
    // submitted form re-checks the array by itself.
    if (get(formState.errors, name) && !formState.isSubmitted) void trigger(name);
    // The button turns itself off once the list is sorted; keep keyboard focus in the table.
    requestAnimationFrame(() => tableRef.current?.querySelector<HTMLElement>('tbody tr')?.focus());
  };
  // A drop is a `move`, which keeps each row's id (a move, not delete + re-add). Rows are keyed by
  // position, so a keyboard drop puts the focus back on the moved title's handle.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = ({ active, over, activatorEvent }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const to = Number(over.id);
    move(Number(active.id), to);
    if (activatorEvent instanceof KeyboardEvent)
      requestAnimationFrame(() =>
        tableRef.current?.querySelector<HTMLElement>(`[data-handle="${to}"]`)?.focus(),
      );
  };
  // Spoken while dragging, in the page's language: the position is the row's number.
  const pos = (id: string | number) => Number(id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t('titleEntry.list.dnd.pickedUp', { pos: pos(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t('titleEntry.list.dnd.movedTo', { pos: pos(active.id), to: pos(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('titleEntry.list.dnd.dropped', { pos: pos(active.id), to: pos(over.id) })
        : t('titleEntry.list.dnd.cancelled', { pos: pos(active.id) }),
    onDragCancel: ({ active }) => t('titleEntry.list.dnd.cancelled', { pos: pos(active.id) }),
  };
  const sortButton = (className: string) =>
    canOrder && (
      <button
        type="button"
        disabled={isSortedByNumber}
        onClick={sortByNumber}
        className={className}
      >
        <Icon style="solid" name="arrow-down-1-9" className="size-2.5" />
        {t('titleEntry.list.sortByNumber')}
      </button>
    );

  const addButton = (className: string) =>
    !readOnly && (
      <button type="button" onClick={() => setModalState({ type: 'add' })} className={className}>
        <Icon style="solid" name="plus" className="size-2.5" />
        {t('titleEntry.list.add')}
      </button>
    );

  return (
    <>
      {/* The section header lives here so its add button can open this table's dialog. It sits in
          the header rather than under the table, so adding stays in reach however long the list. */}
      <div className="cas-section-head mb-2 flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <Icon style="solid" name="file-contract" className="size-3.5 text-primary-600" />
        </div>
        <span className="shrink-0 text-sm font-medium leading-tight text-gray-700">
          {t('titleEntry.sections.document.title')}
        </span>
        {/* The totals are summarised here, in view with the header, and also shown as the table's
            `<tfoot>` total row (both by user decision). A div, not a span: the grid layout restyles
            header spans as the section title. */}
        {summary && (
          <div className="min-w-0 truncate text-xs tabular-nums text-gray-500 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink-2)]">
            {summary}
          </div>
        )}
        {/* Both are text links in the skin (`cas-title-add`); a disabled sort is muted, not a link. */}
        {sortButton(
          'cas-title-add ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-primary-700 transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline!',
        )}
        {values.length > 0 &&
          addButton(
            clsx(
              'cas-title-add inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              !canOrder && 'ml-auto',
            ),
          )}
      </div>
      {/* One box for everything under the header, so the grid layout can treat it as the
          section's body (`.cas-section-head + *`). */}
      <div>
        {/* data-field: scroll target for array-level errors on this table (see form/utils.ts). Kept
          on an empty anchor, as the building tables do: a [data-field] that wraps the table gets
          the grid layout's teal repeater look, and this table wears the grey one. */}
        <div data-field={name} className="cas-repeater" />
        <div className="cas-labelled-table">
          <div className="flex w-full min-w-0 flex-1 flex-col">
            {values.length === 0 ? (
              <div className="cas-table-card flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10">
                <Icon name="file-lines" style="regular" className="mb-2 text-3xl text-gray-300" />
                <p className="text-sm font-medium text-gray-500">{t('titleEntry.list.empty')}</p>
                {addButton(
                  'mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600',
                )}
              </div>
            ) : (
              <>
                {/* Many parcels scroll inside the box; the header stays pinned. Its cells are
              sticky (not the thead) and paint their own ground; the `<tfoot>` total row scrolls with the body: a pinned row's background does not
              cover what scrolls beneath it. The grid layout clears cell fills, so formLayout.css gives
              a `.sticky` cell its ground back. `[flex-wrap:wrap]` below rather than `flex-wrap`: the
              grid layout treats any `.flex-wrap` in a field as a chip group, which shrank this box. */}
                {/* border-separate: with collapsed borders a sticky header cell leaves its line behind. */}
                <div className="cas-table-card max-h-[28rem] min-w-0 self-stretch overflow-auto rounded-lg border border-gray-200 bg-white">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    accessibility={{
                      announcements,
                      screenReaderInstructions: {
                        draggable: t('titleEntry.list.dnd.instructions'),
                      },
                    }}
                  >
                    <table
                      ref={tableRef}
                      className="w-full min-w-[720px] border-separate border-spacing-0 text-[0.875rem] leading-tight tabular-nums"
                    >
                      <thead className="text-left text-[0.8125rem] font-medium text-[#55636f]">
                        <tr>
                          {canOrder && (
                            <th className={clsx(TH, STICKY, 'w-8')}>
                              <span className="sr-only">{t('titleEntry.list.dnd.handle')}</span>
                            </th>
                          )}
                          <th className={clsx(TH, STICKY, 'w-10')}>#</th>
                          <th className={clsx(TH, STICKY)}>{t('titleEntry.list.type')}</th>
                          <th className={clsx(TH, STICKY)}>{t('titleEntry.list.document')}</th>
                          <th className={clsx(TH, STICKY)}>{t('titleEntry.list.position')}</th>
                          <th className={clsx(TH, STICKY, 'text-right')}>
                            {t('titleEntry.list.area')}
                          </th>
                          {!readOnly && <th className={clsx(TH, STICKY, 'w-20')} />}
                        </tr>
                      </thead>
                      <tbody>
                        <SortableContext
                          items={values.map((_, i) => String(i))}
                          strategy={verticalListSortingStrategy}
                        >
                          {values.map((row, index) => {
                            const totalWa = totalWaOf(row);
                            const invalid = !!get(formState.errors, `${name}.${index}`);
                            const positions = Object.entries(POSITION_KEYS).filter(([field]) =>
                              hasValue(row[field]),
                            );
                            return (
                              <SortableTr
                                key={index}
                                id={String(index)}
                                disabled={!canOrder}
                                tabIndex={0}
                                onClick={() => open(index)}
                                onKeyDown={event => {
                                  if (event.target === event.currentTarget && event.key === 'Enter')
                                    open(index);
                                }}
                                className="cursor-pointer align-middle outline-none hover:bg-gray-50 focus-visible:bg-primary-50/50"
                              >
                                {handle => (
                                  <>
                                    {canOrder && (
                                      <td className={clsx(TD, 'py-0.5 text-center')}>
                                        <button
                                          {...handle}
                                          type="button"
                                          data-handle={index}
                                          onClick={event => event.stopPropagation()}
                                          className="cas-row-btn mx-auto flex size-6 cursor-grab touch-none items-center justify-center rounded text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600 active:cursor-grabbing"
                                          aria-label={t('titleEntry.list.dnd.handle')}
                                        >
                                          <Icon
                                            style="solid"
                                            name="grip-vertical"
                                            className="size-3"
                                          />
                                        </button>
                                      </td>
                                    )}
                                    <td className={clsx(TD, 'text-gray-400')}>{index + 1}</td>
                                    <td className={clsx(TD, 'whitespace-nowrap')}>
                                      {/* <i>, not <span>: the grid layout restyles a cell's direct `span.rounded-full`. */}
                                      <i
                                        aria-hidden
                                        className={clsx(
                                          'mr-2 inline-block size-2 rounded-full align-middle',
                                          TYPE_DOT[String(row.titleType)] ?? 'bg-gray-300',
                                        )}
                                      />
                                      <ParameterDisplay
                                        group="DeedType"
                                        code={row.titleType as string}
                                      />
                                      {invalid && (
                                        <div className="mt-0.5 text-xs text-danger">
                                          {t('titleEntry.list.incomplete')}
                                        </div>
                                      )}
                                    </td>
                                    <td className={TD}>
                                      <span className="break-all font-semibold text-gray-900 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink-strong)]">
                                        {hasValue(row.titleNumber) ? String(row.titleNumber) : '—'}
                                      </span>{' '}
                                      <span className="cas-sub text-[0.75rem] text-gray-500">
                                        ·{' '}
                                        {t('titleEntry.list.bookPage', {
                                          book: hasValue(row.bookNumber) ? row.bookNumber : '—',
                                          page: hasValue(row.pageNumber) ? row.pageNumber : '—',
                                        })}
                                      </span>
                                    </td>
                                    <td className={TD}>
                                      {positions.length === 0 ? (
                                        <span className="text-gray-300">—</span>
                                      ) : (
                                        <div className="cas-pos flex gap-x-3 gap-y-0.5 text-[0.75rem] text-gray-500 [flex-wrap:wrap]">
                                          {positions.map(([field, key]) => (
                                            <span key={field} className="whitespace-nowrap">
                                              {t(key)}{' '}
                                              <b className="font-medium text-gray-800">
                                                {String(row[field])}
                                              </b>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                    <td className={clsx(TD, 'whitespace-nowrap text-right')}>
                                      <span className="font-semibold text-gray-900 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink-strong)]">
                                        {t('titleEntry.list.rai', { rnw: toRaiNganWa(totalWa) })}
                                      </span>{' '}
                                      <span className="cas-sub text-[0.75rem] text-gray-500">
                                        {t('titleEntry.list.wa', { wa: formatNumber(totalWa, 2) })}
                                      </span>
                                    </td>
                                    {!readOnly && (
                                      <td className={clsx(TD, 'py-0.5')}>
                                        <div className="flex justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={event => {
                                              event.stopPropagation();
                                              open(index);
                                            }}
                                            className="cas-row-btn flex size-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                                            aria-label={t('titleEntry.list.edit')}
                                            title={t('titleEntry.list.edit')}
                                          >
                                            <Icon style="solid" name="pen" className="size-3" />
                                          </button>
                                          <ConfirmDeleteButton
                                            onConfirm={() => remove(index)}
                                            rowNumber={index + 1}
                                            className="cas-row-btn flex size-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                                          >
                                            <Icon style="solid" name="trash" className="size-3" />
                                          </ConfirmDeleteButton>
                                        </div>
                                      </td>
                                    )}
                                  </>
                                )}
                              </SortableTr>
                            );
                          })}
                        </SortableContext>
                      </tbody>
                      <tfoot>
                        {/* Not a row you can open: the skin draws it as the table's total. Always shown,
                          for one title too (an empty list renders the empty state instead). */}
                        <tr className="cas-total-row bg-gray-50 font-semibold">
                          {canOrder && <td className={TD} />}
                          <td className={TD} />
                          <td colSpan={3} className={TD}>
                            {t('titleEntry.list.total', { count: values.length })}
                          </td>
                          <td className={clsx(TD, 'whitespace-nowrap text-right')}>
                            <span className="font-semibold text-gray-900 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink-strong)]">
                              {t('titleEntry.list.rai', { rnw: toRaiNganWa(grandTotalWa) })}
                            </span>{' '}
                            <span className="cas-sub text-[0.75rem] text-gray-500">
                              {t('titleEntry.list.wa', { wa: formatNumber(grandTotalWa, 2) })}
                            </span>
                          </td>
                          {!readOnly && <td className={TD} />}
                        </tr>
                      </tfoot>
                    </table>
                  </DndContext>
                </div>
              </>
            )}
            {modalState && (
              <LandTitleInputModal
                readOnly={readOnly}
                fields={fields}
                defaultValues={modalState.type === 'edit' ? values[modalState.index] : undefined}
                onCancel={() => setModalState(null)}
                nav={
                  modalState.type === 'edit'
                    ? { index: modalState.index, count: values.length, onNavigate: open }
                    : undefined
                }
                // The modal returns only its own schema's keys; merge over the stored row so its id
                // and unedited members (remark) survive, as a Save does.
                onApply={data =>
                  modalState.type === 'edit' &&
                  update(modalState.index, { ...values[modalState.index], ...data })
                }
                onSave={data => {
                  if (modalState.type === 'add') {
                    append(data);
                  } else {
                    // The modal returns only its own schema's keys; merge over the stored row so
                    // its id (update, not delete + re-create) and unedited members (remark) survive.
                    update(modalState.index, { ...values[modalState.index], ...data });
                  }
                  setModalState(null);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LandTitleTable;
