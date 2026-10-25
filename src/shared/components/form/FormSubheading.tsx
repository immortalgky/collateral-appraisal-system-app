import type { ReactNode } from 'react';
import clsx from 'clsx';

import { useFormLayout } from './formLayoutContext';

const SUBHEADING = {
  standard:
    'col-span-12 border-b border-(--palette-line-soft) pb-1.5 text-sm font-semibold text-(--palette-ink)',
  // A quiet band across the pairs, so the group reads as one block of rows.
  compact:
    'col-span-12 border-b border-l border-(--palette-line-soft) bg-(--palette-surface-2) px-[0.8571rem] py-[0.3571rem] text-sm font-semibold text-(--palette-ink)',
};

/**
 * Names a cluster of fields inside one `FormSection` (DESIGN.md 17.4), e.g. "ที่อยู่ตามเอกสารสิทธิ์"
 * above the deed address. One step under the section title (13/600). Sits in the section's grid.
 */
export function FormSubheading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const layout = useFormLayout();
  // data-subheading: the missing-fields popover tells two same-named fields apart by it.
  return (
    <h4 data-subheading="" className={clsx(SUBHEADING[layout], className)}>
      {children}
    </h4>
  );
}
