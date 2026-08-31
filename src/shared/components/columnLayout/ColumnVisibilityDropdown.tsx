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

interface ColumnVisibilityDropdownProps<K extends string> {
  orderedColumns: K[];
  hidden: Set<K>;
  alwaysVisible: Set<K>;
  /**
   * Display label per column key. Passed in rather than read from a registry so this component
   * stays independent of any one feature's column definitions — and so the caller can translate.
   */
  labels: Record<string, string>;
  onToggle: (key: K) => void;
  onReorder: (activeId: K, overId: K) => void;
  onReset: () => void;
  /**
   * Extra switches rendered below the sortable list, for columns that are toggleable but live
   * outside the persisted set — a row-number column, for instance, which is neither a field of
   * the row type nor a sort target and would otherwise squat on a key forever.
   */
  extraToggles?: { key: string; label: string; checked: boolean; onChange: () => void }[];
}

// Individual sortable row
function SortableColumnRow<K extends string>({
  columnKey,
  label,
  isVisible,
  alwaysVisible,
  onToggle,
  t,
}: {
  columnKey: K;
  label: string;
  isVisible: boolean;
  alwaysVisible: boolean;
  onToggle: (key: K) => void;
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

      {/* Label */}
      <span
        className={`text-sm flex-1 select-none ${
          isVisible ? 'text-gray-700' : 'text-gray-400 line-through'
        }`}
      >
        {label}
      </span>

      {/* Eye toggle / fixed badge */}
      {alwaysVisible ? (
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
          {t('columns.fixed')}
        </span>
      ) : (
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
  onToggle,
  onReorder,
  onReset,
  extraToggles,
}: ColumnVisibilityDropdownProps<K>) {
  const { t } = useTranslation('common');
  // Count what the user would see as "off": hidden managed columns plus any extra switch that is
  // currently unchecked. A badge that ignored the extras would read 0 with the row numbers off.
  const hiddenCount = hidden.size + (extraToggles?.filter(x => !x.checked).length ?? 0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as K, over.id as K);
    }
  }

  return (
    <Popover className="relative">
      {/* h-full lets a flex parent with items-stretch size this to match its neighbours; it falls
          back to the square 36px anywhere else, because size-9 still sets the height. */}
      <PopoverButton
        title={t('columns.toggleColumns')}
        className={`relative flex h-full items-center justify-center size-9 border rounded-lg outline-none transition-all ${
          hiddenCount > 0
            ? 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100'
            : 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300'
        }`}
      >
        <Icon style="solid" name="table-columns" className="size-4 text-indigo-500" />
        {hiddenCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center size-4 rounded-full bg-indigo-500 text-white text-[10px] font-semibold leading-none">
            {hiddenCount}
          </span>
        )}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom start"
        className="z-50 mt-1.5 w-64 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('columns.title')}
          </span>
          <button
            onClick={onReset}
            className="text-xs text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={hiddenCount === 0}
          >
            {t('columns.reset')}
          </button>
        </div>

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
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Toggles that are not part of the reorderable, persisted set */}
        {extraToggles && extraToggles.length > 0 && (
          <div className="border-t border-gray-100 p-1.5">
            {extraToggles.map(x => (
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
                  <Icon style="solid" name={x.checked ? 'eye' : 'eye-slash'} className="size-3.5" />
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-[11px] text-gray-400">{t('columns.dragHint')}</p>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
