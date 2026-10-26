import Icon from '@/shared/components/Icon';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import {
  FormTable,
  FormTableRowActions,
  type FormField,
  type FormTableColumn,
  type FormTableRowElementProps,
} from '@/shared/components/form';
import { formatNumber } from '@/shared/utils/formatUtils';
import clsx from 'clsx';
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type Ref,
} from 'react';
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

interface LandTitleTableProps {
  name: string;
  fields: FormField[];
  /** Order controls: off where the order is not saved (a block project's land). */
  orderable?: boolean;
}

const byTitleNumber = new Intl.Collator('th', { numeric: true }).compare;

type TitleRow = Record<string, unknown>;

/** A title with its place in the field array (rows are keyed and identified by position). */
type TitleItem = { row: TitleRow; index: number };

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

/** What a row's drag handle needs from `useSortable`. */
type HandleProps = HTMLAttributes<HTMLElement> & { ref: Ref<HTMLButtonElement> };

/** Whether the rows can be dragged; read by every row, so the row component stays one identity. */
const OrderContext = createContext(false);
/** The handle of the row being drawn: the handle cell sits inside the row, the hook is on the row. */
const HandleContext = createContext<HandleProps | null>(null);

/**
 * A title row that can be dragged by its handle only: the row itself opens the dialog on a click
 * and its buttons take focus, so the whole row cannot be the drag target. Rows are keyed and
 * identified by position (an edit must not remount its row), so after a drop the table re-renders
 * the same rows with the moved title's content.
 */
const SortableRow = ({ position, children, ...rest }: FormTableRowElementProps) => {
  const canOrder = useContext(OrderContext);
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
  } = useSortable({ id: String(position), disabled: !canOrder, animateLayoutChanges: () => false });
  const handle = { ...attributes, ...listeners, ref: setActivatorNodeRef } as HandleProps;
  return (
    <HandleContext.Provider value={handle}>
      <tr
        {...rest}
        ref={setNodeRef}
        style={{
          transform: CSS.Translate.toString(transform),
          transition,
          position: 'relative',
          zIndex: isDragging ? 20 : undefined,
          opacity: isDragging ? 0.6 : undefined,
        }}
      >
        {children}
      </tr>
    </HandleContext.Provider>
  );
};

function DragHandle({ index, label }: { index: number; label: string }) {
  const handle = useContext(HandleContext);
  return (
    <button
      {...handle}
      type="button"
      data-handle={index}
      onClick={event => event.stopPropagation()}
      className="mx-auto flex size-6 cursor-grab touch-none items-center justify-center rounded text-(--palette-ink-2) transition-colors hover:bg-(--palette-surface-3) active:cursor-grabbing"
      aria-label={label}
    >
      <Icon style="solid" name="grip-vertical" className="text-[1.0714rem]" />
    </button>
  );
}

const hasValue = (value: unknown) => value != null && String(value).trim() !== '';

/** Always from rai/ngan/wa, never the stored total, which can be stale on older rows. */
const totalWaOf = (row: TitleRow) =>
  (Number(row.rai) || 0) * 400 + (Number(row.ngan) || 0) * 100 + (Number(row.squareWa) || 0);

