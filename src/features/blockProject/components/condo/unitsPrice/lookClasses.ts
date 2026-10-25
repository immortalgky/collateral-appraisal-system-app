// Colours are the `--palette-*` tokens (DESIGN.md 6 / 17.2), so dark follows the theme.

/** Toolbar row of a card (DESIGN.md section 11). */
export const TOOLBAR =
  'flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--palette-line-soft) px-4 py-2.5';

/**
 * The read-only data table (DESIGN.md section 10, the request-page detail table): 12.5px rows, tinted
 * sticky head, hairline rules. Stacking, lowest first: body cells, sticky body cells `z-[1]`, sticky
 * `tfoot` `z-[2]`, header `z-10`, header corner `z-20`; each layer sets its own z and an opaque
 * ground, so every row background used with these must be opaque.
 */
export const dataTable = {
  table: 'w-full border-separate border-spacing-0 text-table tabular-nums',
  th: 'border-b border-(--palette-line) bg-(--palette-surface-2) px-2 py-2 text-xs font-semibold whitespace-nowrap text-(--palette-ink-2)',
  td: 'border-b border-(--palette-line-soft) px-2 py-1 align-middle whitespace-nowrap',
  tf: 'border-t border-(--palette-line) bg-(--palette-surface-2) px-2 py-1 font-semibold whitespace-nowrap text-(--palette-ink)',
};

/** Row grounds (opaque: sticky cells inherit them). `sold` rows are muted. */
export const dataRow = {
  normal: 'bg-(--palette-surface) text-(--palette-ink) hover:bg-(--palette-surface-2)',
  sold: 'bg-(--palette-surface-2) text-(--palette-ink-2) hover:bg-(--palette-surface-3)',
};
