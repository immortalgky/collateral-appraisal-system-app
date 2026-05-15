export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 360;
export const SIDEBAR_DEFAULT_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

// Set a baseline value before any React component renders so the layout
// variable is never undefined on first paint.
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty(
    '--cas-sidebar-w',
    `${SIDEBAR_DEFAULT_WIDTH}px`,
  );
}
