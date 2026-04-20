import { useId, type ReactNode } from 'react';
import { ScrollableTableContainer } from '../ScrollableTableContainer';

interface StickyLabelTableProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

export function StickyLabelTable({
  children,
  className,
  maxHeight,
}: StickyLabelTableProps) {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const scopeClass = `sticky-table-${safeId}`;

  return (
    <div className={scopeClass}>
      <style>{`
        /* Freeze only single-column label cells. Skip colspan rows
           (section banners, full-width totals) so they render normally.
           :where() keeps specificity at 0 so any Tailwind bg-* class on the
           cell wins, while white stays as the default fallback.
           Width intentionally left unset so the first column auto-sizes
           to its content — the remaining columns scroll when needed. */
        :where(.${scopeClass} td:first-child:not([colspan])),
        :where(.${scopeClass} th:first-child:not([colspan])) {
          position: sticky;
          left: 0;
          z-index: 2;
          background-color: white;
          box-shadow: 1px 0 0 0 rgba(0, 0, 0, 0.06);
        }
      `}</style>
      <ScrollableTableContainer className={className} maxHeight={maxHeight}>
        {children}
      </ScrollableTableContainer>
    </div>
  );
}
