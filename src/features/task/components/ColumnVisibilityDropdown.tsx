import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { columnDefs } from '../config/columnDefs';
import type { ColumnKey } from '../config/columnDefs';
import Icon from '@/shared/components/Icon';

interface ColumnVisibilityDropdownProps {
  orderedColumns: ColumnKey[];
  hidden: Set<ColumnKey>;
  alwaysVisible: Set<ColumnKey>;
  onToggle: (key: ColumnKey) => void;
  onReorder: (activeId: ColumnKey, overId: ColumnKey) => void;
  onReset: () => void;
}

// Individual sortable row
function SortableColumnRow({
  columnKey,
  isVisible,
  alwaysVisible,
  onToggle,
}: {
  columnKey: ColumnKey;
  isVisible: boolean;
  alwaysVisible: boolean;
  onToggle: (key: ColumnKey) => void;
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
        aria-label="Drag to reorder"
      >
        <Icon style="solid" name="grip-dots-vertical" className="size-3.5" />
      </button>

      {/* Label */}
      <span
        className={`text-sm flex-1 select-none ${
          isVisible ? 'text-gray-700' : 'text-gray-400 line-through'
        }`}
      >
        {columnDefs[columnKey].label}
      </span>

      {/* Eye toggle / fixed badge */}
      {alwaysVisible ? (
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
          fixed
        </span>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(columnKey); }}
          className={`flex-shrink-0 p-0.5 rounded transition-colors ${
            isVisible
              ? 'text-emerald-500 hover:text-emerald-600'
              : 'text-gray-300 hover:text-gray-400'
          }`}
          aria-label={isVisible ? 'Hide column' : 'Show column'}
        >
          <Icon
            style="solid"
            name={isVisible ? 'eye' : 'eye-slash'}
            className="size-3.5"
          />
        </button>
      )}
    </div>
  );
}

export function ColumnVisibilityDropdown({
  orderedColumns,
  hidden,
  alwaysVisible,
  onToggle,
  onReorder,
  onReset,
}: ColumnVisibilityDropdownProps) {
  const hiddenCount = hidden.size;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as ColumnKey, over.id as ColumnKey);
    }
  }

  return (
    <Popover className="relative">
      <PopoverButton
        title="Toggle Columns"
        className={`relative flex items-center justify-center size-9 border rounded-lg outline-none transition-all ${
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
            Columns
          </span>
          <button
            onClick={onReset}
            className="text-xs text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={hidden.size === 0}
          >
            Reset
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
              {orderedColumns.map((key) => (
                <SortableColumnRow
                  key={key}
                  columnKey={key}
                  isVisible={!hidden.has(key)}
                  alwaysVisible={alwaysVisible.has(key)}
                  onToggle={onToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-[11px] text-gray-400">Drag rows to reorder columns</p>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
