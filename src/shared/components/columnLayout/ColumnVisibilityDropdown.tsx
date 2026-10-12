import type { ReactNode } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Icon from '@/shared/components/Icon';
import { KEYBOARD_RING, NO_OUTLINE } from '@/shared/hooks/usePointerMode';
import { neutralToolButtonClass } from './toolButton';

interface ColumnVisibilityDropdownProps<K extends string> {
  /**
   * Opt-in: the button draws its own focus ring instead of the global outline, which is switched
   * off — 'ring' wears the keyboard ring, 'none' wears nothing (the caller says which, from
   * usePointerMode). Omitted, the button keeps the global outline as before.
   */
  focusRing?: 'ring' | 'none';
  /**
   * Opt-in: the button is the plain neutral tool button (see `neutralToolButtonClass`) instead of
   * the tinted indigo one, with no count badge — a customised layout shows as the button's active
   * state. Omitted, the other screens keep the indigo button.
   */
  neutralButton?: boolean;
  /**
   * Opt-in: each row has a real checkbox for visibility in place of the eye icon (and the extra
   * toggles become checkboxes too). The row itself still toggles when clicked.
   */
  checkboxes?: boolean;
  orderedColumns: K[];
  hidden: Set<K>;
  alwaysVisible: Set<K>;
  /**
   * How many columns the user has hidden BEYOND the screen's defaults. Drives the badge and
   * whether Reset is offered; falls back to `hidden.size` for callers with no defaults.
   */
  hiddenBeyondDefault?: number;
  /**
   * Display label per column key. Passed in rather than read from a registry so this component
   * stays independent of any one feature's column definitions — and so the caller can translate.
   */
  labels: Record<string, string>;
  onToggle: (key: K) => void;
  onReorder: (activeId: K, overId: K) => void;
  onReset: () => void;
  /**
   * Whether Reset has anything to undo. Omit and the button falls back to "some column is hidden",
   * which is right only when `onReset` restores visibility and nothing else.
   */
  canReset?: boolean;
  /**
   * Extra switches rendered below the sortable list, for columns that are toggleable but live
   * outside the persisted set — a row-number column, for instance, which is neither a field of
   * the row type nor a sort target and would otherwise squat on a key forever.
   */
  extraToggles?: { key: string; label: string; checked: boolean; onChange: () => void }[];
  /** Rendered at the top of the panel, above the column list — e.g. a density switch. */
  panelHeader?: ReactNode;
}

