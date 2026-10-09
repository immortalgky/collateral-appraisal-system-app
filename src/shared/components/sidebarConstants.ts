export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 360;
export const SIDEBAR_DEFAULT_WIDTH = 240;
/**
 * Icon rail. rem, not px: the menu inside is rem-sized (root font follows viewport and density),
 * and 4rem puts the icon column (0.5 + 0.625 + 1.75/2 rem) exactly on its centre line.
 */
export const SIDEBAR_RAIL_WIDTH = '4rem';

// Set a baseline value before any React component renders so the layout
// variable is never undefined on first paint.
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty(
    '--cas-sidebar-w',
    `${SIDEBAR_DEFAULT_WIDTH}px`,
  );
}
