import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useFormLayout } from '../formLayoutContext';

/**
 * The name of a table that shares its section with other fields (DESIGN.md 17.4 sub-heading: a
 * semibold line with a hairline). Not for a table that is the section's only content: the section
 * title names it, and a second heading above it repeats the title (17.6).
 */
export function FormTableHeading({ children }: { children: ReactNode }) {
  const layout = useFormLayout();
  return (
    <div
      className={clsx(
        'border-b border-(--palette-line-soft) text-sm font-semibold text-(--palette-ink)',
        layout === 'standard' ? 'mb-[0.7143rem] pb-1' : 'px-[0.8571rem] py-1.5',
      )}
    >
      {children}
    </div>
  );
}