// Individual sortable row
function SortableColumnRow<K extends string>({
  columnKey,
  label,
  isVisible,
  alwaysVisible,
  onToggle,
  checkbox,
  t,
}: {
  columnKey: K;
  label: string;
  isVisible: boolean;
  alwaysVisible: boolean;
  onToggle: (key: K) => void;
  checkbox: boolean;
  t: TFunction<'common'>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnKey,
    disabled: alwaysVisible,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={alwaysVisible ? undefined : () => onToggle(columnKey)}
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
        isDragging
          ? 'bg-gray-100 shadow-sm'
          : alwaysVisible
            ? 'cursor-default'
            : 'hover:bg-gray-50 cursor-pointer'
      } ${!isVisible && !isDragging ? 'opacity-60' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={`text-gray-300 hover:text-gray-500 flex-shrink-0 cursor-grab active:cursor-grabbing ${
          alwaysVisible ? 'invisible' : ''
        }`}
        tabIndex={-1}
        aria-label={t('columns.dragToReorder')}
      >
        <Icon style="solid" name="grip-dots-vertical" className="size-3.5" />
      </button>

      {checkbox && (
        // A real checkbox: the row's own click toggles too, so this one stops the event reaching it
        // (otherwise a click on the box would toggle twice).
        <input
          type="checkbox"
          checked={isVisible}
          disabled={alwaysVisible}
          onChange={() => onToggle(columnKey)}
          onClick={e => e.stopPropagation()}
          aria-label={label}
          className="checkbox checkbox-xs checkbox-primary shrink-0 rounded-[4px]"
        />
      )}

      {/* Label */}
      <span
        className={`min-w-0 flex-1 select-none truncate text-sm ${
          isVisible ? 'text-gray-700' : 'text-gray-400'
        } ${!checkbox && !isVisible ? 'line-through' : ''}`}
      >
        {label}
      </span>

      {/* Eye toggle / fixed badge */}
      {alwaysVisible ? (
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
          {t('columns.fixed')}
        </span>
      ) : checkbox ? null : (
        <button
          onClick={e => {
            e.stopPropagation();
            onToggle(columnKey);
          }}
          className={`flex-shrink-0 p-0.5 rounded transition-colors ${
            isVisible
              ? 'text-emerald-500 hover:text-emerald-600'
              : 'text-gray-300 hover:text-gray-400'
          }`}
          aria-label={isVisible ? t('columns.hideColumn') : t('columns.showColumn')}
        >
          <Icon style="solid" name={isVisible ? 'eye' : 'eye-slash'} className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function ColumnVisibilityDropdown<K extends string>({
  orderedColumns,
  hidden,
  alwaysVisible,
  labels,
  hiddenBeyondDefault,
  onToggle,
  onReorder,
  onReset,
  canReset,
  extraToggles,
  panelHeader,
  focusRing,
  neutralButton = false,
  checkboxes = false,
}: ColumnVisibilityDropdownProps<K>) {
  const { t } = useTranslation('common');
  // What the user would see as "off" relative to how the screen looks out of the box: columns they
  // hid themselves, plus any extra switch currently unchecked. Using `hidden.size` would put a
  // count on a screen nobody has customised, for columns that are off by design.
  const hiddenCount =
    (hiddenBeyondDefault ?? hidden.size) + (extraToggles?.filter(x => !x.checked).length ?? 0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as K, over.id as K);
    }
  }

  return (
    // h-full on the root too: the wrapper a caller stretches is this component's PARENT, and
    // without passing that height through, the button's own h-full resolved against an auto-height
    // Popover and silently fell back to 36px — which is what made the task toolbars look wrong.
    <Popover className="relative h-full">
      {/* Height is `h-full` floored by `min-h-9`, never `size-9`: h-full and size-9 both set
          height, so which one applied came down to the order Tailwind emitted them in, and the
          button rendered a different size on different pages. This pair cannot conflict — it
          matches a parent that has a definite height, and falls back to the square 36px when it
          does not. In a row laid out with items-end (the task toolbars) give the wrapper
          `self-stretch` so there IS a definite height to match. */}
      <PopoverButton
        title={t('columns.toggleColumns')}
        aria-label={t('columns.toggleColumns')}
        style={focusRing ? NO_OUTLINE : undefined}
        className={
          neutralButton
            ? `${neutralToolButtonClass(hiddenCount > 0)} ${focusRing === 'ring' ? KEYBOARD_RING : ''}`
            : `relative flex h-full min-h-9 w-9 items-center justify-center border rounded-lg outline-none transition-all ${
                focusRing === 'ring' ? KEYBOARD_RING : ''
              } ${
                hiddenCount > 0
                  ? 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100'
                  : 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300'
              }`
        }
      >
        <Icon
          style="solid"
          name="table-columns"
          className={`size-4 ${neutralButton ? '' : 'text-indigo-500'}`}
        />
        {hiddenCount > 0 && !neutralButton && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center size-4 rounded-full bg-indigo-500 text-white text-[10px] font-semibold leading-none">
            {hiddenCount}
          </span>
        )}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom start"
        className={`z-50 mt-1.5 ${checkboxes ? 'w-72' : 'w-64'} bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('columns.title')}
          </span>
          <button
            onClick={onReset}
            className="text-xs text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            // The dropdown cannot know what `onReset` restores — on the appraisal list it also
            // clears column widths and switches the row-number column back on. Callers that reset
            // more than visibility pass `canReset` so resizing a column without hiding one does
            // not leave the only control that undoes it greyed out.
            disabled={canReset === undefined ? hiddenCount === 0 : !canReset}
          >
            {t('columns.reset')}
          </button>
        </div>

        {panelHeader}

        {/* Sortable list */}
        <div className="overflow-y-auto max-h-80 p-1.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedColumns} strategy={verticalListSortingStrategy}>
              {orderedColumns.map(key => (
                <SortableColumnRow
                  key={key}
                  columnKey={key}
                  label={labels[key] ?? key}
                  isVisible={!hidden.has(key)}
                  alwaysVisible={alwaysVisible.has(key)}
                  onToggle={onToggle}
                  checkbox={checkboxes}
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Toggles that are not part of the reorderable, persisted set */}
        {extraToggles && extraToggles.length > 0 && (
          <div className="border-t border-gray-100 p-1.5">
            {extraToggles.map(x =>
              checkboxes ? (
                // A label, so a click anywhere on the row toggles the real checkbox inside it (a
                // button cannot hold one).
                <label
                  key={x.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-gray-50"
                >
                  <span className="size-3.5 flex-shrink-0" />
                  <input
                    type="checkbox"
                    checked={x.checked}
                    onChange={x.onChange}
                    className="checkbox checkbox-xs checkbox-primary shrink-0 rounded-[4px]"
                  />
                  <span
                    className={`flex-1 select-none text-sm ${x.checked ? 'text-gray-700' : 'text-gray-400'}`}
                  >
                    {x.label}
                  </span>
                </label>
              ) : (
                // One <button role="switch"> for the whole row, unlike the sortable rows above:
                // those need a div because their drag handle is itself a button and nesting buttons
                // is invalid HTML. These rows have no handle, so they can be focusable and
                // keyboard-operable without that compromise.
                <button
                  key={x.key}
                  type="button"
                  role="switch"
                  aria-checked={x.checked}
                  onClick={x.onChange}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-gray-50 cursor-pointer text-left"
                >
                  {/* Spacer matching the drag handle above, so the labels line up */}
                  <span className="size-3.5 flex-shrink-0" />
                  <span
                    className={`text-sm flex-1 select-none ${
                      x.checked ? 'text-gray-700' : 'text-gray-400 line-through'
                    }`}
                  >
                    {x.label}
                  </span>
                  <span
                    className={`flex-shrink-0 p-0.5 rounded transition-colors ${
                      x.checked ? 'text-emerald-500' : 'text-gray-300'
                    }`}
                  >
                    <Icon
                      style="solid"
                      name={x.checked ? 'eye' : 'eye-slash'}
                      className="size-3.5"
                    />
                  </span>
                </button>
              ),
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{t('columns.dragHint')}</p>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
