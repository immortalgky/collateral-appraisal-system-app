import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '@/shared/components/Icon';
import { KEYBOARD_RING_PLAIN, NO_OUTLINE } from '@/shared/hooks/usePointerMode';
import type { FilterField } from './tabConfigs';
import { hasValue } from './filterOptions';
import FilterValuePanel from './FilterValuePanel';

/** What a screen gives the filter bar to let the user choose its pinned filters. */
export interface FilterPinControls {
  /** Pin a filter (it goes last on the bar), or unpin it. */
  onTogglePin: (key: string) => void;
  /** Move a pinned filter to where another pinned one is. */
  onReorderPins: (activeKey: string, overKey: string) => void;
  /** Back to the screen's default pinned filters. */
  onResetPins: () => void;
  /** Whether there is anything for Reset to undo. */
  canReset: boolean;
}

interface FilterPinPickerProps extends FilterPinControls {
  /** The pinned filters, in bar order. */
  pinned: FilterField[];
  /** Every other filter the user can add, in menu order. */
  others: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  showRing: boolean;
}

/** After a pin or unpin the row moves to the other section and remounts: give its pin back the focus. */
const focusPin = (key: string) =>
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>(`[data-filter-pin="${globalThis.CSS.escape(key)}"]`)
      ?.focus(),
  );

