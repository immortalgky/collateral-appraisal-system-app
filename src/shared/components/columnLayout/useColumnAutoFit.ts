import { useCallback, type RefObject } from 'react';
import { AUTOFIT_PADDING, MAX_AUTOFIT_WIDTH, MIN_COLUMN_WIDTH } from './constants';

/**
 * Double-click auto-fit: measure the widest rendered cell in a column and return that width.
 *
 * Extracted from three byte-identical copies in the task screens. It measures the DOM rather than
 * the data because the rendered cell is what has to fit — a status badge and its label are wider
 * than the raw status string.
 *
 * @param tableRef the <table> to measure
 * @param leadingCells number of cells rendered BEFORE the managed columns (e.g. a row-number
 *   column). Column indices from the visible-column list are offset by this, otherwise every
 *   measurement is taken from the neighbouring column.
 */
export function useColumnAutoFit(
  tableRef: RefObject<HTMLTableElement | null>,
  { leadingCells = 0 }: { leadingCells?: number } = {},
) {
  return useCallback(
    (_key: string, colIndex: number): (() => number | null) =>
      () => {
        const tbl = tableRef.current;
        if (!tbl) return null;
        const rows = tbl.querySelectorAll('tr');
        let max = 0;
        rows.forEach(row => {
          const cell = row.children[colIndex + leadingCells] as HTMLElement | undefined;
          if (cell) max = Math.max(max, cell.scrollWidth);
        });
        // Nothing measurable (empty table, or the column is not rendered) — leave the width alone
        // rather than snapping it to the minimum.
        if (max === 0) return null;
        return Math.min(Math.max(max + AUTOFIT_PADDING, MIN_COLUMN_WIDTH), MAX_AUTOFIT_WIDTH);
      },
    [tableRef, leadingCells],
  );
}
