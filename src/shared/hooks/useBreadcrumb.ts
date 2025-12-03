import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBreadcrumbStore } from '@shared/store';
import { mainNavigation, type NavItem } from '@shared/config/navigation';

// Build a flat map of all routes from navigation config
function buildRouteMap(
  items: NavItem[],
  map: Map<string, NavItem> = new Map(),
): Map<string, NavItem> {
  for (const item of items) {
    map.set(item.href, item);
    if (item.children) {
      buildRouteMap(item.children, map);
    }
  }
  return map;
}

const routeMap = buildRouteMap(mainNavigation);

/**
 * Hook to automatically track breadcrumb based on navigation
 * @param customLabel - Optional custom label for the current page
 * @param customIcon - Optional custom icon for the current page
 */
export function useBreadcrumb(customLabel?: string, customIcon?: string) {
  const location = useLocation();
  const { items, push, reset, setItems } = useBreadcrumbStore();

  useEffect(() => {
    const path = location.pathname;
    const navItem = routeMap.get(path);
    const label = customLabel || navItem?.name || path.split('/').pop() || 'Page';
    const icon = customIcon || navItem?.icon;

    // Reset breadcrumb if navigating to home
    if (path === '/') {
      reset();
      return;
    }

    // If navigating to a sidebar menu item, reset and show only that item
    // This prevents stacking when clicking different menu items
    if (navItem) {
      setItems([{ label, href: path, icon }]);
      return;
    }

    // For pages not in navigation (detail pages, etc.), push to stack
    push({ label, href: path, icon });
  }, [location.pathname, customLabel, customIcon, push, reset, setItems]);

  return { items };
}

/**
 * Hook to set breadcrumb items manually
 * Useful for pages with dynamic content or nested routes
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
