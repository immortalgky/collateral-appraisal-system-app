/**
 * Marks and sizes the task list shares, in one place so a colour or a height is changed once.
 * Whole class names, written out, because Tailwind finds classes by scanning for them.
 */

/** A 3px bar on a row's first cell for an SLA that needs attention (no row tint), red or amber. */
export type SlaBar = 'breached' | 'atRisk';

/** The bar, the 1px divider after the last sticky pinned column, or both, as one box-shadow. */
export const CELL_SHADOW: Record<SlaBar | 'none', { bar: string; edge: string }> = {
  none: { bar: '', edge: 'shadow-[inset_-1px_0_0_var(--color-gray-100)]' },
  breached: {
    bar: 'shadow-[inset_3px_0_0_var(--color-red-500)]',
    edge: 'shadow-[inset_3px_0_0_var(--color-red-500),inset_-1px_0_0_var(--color-gray-100)]',
  },
  atRisk: {
    bar: 'shadow-[inset_3px_0_0_var(--color-amber-500)]',
    edge: 'shadow-[inset_3px_0_0_var(--color-amber-500),inset_-1px_0_0_var(--color-gray-100)]',
  },
};

/**
 * The keyboard focus of a row, drawn on its cells (a <tr> outline is covered by the sticky cells and
 * clipped by the scroll box): a 2px line over and under every cell, plus the left end on the first
 * cell and the right end on the last. A pseudo-element, so it adds to the cell's own box-shadow bar
 * and divider and does not replace them. The row must be a `group` and its cells positioned.
 */
export const FOCUS_RING =
  "after:pointer-events-none after:absolute after:inset-0 after:content-[''] group-focus-visible:after:border-y-2 group-focus-visible:after:border-blue-500";
export const FOCUS_RING_LEFT = 'group-focus-visible:after:border-l-2';
export const FOCUS_RING_RIGHT = 'group-focus-visible:after:border-r-2';

/** The same two colours, as the legend's swatch. */
export const SLA_SWATCH: Record<SlaBar, string> = {
  breached: 'bg-red-500',
  atRisk: 'bg-amber-500',
};

/** The height of the toolbar's controls: the standard input, so a button beside one lines up. */
export const TOOLBAR_CONTROL_H = 'h-[2.5357rem]';
