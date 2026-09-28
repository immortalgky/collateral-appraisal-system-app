import { useId, type ReactNode } from 'react';
import { ScrollableTableContainer } from '../ScrollableTableContainer';

interface StickyLabelTableProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  /**
   * Pins a second label column (e.g. the DCF table's item + assumption columns) at this
   * left offset in px — the first column's own width. Rows whose label cell carries
   * `colspan` (section bands, detail rows, the "+ Add" row) collapse to one wide sticky
   * cell spanning both columns instead, matching the mock's `.stkw` — so unlike the
   * single-column mode below, a colspan'd first cell here IS still sticky (it has to be:
   * it's standing in for both columns). Omit for the single-sticky-column behaviour
   * every other consumer of this component already gets, unchanged.
   */
  secondStickyColumnLeft?: number;
  /** Passed through to ScrollableTableContainer — opt-in column-nav pager. */
  columnNavSelector?: string;
  stickyWidth?: number;
  navGroupSize?: number;
}

export function StickyLabelTable({
  children,
  className,
  maxHeight,
  secondStickyColumnLeft,
  columnNavSelector,
  stickyWidth,
  navGroupSize,
}: StickyLabelTableProps) {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const scopeClass = `sticky-table-${safeId}`;
  const edgeShadow = '1px 0 0 0 rgba(0, 0, 0, 0.06)';
  const edgeShadowScrolled = `${edgeShadow}, 6px 0 8px -4px rgba(16, 24, 32, 0.22)`;
  const stickyBase = 'position: sticky; z-index: 2;';
  // Tailwind v4 emits utilities inside `@layer utilities`, and an unlayered rule beats any
  // layered one whatever its specificity — so a white default written in the unlayered
  // <style> below overrode every `bg-*` on a sticky cell (DCF's tinted band/total rows
  // rendered a white notch on the left). Declared in `@layer base` instead, it sits
  // below the utilities layer and a cell's own bg class wins, as :where() always intended.
  const whiteDefaultCss = `@layer base { :where(.${scopeClass} td, .${scopeClass} th) { background-color: white; } }`;

  const twoColumnCss = `
        /* Two sticky columns. A colspan'd first cell (section bands, detail rows, the
           "+ Add" row) has nothing to put in a second column, so it stands in for both —
           sticky at left:0 like the single-column case, and it's the rightmost sticky
           cell in that row, so it carries the edge shadow. */
        :where(.${scopeClass} td:first-child[colspan]),
        :where(.${scopeClass} th:first-child[colspan]) {
          ${stickyBase} left: 0; box-shadow: ${edgeShadow};
        }
        :where(.${scopeClass} .pa-scrolled-left td:first-child[colspan]),
        :where(.${scopeClass} .pa-scrolled-left th:first-child[colspan]) {
          box-shadow: ${edgeShadowScrolled};
        }
        /* Plain (non-colspan) first cell: sticky at left:0, no edge shadow — the second
           column that follows it is the actual rightmost sticky cell in that row. */
        :where(.${scopeClass} td:first-child:not([colspan])),
        :where(.${scopeClass} th:first-child:not([colspan])) {
          ${stickyBase} left: 0;
        }
        /* Second sticky column: the cell right after a non-colspan first cell. */
        :where(.${scopeClass} td:first-child:not([colspan]) + td:not([colspan])),
        :where(.${scopeClass} th:first-child:not([colspan]) + th:not([colspan])) {
          ${stickyBase} left: ${secondStickyColumnLeft}px; box-shadow: ${edgeShadow};
        }
        :where(.${scopeClass} .pa-scrolled-left td:first-child:not([colspan]) + td:not([colspan])),
        :where(.${scopeClass} .pa-scrolled-left th:first-child:not([colspan]) + th:not([colspan])) {
          box-shadow: ${edgeShadowScrolled};
        }`;

  const oneColumnCss = `
        /* Freeze only single-column label cells. Skip colspan rows (section banners,
           full-width totals) so they render normally. :where() keeps specificity at 0 so
           any Tailwind bg-* class on the cell wins, while white stays as the default
           fallback. Width intentionally left unset so the first column auto-sizes to its
           content — the remaining columns scroll when needed. */
        :where(.${scopeClass} td:first-child:not([colspan])),
        :where(.${scopeClass} th:first-child:not([colspan])) {
          ${stickyBase} left: 0; box-shadow: ${edgeShadow};
        }
        :where(.${scopeClass} .pa-scrolled-left td:first-child:not([colspan])),
        :where(.${scopeClass} .pa-scrolled-left th:first-child:not([colspan])) {
          box-shadow: ${edgeShadowScrolled};
        }`;

  return (
    <div className={scopeClass}>
      <style>
        {whiteDefaultCss}
        {secondStickyColumnLeft === undefined ? oneColumnCss : twoColumnCss}
      </style>
      <ScrollableTableContainer
        className={className}
        maxHeight={maxHeight}
        edgeShadow
        columnNavSelector={columnNavSelector}
        stickyWidth={stickyWidth}
        navGroupSize={navGroupSize}
      >
        {children}
      </ScrollableTableContainer>
    </div>
  );
}
