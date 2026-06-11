import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { SortableTh } from './SortableTh';
import { nextSort, type SortDir } from '../tableSort';

/** Pixels per indent level — matches the visual padding in the Name cell. */
const INDENT_WIDTH = 20;
/** Maximum allowed nesting depth (0 = root, 1 = child, 2 = grandchild). */
const MAX_DEPTH = 2;
/** Languages a menu item should be translated into. */
const REQUIRED_LANGS = ['en', 'th', 'zh'] as const;

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

/** Set of ids hidden because an ancestor is collapsed. */
function computeHidden(flat: FlatItem[], collapsedIds: Set<string>): Set<string> {
  const hidden = new Set<string>();
  let cutoff = Infinity;
  for (const f of flat) {
    if (f.depth > cutoff) {
      hidden.add(f.id);
      continue;
    }
    cutoff = collapsedIds.has(f.id) ? f.depth : Infinity;
  }
  return hidden;
}

function rowMatchesSearch(item: MenuItemAdminDto, q: string): boolean {
  const hay = [
    item.labels?.en ?? '',
    item.itemKey,
    item.path ?? '',
    item.viewPermissionCode ?? '',
    item.editPermissionCode ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

interface MenuTreeTableProps {
  items: MenuItemAdminDto[];
  onReordered?: () => void;
  /** Permission codes that actually exist — used to flag typos. Empty set disables the check. */
  validCodes?: Set<string>;
  /** When set, rows are evaluated against this role's permission codes (preview-as-role). */
  roleCodes?: Set<string> | null;
  searchText?: string;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
}

interface SortableRowProps {
  flatItem: FlatItem;
  onDelete: (id: string, isSystem: boolean) => void;
  validCodes?: Set<string>;
  roleCodes?: Set<string> | null;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  dndDisabled: boolean;
  /** When true (sorted view) the row is rendered flat, ignoring tree indentation. */
  flatten: boolean;
}

function PermChip({
  code,
  unknown,
  label,
}: {
  code: string | null;
  unknown: boolean;
  label: string;
}) {
  if (!code) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span
      title={unknown ? label : code}
      className={clsx(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px]',
        unknown ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-50 text-gray-500',
      )}
    >
      {unknown && <Icon name="triangle-exclamation" style="solid" className="size-2.5" />}
      {code}
    </span>
  );
}

