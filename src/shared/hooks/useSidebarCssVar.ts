import { useLayoutEffect } from 'react';
import { useUIStore } from '@shared/store';
import type { SidebarScope } from '@shared/types';
import { SIDEBAR_RAIL_WIDTH } from '@shared/components/sidebarConstants';
import { DENSITY_SCALE } from '@shared/components/densityConstants';

/**
 * Publishes the sidebar width as --cas-sidebar-w. The stored width is "design px"
 * (what the user dragged at density 1); the density scale is applied here only, so
 * the sidebar shrinks with the rest of the UI instead of staying fixed px. The rail is in rem, which
 * already carries density and the viewport step, so it stays sized to its rem-based icon column.
 */
export function useSidebarCssVar(scope: SidebarScope) {
  const collapsed = useUIStore(s => s.sidebarCollapsed[scope]);
  const width = useUIStore(s => s.sidebarWidth);
  const density = useUIStore(s => s.density);
  useLayoutEffect(() => {
    const w = collapsed ? SIDEBAR_RAIL_WIDTH : `${width * DENSITY_SCALE[density]}px`;
    document.documentElement.style.setProperty('--cas-sidebar-w', w);
  }, [collapsed, width, density]);
}