function RowBody({
  field,
  values,
  isPinned,
  handle,
  onOpen,
  onTogglePin,
  onPinKeyDown,
  showRing,
}: {
  field: FilterField;
  values: Record<string, string>;
  isPinned: boolean;
  /** The drag handle, on a pinned row only. */
  handle?: ReactNode;
  onOpen: () => void;
  onTogglePin: () => void;
  onPinKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  showRing: boolean;
}) {
  const { t } = useTranslation('appraisal');
  const ring = showRing ? KEYBOARD_RING_PLAIN : '';
  const pinLabel = t(isPinned ? 'list.filters.unpin' : 'list.filters.pin', { label: field.label });
  return (
    <div className="group flex items-center gap-1 rounded-lg pr-1 hover:bg-(--palette-surface-2)">
      {handle}
      <button
        type="button"
        onClick={onOpen}
        style={NO_OUTLINE}
        className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-1.5 text-left text-sm text-(--palette-ink) ${
          handle ? 'pl-0.5' : 'pl-2'
        } ${ring}`}
      >
        <span className="truncate">{field.label}</span>
        {hasValue(values, field) && (
          <>
            <span
              data-filter-set
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-primary"
            />
            <span className="sr-only">{t('list.filters.inUse')}</span>
          </>
        )}
        <Icon
          style="solid"
          name="chevron-right"
          className="ml-auto size-2.5 shrink-0 text-(--palette-gray-400)"
        />
      </button>
      <button
        type="button"
        data-filter-pin={field.key}
        aria-pressed={isPinned}
        aria-label={pinLabel}
        title={pinLabel}
        onClick={() => {
          onTogglePin();
          focusPin(field.key);
        }}
        onKeyDown={onPinKeyDown}
        style={NO_OUTLINE}
        className={`shrink-0 rounded p-1 transition-colors hover:bg-(--palette-surface-3) ${ring} ${
          isPinned
            ? 'text-(--palette-primary-text)'
            : // on hover or keyboard focus only: a pin just unpinned by a click keeps the focus
              // (it moved sections) and must not stay drawn on a row the pointer has left
              'text-(--palette-gray-300) opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-(--palette-gray-500)'
        }`}
      >
        <Icon style="solid" name="thumbtack" className="text-xs" />
      </button>
    </div>
  );
}

function PinnedRow(props: Omit<Parameters<typeof RowBody>[0], 'handle' | 'isPinned'>) {
  const { t } = useTranslation('appraisal');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.field.key,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        position: 'relative',
      }}
      className={isDragging ? 'rounded-lg bg-(--palette-surface-3) shadow-sm' : ''}
    >
      <RowBody
        {...props}
        isPinned
        handle={
          // The pin button is the keyboard's way to move a row (Alt + arrows), so the handle stays
          // out of the tab order.
          <button
            type="button"
            {...attributes}
            {...listeners}
            tabIndex={-1}
            aria-label={t('list.filters.dragToReorder')}
            className="shrink-0 cursor-grab px-1 py-1.5 text-(--palette-gray-300) hover:text-(--palette-gray-500) active:cursor-grabbing"
          >
            <Icon style="solid" name="grip-dots-vertical" className="size-3.5" />
          </button>
        }
      />
    </div>
  );
}

/**
 * The body of the filter bar's "add filter" menu when the user chooses the pinned filters: the
 * pinned ones first, in bar order and reorderable (drag, or Alt + ↑/↓ on the pin), then every
 * other filter, each of which can be pinned. A name opens that filter's values in place (back
 * returns to the list); only the pin pins.
 */
export function FilterPinPicker({
  pinned,
  others,
  values,
  onChange,
  onRemove,
  showRing,
  onTogglePin,
  onReorderPins,
  onResetPins,
  canReset,
}: FilterPinPickerProps) {
  const { t } = useTranslation('appraisal');
  const [openKey, setOpenKey] = useState<string | null>(null);
  // A few pixels before a drag starts, so a click on the handle is still a click
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const pinnedKeys = pinned.map(f => f.key);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onReorderPins(String(active.id), String(over.id));
  };
  const moveWithKeys = (key: string) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const at = pinnedKeys.indexOf(key);
    const to = pinnedKeys[e.key === 'ArrowUp' ? at - 1 : at + 1];
    if (to) onReorderPins(key, to);
  };

  const heading = (title: string, hint?: string, divider = false) => (
    <div
      className={`px-2 pt-2 pb-1 ${divider ? 'mt-1 border-t border-(--palette-line-soft)' : ''}`}
    >
      <p className="text-xs font-semibold text-(--palette-ink)">{title}</p>
      {hint && <p className="text-[11px] text-(--palette-gray-400)">{hint}</p>}
    </div>
  );

  const openField = [...pinned, ...others].find(f => f.key === openKey);
  if (openField) {
    const isPinned = pinnedKeys.includes(openField.key);
    return (
      <div className="w-64">
        <FilterValuePanel
          field={openField}
          values={values}
          onChange={onChange}
          onRemove={onRemove}
          onBack={() => setOpenKey(null)}
          headerAction={
            <button
              type="button"
              aria-pressed={isPinned}
              onClick={() => onTogglePin(openField.key)}
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${
                isPinned
                  ? 'border-transparent text-(--palette-primary-text)'
                  : 'border-(--palette-line) text-(--palette-gray-600) hover:text-(--palette-ink)'
              }`}
            >
              <Icon style="solid" name="thumbtack" className="text-[10px]" />
              {t(isPinned ? 'list.filters.pinnedAction' : 'list.filters.pinAction')}
            </button>
          }
        />
        <p className="mt-2 border-t border-(--palette-line-soft) pt-2 text-[11px] text-(--palette-gray-400)">
          {t(isPinned ? 'list.filters.pinnedValueHint' : 'list.filters.unpinnedValueHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="w-64">
      <div className="max-h-80 overflow-y-auto">
        {heading(t('list.filters.pinnedGroup'))}
        {pinned.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-(--palette-gray-400)">
            {t('list.filters.noPinned')}
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pinnedKeys} strategy={verticalListSortingStrategy}>
              {pinned.map(field => (
                <PinnedRow
                  key={field.key}
                  field={field}
                  values={values}
                  showRing={showRing}
                  onOpen={() => setOpenKey(field.key)}
                  onTogglePin={() => onTogglePin(field.key)}
                  onPinKeyDown={moveWithKeys(field.key)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {others.length > 0 && (
          <>
            {heading(t('list.filters.otherGroup'), t('list.filters.otherHint'), true)}
            {others.map(field => (
              <RowBody
                key={field.key}
                field={field}
                values={values}
                isPinned={false}
                showRing={showRing}
                onOpen={() => setOpenKey(field.key)}
                onTogglePin={() => onTogglePin(field.key)}
              />
            ))}
          </>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-(--palette-line-soft) px-2 pt-2">
        <button
          type="button"
          onClick={onResetPins}
          disabled={!canReset}
          style={NO_OUTLINE}
          className={`rounded text-xs text-(--palette-primary-text) hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline ${
            showRing ? KEYBOARD_RING_PLAIN : ''
          }`}
        >
          {t('list.filters.resetPins')}
        </button>
        <span className="text-[11px] text-(--palette-gray-400)">{t('list.filters.escClose')}</span>
      </div>
    </div>
  );
}
