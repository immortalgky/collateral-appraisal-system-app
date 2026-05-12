import { useLayoutEffect } from 'react';
import { useUIStore } from '@shared/store';
import { SIDEBAR_COLLAPSED_WIDTH } from '@shared/components/sidebarConstants';

export function useSidebarCssVar() {
  const collapsed = useUIStore(s => s.sidebarCollapsed);
  const width = useUIStore(s => s.sidebarWidth);
  useLayoutEffect(() => {
    const w = collapsed ? SIDEBAR_COLLAPSED_WIDTH : width;
    document.documentElement.style.setProperty('--cas-sidebar-w', `${w}px`);
  }, [collapsed, width]);
}
