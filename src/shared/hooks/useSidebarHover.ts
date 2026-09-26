import { useUIStore } from '@shared/store';
import type { SidebarScope } from '@shared/types';
import { DENSITY_SCALE } from '@shared/components/densityConstants';
import { useHoverOverlay } from './useHoverOverlay';

const HOVER_OPEN_DELAY_MS = 150;

/**
 * Unpinned (collapsed) sidebar opens as an overlay while hovered: the aside widens but
 * --cas-sidebar-w stays at the rail width, so the page underneath doesn't shift. Hover, focus and
 * touch handling live in useHoverOverlay; this adds the sidebar's store state and geometry.
 */
export function useSidebarHover(scope: SidebarScope) {
  const collapsed = useUIStore(s => s.sidebarCollapsed[scope]);
  const width = useUIStore(s => s.sidebarWidth);
  const density = useUIStore(s => s.density);
  const { open, hoverProps } = useHoverOverlay(collapsed, HOVER_OPEN_DELAY_MS);

  const overlay = collapsed && open;
  const fullWidth = `${width * DENSITY_SCALE[density]}px`;
  return {
    expanded: !collapsed || open,
    overlay,
    width: overlay ? fullWidth : 'var(--cas-sidebar-w)',
    /**
     * Content is always laid out at full width and the rail only clips it, so nothing moves on
     * hover. The clip ends where labels start (3.5rem), leaving the icon column centred in the
     * 4rem rail with no label fragments peeking out.
     */
    contentStyle: {
      width: fullWidth,
      // Unpinned, the clip animates with the aside's 300ms width change so closing reveals the
      // rail as it shrinks instead of blanking the panel first.
      clipPath: !collapsed
        ? undefined
        : open
          ? 'inset(0 0 0 0)'
          : 'inset(0 calc(100% - 3.5rem) 0 0)',
      transition: 'clip-path 300ms',
    },
    hoverProps,
  };
}
