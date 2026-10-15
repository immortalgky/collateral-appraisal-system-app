/**
 * Spreads the width a table lacks over its columns, so a table with few columns still reaches the
 * edge of its container instead of stopping at the sum of the widths and leaving a blank strip.
 *
 * Every column grows by its share of the extra (proportional to its own width), so the user's
 * widths stay the minimum — nothing shrinks — and the proportions between columns are kept. The
 * result is whole pixels summing exactly to `containerWidth` (the rounding remainder goes to the
 * last column). Returns null when there is nothing to fill: the columns already reach (or pass)
 * the container, which then scrolls sideways as before.
 *
 * @param fixedWidth width the table spends outside these columns (e.g. the row-number column)
 */
export function fillColumnWidths(
  keys: readonly string[],
  widths: Record<string, number>,
  containerWidth: number,
  fixedWidth = 0,
): Record<string, number> | null {
  const base = keys.reduce((sum, k) => sum + (widths[k] ?? 0), 0);
  const extra = containerWidth - fixedWidth - base;
  if (keys.length === 0 || base <= 0 || extra <= 0) return null;
  const out: Record<string, number> = {};
  let used = 0;
  keys.forEach((k, i) => {
    const w = widths[k] ?? 0;
    out[k] =
      i === keys.length - 1
        ? Math.round(containerWidth - fixedWidth - used)
        : Math.floor(w + (extra * w) / base);
    used += out[k];
  });
  return out;
}

/**
 * The width to STORE for a column that should be SHOWN `shown` px wide, while the table is being
 * filled — the other direction of `fillColumnWidths`. Stored widths are minimums that the fill
 * scales up, so a drag that stored `startWidth + dx` (the width on screen) would be scaled up again
 * and render wider than the cursor, and wider still the narrower the user pulls.
 *
 * Solves `shown = (C - f) * s / (others + s)` for the stored `s`, the other columns keeping their
 * stored widths (they rescale around it, the total staying the container). Where the column wants
 * more than the room the others leave (`shown >= C - f - others`) the table is not filled any more,
 * and what is shown is what is stored.
 */
export function storedWidthForShown(
  keys: readonly string[],
  widths: Record<string, number>,
  key: string,
  shown: number,
  containerWidth: number,
  fixedWidth = 0,
): number {
  const others = keys.reduce((sum, k) => (k === key ? sum : sum + (widths[k] ?? 0)), 0);
  const room = containerWidth - fixedWidth - others;
  if (containerWidth <= 0 || others <= 0 || shown >= room) return shown;
  return Math.round((shown * others) / (containerWidth - fixedWidth - shown));
}
