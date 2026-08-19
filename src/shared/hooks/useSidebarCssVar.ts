import { useLayoutEffect } from 'react';
import { useUIStore } from '@shared/store';
import { SIDEBAR_COLLAPSED_WIDTH } from '@shared/components/sidebarConstants';
import { DENSITY_SCALE } from '@shared/components/densityConstants';

/**
 * Publishes the sidebar width as --cas-sidebar-w. The stored width is "design px"
 * (what the user dragged at density 1); the density scale is applied here only, so
 * the sidebar shrinks with the rest of the UI instead of staying fixed px.
 */
export function useSidebarCssVar() {
  const collapsed = useUIStore(s => s.sidebarCollapsed);
  const width = useUIStore(s => s.sidebarWidth);
  const density = useUIStore(s => s.density);
  useLayoutEffect(() => {
    const w = (collapsed ? SIDEBAR_COLLAPSED_WIDTH : width) * DENSITY_SCALE[density];
    document.documentElement.style.setProperty('--cas-sidebar-w', `${w}px`);
  }, [collapsed, width, density]);
}
