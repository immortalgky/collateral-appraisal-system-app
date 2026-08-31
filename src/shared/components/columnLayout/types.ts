import type { RefObject } from 'react';

/**
 * Types for the shared column toolkit.
 *
 * Deliberately NOT named `ColumnDef` — three unrelated `ColumnDef` types already exist in this
 * codebase and a fourth would make imports ambiguous at a glance.
 */

/**
 * What a screen tells the toolkit about its columns.
 *
 * Generic over the key union so a caller keeps its own literal types end to end: `toggleColumn`
 * and `visibleColumns` speak the caller's keys, not `string`.
 */
export interface ColumnLayoutConfig<K extends string = string> {
  /** Every column this screen can show, in default order. */
  columns: readonly K[];
  /** Pinned first and never hideable. Forced to index 0 regardless of stored order. */
  stickyColumn: K;
  /** Additional columns the user may reorder but not hide. */
  alwaysVisible?: readonly K[];
  /**
   * Columns that start hidden on a screen the user has never customised. Applied ONLY when there
   * is no stored layout — once a user has touched the picker their choice wins, including a
   * deliberate decision to show one of these.
   */
  defaultHidden?: readonly K[];
  /** Per-column default width in px. Missing keys fall back to DEFAULT_COLUMN_WIDTH. */
  defaultWidths?: Partial<Record<K, number>>;
}

/**
 * Everything a table component needs in order to render a user-managed layout: the resolved
 * column order, the widths, and the callbacks that mutate them.
 *
 * Passed to a table as a single optional prop so that a table can support the toolkit without
 * every existing caller having to opt in — omit it and the table renders exactly as before.
 */
export interface ColumnTableLayout<K extends string = string> {
  /**
   * The table element, owned by the screen because that is where useColumnAutoFit lives. The table
   * component attaches it; without it auto-fit has nothing to measure.
   */
  tableRef?: RefObject<HTMLTableElement | null>;
  /** Visible columns, in user order. */
  visibleColumns: K[];
  /** Resolved width per column key. */
  widths: Record<string, number>;
  setWidth: (key: string, px: number) => void;
  /** Returns a measuring callback for the resize handle of the column at `colIndex`. */
  getAutoFitWidth: (key: string, colIndex: number) => () => number | null;
  /** Row-number column, rendered outside the managed set — see useRowNumberColumn. */
  showRowNumber?: boolean;
}
