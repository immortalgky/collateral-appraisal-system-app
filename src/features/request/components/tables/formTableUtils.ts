import type { FormTableColumn, FormTableRegularColumn } from './FormTable';

export const isRegular = (col: FormTableColumn): col is FormTableRegularColumn => 'name' in col;

/** A new row: every column empty (and its "other" text), the shape FormTable's add-row action appends. */
export const emptyRowFor = (columns: FormTableColumn[]): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  for (const col of columns) {
    if (!isRegular(col)) continue;
    row[col.name] = '';
    if (col.otherFieldName) row[col.otherFieldName] = '';
  }
  return row;
};

/** A cell with nothing in it: the rule behind a blank row. */
export const isEmptyCell = (v: unknown): boolean => v === '' || v === null || v === undefined;

/** Whether every column of the row is empty: nothing there to delete. */
export const isBlankRow = (row: unknown, columns: FormTableColumn[]): boolean => {
  const values = (row ?? {}) as Record<string, unknown>;
  return Object.keys(emptyRowFor(columns)).every(key => isEmptyCell(values[key]));
};

/**
 * The sum of one column, the way FormTable's total row reads it: `parseFloat` of each cell, anything
 * unreadable counting as 0. The one place a caller showing the same total should get it from.
 */
export const sumColumn = (rows: readonly unknown[] | null | undefined, column: string): number =>
  (rows ?? []).reduce<number>((sum, row) => {
    const value = (row as Record<string, unknown> | null | undefined)?.[column];
    return sum + (parseFloat(String(value)) || 0);
  }, 0);