const LandTitleTable = ({ name, fields, orderable = true }: LandTitleTableProps) => {
  const { t } = useTranslation('appraisal');
  const readOnly = useFormReadOnly();
  const { control, formState, trigger } = useFormContext();
  const { append, remove, update, move, replace } = useFieldArray({ control, name });
  const containerRef = useRef<HTMLDivElement>(null);
  const watched = useWatch({ control, name }) as TitleRow[] | undefined;
  // Memoised: a fresh `[]` on every render while unset would re-run everything that depends on it.
  const values = useMemo(() => watched ?? [], [watched]);

  const [modalState, setModalState] = useState<
    { type: 'add' } | { type: 'edit'; index: number } | null
  >(null);
  const grandTotalWa = values.reduce((sum, row) => sum + totalWaOf(row), 0);
  // Read-only viewers can still open a title; the dialog shows it without a Save button.
  const open = (index: number) => setModalState({ type: 'edit', index });

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
  const focusFirstRow = () => containerRef.current?.querySelector<HTMLElement>('tbody tr')?.focus();
  const sortByNumber = () => {
    replace(byNumber);
    // replace() leaves validation errors at the old positions; re-check so they follow the rows. A
    // submitted form re-checks the array by itself.
    if (get(formState.errors, name) && !formState.isSubmitted) void trigger(name);
    // The button turns itself off once the list is sorted; keep keyboard focus in the table.
    requestAnimationFrame(focusFirstRow);
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
        containerRef.current?.querySelector<HTMLElement>(`[data-handle="${to}"]`)?.focus(),
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

  const areaText = (wa: number) => (
    <>
      <span className="font-semibold text-(--palette-ink-strong)">
        {t('titleEntry.list.rai', { rnw: toRaiNganWa(wa) })}
      </span>{' '}
      <span className="text-xs text-(--palette-ink-2)">
        {t('titleEntry.list.wa', { wa: formatNumber(wa, 2) })}
      </span>
    </>
  );

  const items: TitleItem[] = values.map((row, index) => ({ row, index }));

  const columns: FormTableColumn<TitleItem>[] = [
    ...(canOrder
      ? [
          {
            key: 'handle',
            kind: 'action',
            align: 'center',
            width: '2.2857rem',
            header: <span className="sr-only">{t('titleEntry.list.dnd.handle')}</span>,
            cell: ({ index }) => (
              <DragHandle index={index} label={t('titleEntry.list.dnd.handle')} />
            ),
          } satisfies FormTableColumn<TitleItem>,
        ]
      : []),
    { key: 'no', kind: 'index', header: '#' },
    {
      key: 'type',
      header: t('titleEntry.list.type'),
      className: 'whitespace-nowrap',
      cell: ({ row, index }) => (
        <>
          <i
            aria-hidden
            className={clsx(
              'mr-2 inline-block size-2 rounded-full align-middle',
              TYPE_DOT[String(row.titleType)] ?? 'bg-(--palette-line-strong)',
            )}
          />
          <ParameterDisplay group="DeedType" code={row.titleType as string} />
          {get(formState.errors, `${name}.${index}`) && (
            <div className="mt-0.5 text-xs text-danger-600 dark:text-(--palette-danger)">
              {t('titleEntry.list.incomplete')}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'document',
      header: t('titleEntry.list.document'),
      cell: ({ row }) => (
        <>
          <span className="break-all font-semibold text-(--palette-ink-strong)">
            {hasValue(row.titleNumber) ? String(row.titleNumber) : '—'}
          </span>{' '}
          <span className="text-xs text-(--palette-ink-2)">
            ·{' '}
            {t('titleEntry.list.bookPage', {
              book: hasValue(row.bookNumber) ? row.bookNumber : '—',
              page: hasValue(row.pageNumber) ? row.pageNumber : '—',
            })}
          </span>
        </>
      ),
    },
    {
      key: 'position',
      header: t('titleEntry.list.position'),
      cell: ({ row }) => {
        const positions = Object.entries(POSITION_KEYS).filter(([field]) => hasValue(row[field]));
        return positions.length === 0 ? (
          <span className="text-(--palette-ink-3)">—</span>
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-(--palette-ink-2)">
            {positions.map(([field, key]) => (
              <span key={field} className="whitespace-nowrap">
                {t(key)} <b className="font-medium text-(--palette-ink)">{String(row[field])}</b>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'area',
      align: 'end',
      header: t('titleEntry.list.area'),
      className: 'whitespace-nowrap',
      total: areaText(grandTotalWa),
      cell: ({ row }) => areaText(totalWaOf(row)),
    },
    {
      key: 'actions',
      kind: 'action',
      width: '6rem',
      cell: ({ index }, { position }) => (
        <FormTableRowActions
          position={position}
          count={items.length}
          onEdit={() => open(index)}
          editLabel={t('titleEntry.list.edit')}
          onDelete={() => remove(index)}
        />
      ),
    },
  ];

  return (
    <div className="col-span-12" ref={containerRef}>
      {/* data-field: scroll target for array-level errors on this table (see form/utils.ts). */}
      <div data-field={name}>
        <OrderContext.Provider value={canOrder}>
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
            <SortableContext
              items={values.map((_, i) => String(i))}
              strategy={verticalListSortingStrategy}
            >
              {/* Many parcels scroll inside `maxHeight`; the head stays pinned. The total row scrolls
                  with the body. Always shown, for one title too (an empty list is the empty state). */}
              <FormTable
                columns={columns}
                rows={items}
                rowKey={item => item.index}
                rowElement={SortableRow}
                rowProps={({ index }) => ({
                  tabIndex: 0,
                  onClick: () => open(index),
                  onKeyDown: event => {
                    if (event.target === event.currentTarget && event.key === 'Enter') open(index);
                  },
                  className:
                    'cursor-pointer outline-none hover:bg-(--palette-surface-2) focus-visible:bg-(--palette-accent-wash)',
                })}
                maxHeight={28}
                totalLabel={t('titleEntry.list.total', { count: values.length })}
                add={[
                  {
                    label: t('titleEntry.list.add'),
                    onClick: () => setModalState({ type: 'add' }),
                  },
                  ...(canOrder
                    ? [
                        {
                          label: t('titleEntry.list.sortByNumber'),
                          icon: 'arrow-down-1-9',
                          disabled: isSortedByNumber,
                          onClick: sortByNumber,
                        },
                      ]
                    : []),
                ]}
                empty={{ icon: 'file-lines', message: t('titleEntry.list.empty') }}
              />
            </SortableContext>
          </DndContext>
        </OrderContext.Provider>
      </div>
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
  );
};

export default LandTitleTable;
