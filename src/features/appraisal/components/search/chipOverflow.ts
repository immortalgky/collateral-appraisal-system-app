/**
 * Which of the ADDED chips of the filter bar stay on show, and which fold into the overflow chip.
 *
 * The pinned chips are not in the decision's result: they always show, wrapping onto further lines
 * when they alone are wider than the row. Widths are measured by the caller; this only decides.
 * An added chip stays when it fits without making the row any taller than the pinned chips, the
 * overflow chip and the tail need anyway. Added chips keep their order and are hidden from the end,
 * with one exception: the `forced` chip (the filter just added) always shows, even when that means a
 * line more, and an earlier added chip gives way instead.
 */
export interface OverflowInput {
  /** Natural width of each pinned chip, in order. Always visible. */
  pinned: number[];
  /** Natural width of each added chip, in order. */
  added: number[];
  /** Index (into `added`) of the chip that must stay visible, or -1. */
  forced: number;
  /** Width of the row. 0 or less means "not laid out": nothing is hidden. */
  available: number;
  /** The overflow chip, which takes a slot as soon as one added chip is hidden. */
  overflowWidth: number;
  /** "Add filter" and "Clear all": always at the end of the row, never hidden. */
  tailWidth: number;
  gap: number;
  /**
   * Room kept back when deciding whether an added chip fits, against sub-pixel error in the
   * measurements. Not taken off the baseline (what the pinned chips and the tail need anyway): that
   * is what the row really does, and a baseline made worse than the truth would let a chip add a line.
   */
  safety?: number;
}

/** How many lines a wrapping row of these items takes: each goes on the current line if it fits. */
export function lineCount(widths: number[], available: number, gap: number): number {
  let lines = 1;
  let used = 0;
  for (const w of widths) {
    if (used > 0 && used + gap + w > available) {
      lines++;
      used = w;
    } else {
      used += (used > 0 ? gap : 0) + w;
    }
  }
  return lines;
}

/** Whether each added chip stays on show. */
export function pickVisible({
  pinned,
  added,
  forced,
  available,
  overflowWidth,
  tailWidth,
  gap,
  safety = 0,
}: OverflowInput): boolean[] {
  const all = added.map(() => true);
  if (added.length === 0 || available <= 0) return all;

  const linesIn = (visible: boolean[], width: number) => {
    const items = [...pinned, ...added.filter((_, i) => visible[i])];
    if (visible.some(v => !v)) items.push(overflowWidth);
    items.push(tailWidth);
    return lineCount(items, width, gap);
  };
  // What the row really does (no margin): the baseline a chip is measured against.
  const lines = (visible: boolean[]) => linesIn(visible, available);
  // Whether a chip fits: with the margin kept back. Only this test uses it.
  const linesSafe = (visible: boolean[]) => linesIn(visible, available - safety);

  // No taller than the pinned chips and the tail already are: nothing needs folding.
  const withoutOverflow = lineCount([...pinned, tailWidth], available, gap);
  if (linesSafe(all) <= withoutOverflow) return all;

  const withOverflow = lineCount([...pinned, overflowWidth, tailWidth], available, gap);
  let visible = added.map((_, i) => i === forced);
  for (let i = 0; i < added.length; i++) {
    if (i === forced) continue;
    const next = [...visible];
    next[i] = true;
    // Showing every chip drops the overflow chip, so then the first test applies again.
    const limit = next.every(Boolean) ? withoutOverflow : Math.max(withOverflow, lines(visible));
    // The first chip that does not fit ends the run: hidden chips are the end of the row, not
    // whichever happen to be narrow.
    if (linesSafe(next) > limit) break;
    visible = next;
  }
  return visible;
}
