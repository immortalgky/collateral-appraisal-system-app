import type { ReactNode } from 'react';

/** What a column holds. `index` and `action` are the kit's own (row number; row buttons). */
export type FormTableColumnKind = 'input' | 'derived' | 'text' | 'action' | 'index';

/** Where a column goes when the table turns into cards (DESIGN.md 17.7). */
export type FormTableCardZone = 'input' | 'result';

export interface FormTableCellContext {
  /** 0-based place in the rows as given (display order), not an id. */
  position: number;
  /** The page is read-only: render plain text, not a control. */
  readOnly: boolean;
}

export interface FormTableColumn<Row> {
  key: string;
  /** The header text; also the label above the cell in card mode. Leave out for `action`. */
  header?: ReactNode;
  /** Top level of a two-level head. Neighbouring columns with the same group share one cell. */
  group?: ReactNode;
  /** Default `text`. Decides the card zone when `card.zone` is not given. */
  kind?: FormTableColumnKind;
  /** Default `start`; numeric columns use `end`. */
  align?: 'start' | 'end' | 'center';
  /** CSS width of the column in table mode, e.g. `10rem`. */
  width?: string;
  /** `top` for a column whose cell can grow (a dropdown with an "other" box under it). */
  valign?: 'top';
  /** Draw this column in one mode only; the other mode has its own columns for the same values. */
  show?: 'table' | 'card';
  /** Extra classes on this column's body cells (`whitespace-nowrap`). */
  className?: string;
  /**
   * Card mode only. `zone` defaults to `result` for `derived`, `input` for the rest; `span` is the
   * column count out of 12 in the input zone (default 3). `title` is the plain-text form of this
   * row (e.g. its description) for the card header strip, "n · title"; the column also keeps its
   * own zone.
   */
  card?: {
    zone?: FormTableCardZone;
    span?: 3 | 4 | 6 | 12;
    title?: (row: Row, ctx: FormTableCellContext) => ReactNode;
    /** The label in a card, where the head's `group` above it is gone ("ราคารวม" under "ก่อนหักค่าเสื่อม"). Defaults to `header`. */
    label?: ReactNode;
    /** A label that depends on the row ("ค่าเสื่อมราคา (รวม 12.00%)"). Wins over `label` above a card's cells; the totals row still uses `label`. */
    rowLabel?: (row: Row, ctx: FormTableCellContext) => ReactNode;
  };
  /** The cell content. `index` columns may leave it out (the row number is drawn for them). */
  cell?: (row: Row, ctx: FormTableCellContext) => ReactNode;
  /** The figure in the totals row. A table with at least one `total` gets a totals row. */
  total?: ReactNode;
}

/** An action on the list as a whole: usually an add, but also e.g. "sort by number". */
export interface FormTableAddAction {
  /** Defaults to the label. */
  key?: string;
  /** Without the plus: the kit draws it ("เพิ่มพื้นที่"). */
  label: string;
  onClick: () => void;
  /** Font Awesome name replacing the plus (and the Compact link's "+ "), for a non-add action. */
  icon?: string;
  disabled?: boolean;
}
