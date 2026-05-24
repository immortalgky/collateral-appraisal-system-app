import { useMemo, useCallback } from 'react';
import { z } from 'zod';
import { usePreferences } from '@shared/hooks/usePreferences';
import { useMenuStore } from '@features/menuManagement/store';
import type { MenuTreeNode } from '@features/menuManagement/types';
import { PREFERENCE_KEYS } from './preferenceKeys';

const favoritesSchema = z.array(z.string());

/**
 * A menu node is pinnable when it has a navigable path and is not a
 * folder-only parent (i.e. no children, or children are empty).
 */
export function isPinnable(node: MenuTreeNode): boolean {
  return node.path != null && (!node.children || node.children.length === 0);
}

/**
 * Recursively walk a MenuTreeNode[] and collect all nodes by id.
 */
function flattenNodes(nodes: MenuTreeNode[]): Map<string, MenuTreeNode> {
  const map = new Map<string, MenuTreeNode>();
  function walk(list: MenuTreeNode[]) {
    for (const node of list) {
      map.set(node.id, node);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return map;
}

export function useFavorites() {
  const main = useMenuStore(state => state.main);
  const appraisal = useMenuStore(state => state.appraisal);

  const {
    value: favoriteIds,
    setValue,
    isLoading,
    isFetching,
  } = usePreferences(PREFERENCE_KEYS.menuFavorites, [] as string[], favoritesSchema);

  // Build a flat id→node map from both trees (memoized)
  const nodeMap = useMemo(() => {
    const m = flattenNodes(main);
    for (const [k, v] of flattenNodes(appraisal)) {
      m.set(k, v);
    }
    return m;
  }, [main, appraisal]);

  // Resolve IDs to full nodes; silently drop unknown/non-existent IDs (D9)
  const favoriteItems: MenuTreeNode[] = useMemo(
    () =>
      favoriteIds
        .map(id => nodeMap.get(id))
        .filter((node): node is MenuTreeNode => node !== undefined),
    [favoriteIds, nodeMap],
  );

  const isPinned = useCallback((id: string): boolean => favoriteIds.includes(id), [favoriteIds]);

  const add = useCallback(
    (id: string) => {
      if (!favoriteIds.includes(id)) {
        setValue([...favoriteIds, id]);
      }
    },
    [favoriteIds, setValue],
  );

  const remove = useCallback(
    (id: string) => {
      setValue(favoriteIds.filter(fid => fid !== id));
    },
    [favoriteIds, setValue],
  );

  const toggle = useCallback(
    (id: string) => {
      if (favoriteIds.includes(id)) {
        setValue(favoriteIds.filter(fid => fid !== id));
      } else {
        setValue([...favoriteIds, id]);
      }
    },
    [favoriteIds, setValue],
  );

  const reorder = useCallback((newIds: string[]) => setValue(newIds), [setValue]);
  const replace = useCallback((newIds: string[]) => setValue(newIds), [setValue]);

  return {
    favoriteIds,
    favoriteItems,
    toggle,
    add,
    remove,
    reorder,
    replace,
    isPinned,
    isLoading,
    isFetching,
  };
}
