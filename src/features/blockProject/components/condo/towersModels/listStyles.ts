import type { KeyboardEvent } from 'react';

/** Header and cell classes of the Condo list tables (DESIGN.md section 10). */
export const thClass = 'px-4 py-2.5 text-left text-xs font-semibold text-(--palette-ink-2)';
export const thNumClass = 'px-4 py-2.5 text-right text-xs font-semibold text-(--palette-ink-2)';
export const tdClass = 'px-4 py-2.5 align-middle';
export const tdNumClass = 'px-4 py-2.5 text-right align-middle tabular-nums';
export const rowClass =
  'cursor-pointer hover:bg-(--palette-surface-2) even:bg-(--palette-surface-2)/50';

/** A row that opens on click and on Enter. Inner buttons stop propagation themselves. */
export const openRowProps = (onOpen: () => void) => ({
  tabIndex: 0,
  onClick: onOpen,
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' && e.target === e.currentTarget) onOpen();
  },
});
