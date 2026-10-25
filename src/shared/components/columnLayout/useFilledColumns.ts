import { useMemo, type RefObject } from 'react';
import { fillColumnWidths, storedWidthForShown } from './fillWidths';
import { useElementWidth } from './useElementWidth';

interface UseFilledColumnsOptions {
  /** The columns, in display order. */
  keys: readonly string[];
  /** Stored (minimum) width per column; undefined when the table has no managed layout. */
  widths: Record<string, number> | undefined;
  /** Widths of fixed columns drawn before / after the managed ones (a row number, an actions column). */
  leading?: readonly number[];
  trailing?: readonly number[];
  tableRef: RefObject<HTMLTableElement | null>;
}

/**
 * The width wiring of a table with user-set column widths: the scroll box's width, the columns
 * grown to reach its edge when they fall short (the stored widths are the minimum), and the two
 * conversions that follow from that.
 *
 * `storedFor` turns a width ON SCREEN (a resize drag) into the one to store; without it the
 * stored value is scaled up again by the fill and renders wider than the cursor. Auto-fit measures
 * a cell's scrollWidth, which for a stretched cell is the stretched width, so
 * `measureAtStoredWidths` puts the columns at their stored widths for the measurement and back.
 */
export function useFilledColumns({
  keys,
  widths,
  leading = [],
  trailing = [],
  tableRef,
}: UseFilledColumnsOptions) {
  const [setContainer, containerWidth] = useElementWidth<HTMLDivElement>();
  const fixed = [...leading, ...trailing].reduce((sum, w) => sum + w, 0);

  const filled = useMemo(
    () => (widths ? fillColumnWidths(keys, widths, containerWidth, fixed) : null),
    [keys, widths, containerWidth, fixed],
  );
  const widthOf = (key: string) => filled?.[key] ?? widths?.[key];
  const storedTotal = widths
    ? keys.reduce((sum, k) => sum + (widths[k] ?? 0), 0) + fixed
    : undefined;
  const tableWidth = storedTotal === undefined ? undefined : Math.max(storedTotal, containerWidth);

  const storedFor = (key: string, shown: number) =>
    storedWidthForShown(keys, widths ?? {}, key, shown, containerWidth, fixed);

  const measureAtStoredWidths = (measure: () => number | null) => (): number | null => {
    const table = tableRef.current;
    if (!widths || !filled || !table) return measure();
    const cols = Array.from(table.querySelectorAll('col'));
    const saved = cols.map(c => c.style.width);
    const savedTable = table.style.width;
    const stored = [...leading, ...keys.map(k => widths[k]), ...trailing];
    cols.forEach((c, i) => {
      c.style.width = `${stored[i] ?? 0}px`;
    });
    table.style.width = `${storedTotal ?? 0}px`;
    try {
      return measure();
    } finally {
      cols.forEach((c, i) => {
        c.style.width = saved[i];
      });
      table.style.width = savedTable;
    }
  };

  return { setContainer, containerWidth, widthOf, tableWidth, storedFor, measureAtStoredWidths };
}
