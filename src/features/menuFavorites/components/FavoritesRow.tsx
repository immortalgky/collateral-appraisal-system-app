import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '@shared/components/Icon';
import { getIconBgClass } from '@shared/components/icon-bg';
import type { MenuTreeNode } from '@features/menuManagement/types';
import { useFavorites } from '../useFavorites';
import { FavoritesPickerModal } from './FavoritesPickerModal';

interface SortableTileProps {
  node: MenuTreeNode;
  lang: string;
}

function SortableTile({ node, lang }: SortableTileProps) {
  const { t } = useTranslation('common');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  const label = node.labels[lang] ?? node.labels['en'] ?? node.itemKey;

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex-shrink-0">
      <div
        className={`group relative flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all select-none max-w-[160px] ${
          isDragging
            ? 'bg-white shadow-md border-primary/20'
            : 'bg-white border-gray-100 hover:border-primary/20 hover:bg-primary/5'
        }`}
      >
        {/* Drag handle — positioned absolutely to not interfere with link focus */}
        <button
          type="button"
          {...listeners}
          aria-label={t('favorites.aria.reorder')}
          className="absolute inset-0 rounded-lg cursor-grab active:cursor-grabbing focus:outline-none"
          tabIndex={-1}
        />
        <Link
          to={node.path!}
          title={label}
          draggable={false}
          onClick={e => {
            if (isDragging) e.preventDefault();
          }}
          className="relative z-10 flex items-center gap-1.5 min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 rounded"
        >
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${getIconBgClass(node.iconColor)}`}
          >
            <Icon
              name={node.iconName}
              style={node.iconStyle}
              className={`size-2.5 ${node.iconColor ?? 'text-gray-500'}`}
            />
          </div>
          <span className="text-[11px] font-medium text-gray-700 truncate">{label}</span>
        </Link>
      </div>
    </div>
  );
}

export function FavoritesRow() {
  const { t, i18n } = useTranslation('common');
  const lang = i18n.language ?? 'en';
  const { favoriteItems, favoriteIds, reorder, replace, isLoading } = useFavorites();
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const oldIndex = favoriteIds.indexOf(activeId);
    const newIndex = favoriteIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...favoriteIds];
    next.splice(oldIndex, 1);
    next.splice(newIndex, 0, activeId);
    reorder(next);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-24 h-7 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={favoriteIds} strategy={horizontalListSortingStrategy}>
            {favoriteItems.map(node => (
              <SortableTile key={node.id} node={node} lang={lang} />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add (+) tile */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          title={t('favorites.picker.title')}
          className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dashed border-gray-200 bg-white hover:border-primary/30 hover:bg-primary/5 transition-all group cursor-pointer"
        >
          <div className="w-5 h-5 rounded-md bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Icon
              style="solid"
              name="plus"
              className="size-2.5 text-gray-400 group-hover:text-primary"
            />
          </div>
          <span className="text-[11px] font-medium text-gray-400">
            {favoriteItems.length === 0 ? t('favorites.row.emptyHint') : t('favorites.row.addMore')}
          </span>
        </button>
      </div>

      <FavoritesPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentIds={favoriteIds}
        onApply={replace}
      />
    </>
  );
}
