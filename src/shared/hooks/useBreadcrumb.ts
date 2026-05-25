import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBreadcrumbStore } from '@shared/store';
import { useMenuStore } from '@features/menuManagement/store';
import { resolveLabel } from '@features/menuManagement/utils/label';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '@shared/config/navigationTypes';
import type { MenuTreeNode } from '@features/menuManagement/types';

/** Recursively flatten a MenuTreeNode tree into a path→NavItem map */
function buildRouteMap(
  nodes: MenuTreeNode[],
  lang: string,
  map: Map<string, NavItem> = new Map(),
): Map<string, NavItem> {
  for (const node of nodes) {
    if (node.path) {
      map.set(node.path, {
        itemKey: node.itemKey,
        name: resolveLabel(node.labels, lang),
        href: node.path,
        icon: node.iconName,
        iconStyle: node.iconStyle,
        iconColor: node.iconColor ?? undefined,
        canView: true,
        canEdit: node.canEdit,
        pinnable: false,
      });
    }
    if (node.children?.length) {
      buildRouteMap(node.children, lang, map);
    }
  }
  return map;
}

/**
 * Hook to automatically track breadcrumb based on navigation
 * @param customLabel - Optional custom label for the current page
 * @param customIcon - Optional custom icon for the current page
 */
export function useBreadcrumb(customLabel?: string, customIcon?: string) {
  const location = useLocation();
  const items = useBreadcrumbStore(state => state.items);
  const push = useBreadcrumbStore(state => state.push);
  const reset = useBreadcrumbStore(state => state.reset);
  const setItems = useBreadcrumbStore(state => state.setItems);
  const main = useMenuStore(state => state.main);
  const { i18n } = useTranslation();
  const lang = i18n.language;

  useEffect(() => {
    const path = location.pathname;
    const routeMap = buildRouteMap(main, lang);
    const navItem = routeMap.get(path);
    const icon = customIcon || navItem?.icon;

    // Reset breadcrumb if navigating to home
    if (path === '/') {
      reset();
      return;
    }

    // If navigating to a sidebar menu item, reset and show only that item
    if (navItem) {
      const label = customLabel || navItem.name;
      setItems([{ label, href: path, icon }]);
      return;
    }

    // For pages not in navigation (detail pages, etc.):
    // On a fresh load (e.g. browser refresh of a deep link) the breadcrumb store
    // is empty and the nav-history-based push below would render just the leaf
    // with no parent. Walk up the URL to seed the nearest menu ancestor.
    const currentItems = useBreadcrumbStore.getState().items;
    if (currentItems.length === 0) {
      const segments = path.split('/').filter(Boolean);
      for (let i = segments.length - 1; i >= 1; i--) {
        const ancestorPath = '/' + segments.slice(0, i).join('/');
        const ancestor = routeMap.get(ancestorPath);
        if (ancestor) {
          setItems([{ label: ancestor.name, href: ancestor.href, icon: ancestor.icon }]);
          break;
        }
      }
    }

    if (customLabel) {
      const itemsAfterSeed = useBreadcrumbStore.getState().items;
      const existingIndex = itemsAfterSeed.findIndex(i => i.href === path);

      if (existingIndex !== -1) {
        if (itemsAfterSeed[existingIndex].label !== customLabel) {
          const updatedItems = [...itemsAfterSeed];
          updatedItems[existingIndex] = { label: customLabel, href: path, icon };
          setItems(updatedItems);
        }
      } else {
        push({ label: customLabel, href: path, icon });
      }
    }
  }, [location.pathname, customLabel, customIcon, push, reset, setItems, main, lang]);

  return { items };
}

/**
 * Hook to set breadcrumb items manually
 */
export function useSetBreadcrumb() {
  const { setItems, push, pop, reset, items } = useBreadcrumbStore();

  return {
    items,
    setItems,
    push,
    pop,
    reset,
  };
}

export default useBreadcrumb;
