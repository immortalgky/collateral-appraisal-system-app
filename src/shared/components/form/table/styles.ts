import type { FormLayoutMode } from '../formLayoutContext';

/** The two looks of the table kit (DESIGN.md 17.7), kept side by side; geometry differs, colours do not. */
export const tableStyles: Record<
  FormLayoutMode,
  {
    table: string;
    th: string;
    group: string;
    td: string;
    totalsTd: string;
    rowAction: string;
    empty: string;
  }
> = {
  standard: {
    table: 'w-full border-separate border-spacing-0 text-sm tabular-nums',
    th: 'px-[0.5714rem] py-[0.5714rem] text-xs font-medium text-(--palette-ink) border-b border-(--palette-input-edge) whitespace-nowrap first:pl-0 last:pr-0',
    // `!`: laid over `th`, which sets the same properties
    group: 'border-(--palette-line-strong)! text-center font-semibold! text-(--palette-ink)!',
    td: 'px-[0.5714rem] py-[0.5714rem] border-b border-(--palette-line-soft) align-middle first:pl-0 last:pr-0',
    totalsTd:
      'px-[0.5714rem] py-[0.8571rem] border-t border-(--palette-ink-3) font-bold align-middle first:pl-0 last:pr-0',
    rowAction: 'size-8',
    empty: 'rounded-[0.7143rem] py-[1.4286rem]',
  },
  compact: {
    table: 'w-full border-collapse text-sm tabular-nums',
    th: 'h-8 px-[0.5714rem] bg-(--palette-surface-2) text-xs font-medium text-(--palette-ink-2) border-b border-(--palette-line) whitespace-nowrap',
    group: 'border-(--palette-line-strong)! text-center font-semibold!',
    td: 'h-ctl px-[0.5714rem] py-[0.1429rem] border-b border-(--palette-line-soft) align-middle',
    totalsTd:
      // 9px: 0.5714rem is 7.999px at the 14px root, under the 8px the totals need to clear the cell edge
      'h-[2.4286rem] px-[0.6429rem] bg-(--palette-surface-2) border-t border-(--palette-line-strong) font-bold align-middle',
    rowAction: 'size-[1.7143rem]',
    empty: 'rounded-[0.4286rem] py-[1rem]',
  },
};

export const ALIGN = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
} as const;

/**
 * Frozen first / action column of a wide table: opaque so scrolled cells do not show through, with a
 * 1px inset divider on the inner edge.
 */
export const FROZEN = {
  first:
    'sticky left-0 z-[2] bg-(--palette-surface) shadow-[inset_-1px_0_0_var(--palette-line-soft)]',
  last: 'sticky right-0 z-[2] bg-(--palette-surface) shadow-[inset_1px_0_0_var(--palette-line-soft)]',
} as const;

/**
 * `bleed` (Standard only): the edge cells pad 12px themselves, so row fills run to the box edges
 * and the text lines up with a 12px-padded neighbour. Without it Standard's edge cells are flush
 * (`first:pl-0 last:pr-0`) and the parent supplies the padding. `!` wins over those.
 */
export const BLEED = '[&_:is(th,td):first-child]:pl-[12px]! [&_:is(th,td):last-child]:pr-[12px]!';
