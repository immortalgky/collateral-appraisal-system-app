/**
 * Shared column toolkit: visibility, order, widths, resize and auto-fit for a data table.
 *
 * ⚠️ Deliberately NOT re-exported from `shared/components/index.ts`. The dropdown pulls in
 * @dnd-kit and @headlessui, and adding it to that barrel would drag both into every module that
 * imports anything from it. Import from this path directly.
 */
export { ColumnResizeHandle } from './ColumnResizeHandle';
export { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';
export { useColumnAutoFit } from './useColumnAutoFit';
export { useColumnVisibility } from './useColumnVisibility';
export { useColumnWidths } from './useColumnWidths';
export { useRowNumberColumn } from './useRowNumberColumn';
export {
  AUTOFIT_PADDING,
  DEFAULT_COLUMN_WIDTH,
  MAX_AUTOFIT_WIDTH,
  MAX_DRAG_WIDTH,
  MIN_COLUMN_WIDTH,
} from './constants';
export type { ColumnLayoutConfig, ColumnTableLayout } from './types';