function SortableRow({
  flatItem,
  onDelete,
  validCodes,
  roleCodes,
  hasChildren,
  isCollapsed,
  onToggleCollapse,
  dndDisabled,
  flatten,
}: SortableRowProps) {
  const { t } = useTranslation('menuManagement');
  const { data: item, depth } = flatItem;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: flatItem.id,
    disabled: dndDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const checkCodes = validCodes && validCodes.size > 0;
  const unknownView =
    !!checkCodes && !!item.viewPermissionCode && !validCodes!.has(item.viewPermissionCode);
  const unknownEdit =
    !!checkCodes && !!item.editPermissionCode && !validCodes!.has(item.editPermissionCode);
  const missingLangs = REQUIRED_LANGS.filter(l => !item.labels?.[l]?.trim());

  // Preview-as-role: role permissions are the ceiling.
  const roleCanView = roleCodes ? roleCodes.has(item.viewPermissionCode) : true;
  const roleCanEdit = roleCodes
    ? !!item.editPermissionCode && roleCodes.has(item.editPermissionCode)
    : true;
  const hiddenForRole = !!roleCodes && !roleCanView;
  const lockedForRole = !!roleCodes && roleCanView && !!item.editPermissionCode && !roleCanEdit;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={clsx(
        'border-b border-gray-100 hover:bg-gray-50/70 transition-colors',
        isDragging && 'bg-blue-50',
        hiddenForRole && 'opacity-40',
      )}
    >
      <td className="px-4 py-2 w-8">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={dndDisabled}
          className={clsx(
            'text-gray-300',
            dndDisabled
              ? 'cursor-not-allowed opacity-40'
              : 'cursor-grab hover:text-gray-500 active:cursor-grabbing',
          )}
          aria-label={t('aria.dragToReorder')}
        >
          <Icon name="grip-vertical" style="solid" className="size-4" />
        </button>
      </td>
      <td className="px-4 py-2">
        <div
          style={{ paddingLeft: flatten ? 0 : depth * INDENT_WIDTH }}
          className="flex items-center gap-2"
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleCollapse(item.id)}
              className="flex size-4 items-center justify-center text-gray-400 hover:text-gray-600"
              aria-label={isCollapsed ? t('tree.expand') : t('tree.collapse')}
            >
              <Icon
                name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                style="solid"
                className="size-3"
              />
            </button>
          ) : (
            <span className="size-4" />
          )}
          <div className="relative">
            <Icon
              name={item.iconName}
              style={item.iconStyle}
              className={clsx('size-4', item.iconColor)}
            />
            {lockedForRole && (
              <div className="absolute -bottom-1 -right-1 flex size-2.5 items-center justify-center rounded-full bg-white">
                <Icon name="lock" style="solid" className="size-1.5 text-gray-400" />
              </div>
            )}
          </div>
          <span
            title={hiddenForRole ? t('tree.hiddenForRole') : undefined}
            className={clsx(
              'text-sm font-medium text-gray-800 whitespace-nowrap',
              hiddenForRole && 'line-through decoration-gray-400 text-gray-400',
            )}
          >
            {item.labels?.en ?? item.itemKey}
          </span>
          {item.isSystem && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              {t('table.systemBadge')}
            </span>
          )}
          {missingLangs.length > 0 && missingLangs.length < REQUIRED_LANGS.length && (
            <span
              title={t('tree.missingI18n', { langs: missingLangs.join(', ') })}
              className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"
            >
              {t('tree.missingI18nShort', { langs: missingLangs.join('/') })}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2 text-xs text-gray-500 font-mono whitespace-nowrap">
        {item.itemKey}
      </td>
      <td
        className="px-4 py-2 text-xs text-gray-400 font-mono max-w-[14rem] truncate"
        title={item.path ?? ''}
      >
        {item.path ?? '—'}
      </td>
      <td className="px-4 py-2">
        <PermChip
          code={item.viewPermissionCode}
          unknown={unknownView}
          label={t('tree.unknownPerm')}
        />
      </td>
      <td className="px-4 py-2">
        <PermChip
          code={item.editPermissionCode}
          unknown={unknownEdit}
          label={t('tree.unknownPerm')}
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/menus/${item.id}`}
            className="text-xs text-primary hover:underline font-medium"
          >
            {t('table.actions.edit')}
          </Link>
          {!item.isSystem && (
            <button
              type="button"
              onClick={() => onDelete(item.id, item.isSystem)}
              className="text-xs text-red-500 hover:underline"
            >
              {t('table.actions.delete')}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Drag-reorder tree table for menu items, with permission chips, validation badges
 * (unknown permission / missing translation), preview-as-role, search, and collapse.
 *
 * Reordering operates on the full flat list, so it is disabled while a search filter
 * or any collapsed branch would hide rows (the user is shown a hint instead).
 */
export function MenuTreeTable({
  items,
  onReordered,
  validCodes,
  roleCodes,
  searchText = '',
  collapsedIds,
  onToggleCollapse,
}: MenuTreeTableProps) {
  const { t } = useTranslation('menuManagement');
  const { mutate: reorder } = useReorderMenuItems();
  const { mutate: deleteItem } = useDeleteMenuItem();
  const [flatItems, setFlatItems] = useState<FlatItem[]>(() => flattenTree(items));

  // Re-sync from the server list whenever it changes (delete, external edit, or the
  // refetch that follows an optimistic reorder). Without this the local flat copy
  // goes stale — e.g. a deleted row lingers until the tab remounts.
  useEffect(() => {
    setFlatItems(flattenTree(items));
  }, [items]);

  const parentIdsWithChildren = useMemo(
    () => new Set(flatItems.filter(f => f.parentId).map(f => f.parentId!)),
    [flatItems],
  );

  const [sort, setSort] = useState<{ key: string | null; dir: SortDir }>({ key: null, dir: 'asc' });
  const onSort = (key: string) => setSort(prev => nextSort(prev, key));

  const q = searchText.trim().toLowerCase();
  const isSearching = q.length > 0;
  // Drag operates on the natural tree order, so it's off while a filter/collapse/sort hides or reorders rows.
  const dndDisabled = isSearching || collapsedIds.size > 0 || sort.key !== null;

  // Visible rows: search wins over collapse; matched rows also reveal their ancestors.
  const visibleItems = useMemo(() => {
    if (isSearching) {
      const byId = new Map(flatItems.map(f => [f.id, f]));
      const visible = new Set<string>();
      flatItems.forEach(f => {
        if (rowMatchesSearch(f.data, q)) {
          visible.add(f.id);
          let pid = f.parentId;
          while (pid) {
            visible.add(pid);
            pid = byId.get(pid)?.parentId ?? null;
          }
        }
      });
      return flatItems.filter(f => visible.has(f.id));
    }
    const hidden = computeHidden(flatItems, collapsedIds);
    return flatItems.filter(f => !hidden.has(f.id));
  }, [flatItems, isSearching, q, collapsedIds]);

  const sortField = (f: FlatItem): string => {
    switch (sort.key) {
      case 'name':
        return f.data.labels?.en ?? f.data.itemKey;
      case 'itemKey':
        return f.data.itemKey;
      case 'path':
        return f.data.path ?? '';
      case 'view':
        return f.data.viewPermissionCode ?? '';
      case 'edit':
        return f.data.editPermissionCode ?? '';
      default:
        return '';
    }
  };
  const sortedVisible = useMemo(() => {
    if (!sort.key) return visibleItems;
    const arr = [...visibleItems];
    arr.sort((a, b) => {
      const cmp = sortField(a).localeCompare(sortField(b), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems, sort]);

  const ids = sortedVisible.map(f => f.id);

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

    const subtree = flatItems.slice(activeIndex, activeIndex + 1 + subtreeCount);

    const withoutSubtree = [
      ...flatItems.slice(0, activeIndex),
      ...flatItems.slice(activeIndex + 1 + subtreeCount),
    ];

    const insertAt = overIndex > activeIndex ? overIndex - subtreeCount : overIndex;

    const draggedItem = subtree[0];
    const prevItem = withoutSubtree[insertAt - 1];
    const nextItem = withoutSubtree[insertAt];

    const dragDepthChange = Math.round(delta.x / INDENT_WIDTH);
    const rawNewDepth = draggedItem.depth + dragDepthChange;
    const maxDepth = Math.min(MAX_DEPTH, prevItem ? prevItem.depth + 1 : 0);
    const minDepth = nextItem ? nextItem.depth : 0;
    const newDepth = Math.max(minDepth, Math.min(maxDepth, rawNewDepth));
    const depthDelta = newDepth - draggedItem.depth;

    const movedIds = new Set(subtree.map(f => f.id));
    const updatedSubtree = subtree.map(f => ({
      ...f,
      depth: Math.min(MAX_DEPTH, f.depth + depthDelta),
    }));

    const merged = [
      ...withoutSubtree.slice(0, insertAt),
      ...updatedSubtree,
      ...withoutSubtree.slice(insertAt),
    ];

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
    if (!confirm(t('confirm.deleteItem'))) return;
    deleteItem(id, { onSuccess: () => onReordered?.() });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <p className="px-4 py-2 text-xs text-gray-400">
            {dndDisabled ? t('tree.noReorderHint') : t('table.dragHint')}
          </p>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-8" />
                <SortableTh
                  label={t('table.columns.name')}
                  sortKey="name"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={onSort}
                  className="w-full"
                />
                <SortableTh
                  label={t('table.columns.itemKey')}
                  sortKey="itemKey"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={onSort}
                  className="whitespace-nowrap"
                />
                <SortableTh
                  label={t('tree.columns.path')}
                  sortKey="path"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={onSort}
                  className="whitespace-nowrap"
                />
                <SortableTh
                  label={t('table.columns.viewPermission')}
                  sortKey="view"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={onSort}
                  className="whitespace-nowrap"
                />
                <SortableTh
                  label={t('tree.columns.editPermission')}
                  sortKey="edit"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={onSort}
                  className="whitespace-nowrap"
                />
                <th
                  className="px-4 py-3 whitespace-nowrap"
                  aria-label={t('table.columns.actions')}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedVisible.map(flatItem => (
                <SortableRow
                  key={flatItem.id}
                  flatItem={flatItem}
                  onDelete={handleDelete}
                  validCodes={validCodes}
                  roleCodes={roleCodes}
                  hasChildren={parentIdsWithChildren.has(flatItem.id)}
                  isCollapsed={collapsedIds.has(flatItem.id)}
                  onToggleCollapse={onToggleCollapse}
                  dndDisabled={dndDisabled}
                  flatten={sort.key !== null}
                />
              ))}
              {sortedVisible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    {t('tree.emptyFiltered')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  );
}
