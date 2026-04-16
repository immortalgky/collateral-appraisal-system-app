import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import type { MenuItemAdminDto } from '../types';
import { useDeleteMenuItem, useReorderMenuItems } from '../hooks/useMenuItemMutations';

/** Pixels per indent level — matches the visual padding in the Name cell. */
const INDENT_WIDTH = 20;
/** Maximum allowed nesting depth (0 = root, 1 = child, 2 = grandchild). */
const MAX_DEPTH = 2;

interface FlatItem {
  id: string;
  depth: number;
  parentId: string | null;
  data: MenuItemAdminDto;
}

/** Convert a nested tree into a flat list, preserving depth and parentId. */
function flattenTree(
  nodes: MenuItemAdminDto[],
  depth = 0,
  parentId: string | null = null,
): FlatItem[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];
  return nodes.flatMap(node => [
    { id: node.id, depth, parentId, data: node },
    ...flattenTree(node.children ?? [], depth + 1, node.id),
  ]);
}

/** Count how many descendants the item at `index` has in the flat list. */
function getSubtreeCount(items: FlatItem[], index: number): number {
  const baseDepth = items[index].depth;
  let count = 0;
  for (let i = index + 1; i < items.length; i++) {
    if (items[i].depth <= baseDepth) break;
    count++;
  }
  return count;
}

/**
 * Walk backwards from `index` to find the nearest item with depth === targetDepth - 1.
 * Returns null if depth === 0 (root) or no ancestor is found.
 */
function getNewParentId(items: FlatItem[], index: number, depth: number): string | null {
  if (depth === 0) return null;
  for (let i = index - 1; i >= 0; i--) {
    if (items[i].depth === depth - 1) return items[i].id;
    if (items[i].depth < depth - 1) return null;
  }
  return null;
}

interface MenuTreeTableProps {
  items: MenuItemAdminDto[];
  onReordered?: () => void;
}

interface SortableRowProps {
  flatItem: FlatItem;
  onDelete: (id: string, isSystem: boolean) => void;
}

function SortableRow({ flatItem, onDelete }: SortableRowProps) {
  const { data: item, depth } = flatItem;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: flatItem.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={clsx('border-b border-gray-100', isDragging && 'bg-blue-50')}
    >
      <td className="px-4 py-2 w-8">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <Icon name="grip-vertical" style="solid" className="size-4" />
        </button>
      </td>
      <td className="px-4 py-2">
        <div style={{ paddingLeft: depth * INDENT_WIDTH }} className="flex items-center gap-2">
          <Icon
            name={item.iconName}
            style={item.iconStyle}
            className={clsx('size-4', item.iconColor)}
          />
          <span className="text-sm font-medium text-gray-800">
            {item.labels?.en ?? item.itemKey}
          </span>
          {item.isSystem && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              system
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2 text-xs text-gray-500 font-mono">{item.itemKey}</td>
      <td className="px-4 py-2 text-xs text-gray-500">{item.scope}</td>
      <td className="px-4 py-2 text-xs text-gray-500">{item.viewPermissionCode}</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/menus/${item.id}`}
            className="text-xs text-primary hover:underline font-medium"
          >
            Edit
          </Link>
          {!item.isSystem && (
            <button
              type="button"
              onClick={() => onDelete(item.id, item.isSystem)}
              className="text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Drag-reorder tree table for menu items.
 *
 * Stores a flat representation as state (no `flatten` on every render).
 * On drag end:
 *   - Moves the dragged item and all its descendants as a unit.
 *   - Adjusts depth based on horizontal drag delta (drag right = deeper, left = shallower).
 *   - Sends full flat list to PUT /admin/menus/reorder with updated sortOrder + parentId.
 *
 * Depth constraints:
 *   - Cannot be nested deeper than MAX_DEPTH.
 *   - Cannot be deeper than prevItem.depth + 1 (no depth gap).
 *   - Cannot be shallower than nextItem.depth (would orphan the following item).
 */
export function MenuTreeTable({ items, onReordered }: MenuTreeTableProps) {
  const { mutate: reorder } = useReorderMenuItems();
  const { mutate: deleteItem } = useDeleteMenuItem();
  const [flatItems, setFlatItems] = useState<FlatItem[]>(() => flattenTree(items));

  const ids = flatItems.map(f => f.id);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = flatItems.findIndex(f => f.id === active.id);
    const overIndex = flatItems.findIndex(f => f.id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;

    const subtreeCount = getSubtreeCount(flatItems, activeIndex);

    // Prevent dropping a parent inside its own subtree
    if (overIndex > activeIndex && overIndex <= activeIndex + subtreeCount) return;

    // Extract the subtree (item + all descendants)
    const subtree = flatItems.slice(activeIndex, activeIndex + 1 + subtreeCount);

    // Remove subtree from the list
    const withoutSubtree = [
      ...flatItems.slice(0, activeIndex),
      ...flatItems.slice(activeIndex + 1 + subtreeCount),
    ];

    // Compute insertion index in the reduced list.
    // When moving down, items above the old position shift up by subtreeCount.
    const insertAt = overIndex > activeIndex ? overIndex - subtreeCount : overIndex;

    // Compute new depth for the moved item based on horizontal drag delta.
    // delta.x > 0 = dragged right = deeper; delta.x < 0 = dragged left = shallower.
    const draggedItem = subtree[0];
    const prevItem = withoutSubtree[insertAt - 1];
    const nextItem = withoutSubtree[insertAt];

    const dragDepthChange = Math.round(delta.x / INDENT_WIDTH);
    const rawNewDepth = draggedItem.depth + dragDepthChange;
    const maxDepth = Math.min(MAX_DEPTH, prevItem ? prevItem.depth + 1 : 0);
    const minDepth = nextItem ? nextItem.depth : 0;
    const newDepth = Math.max(minDepth, Math.min(maxDepth, rawNewDepth));
    const depthDelta = newDepth - draggedItem.depth;

    // Apply depth delta to the moved subtree (capped at MAX_DEPTH)
    const movedIds = new Set(subtree.map(f => f.id));
    const updatedSubtree = subtree.map(f => ({
      ...f,
      depth: Math.min(MAX_DEPTH, f.depth + depthDelta),
    }));

    // Reassemble the full list
    const merged = [
      ...withoutSubtree.slice(0, insertAt),
      ...updatedSubtree,
      ...withoutSubtree.slice(insertAt),
    ];

    // Recompute parentId only for moved items; non-moved items keep theirs
    const finalItems = merged.map((f, i) => {
      if (!movedIds.has(f.id)) return f;
      return { ...f, parentId: getNewParentId(merged, i, f.depth) };
    });

    setFlatItems(finalItems);

    reorder(
      {
        items: finalItems.map((f, idx) => ({
          id: f.id,
          parentId: f.parentId,
          sortOrder: (idx + 1) * 10,
        })),
      },
      { onSuccess: () => onReordered?.() },
    );
  };

  const handleDelete = (id: string, isSystem: boolean) => {
    if (isSystem) return;
    if (!confirm('Delete this menu item? This cannot be undone.')) return;
    deleteItem(id, { onSuccess: () => onReordered?.() });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <p className="px-4 py-2 text-xs text-gray-400">
            Drag vertically to reorder. Drag right to nest under the item above; drag left to
            promote to a higher level.
          </p>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Item Key</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">View Permission</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {flatItems.map(flatItem => (
                <SortableRow key={flatItem.id} flatItem={flatItem} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  );
}
