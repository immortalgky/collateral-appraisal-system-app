import type { CSSProperties, ReactNode } from 'react';
import { useFormLayout } from '@shared/components/form';

/**
 * Whether a dirtyFields node holds a real edit. After a field-array operation RHF leaves the
 * array's entry behind as a tree of `false` leaves even when the rows equal the record, so a key
 * being present is not enough.
 */
export const hasEdit = (node: unknown): boolean =>
  node === true || (typeof node === 'object' && node !== null && Object.values(node).some(hasEdit));

/**
 * The editor's scroller, as the property pages have it: `#form-scroll-container` is what the
 * form-error scroll and the tab bar look for, and `--form-scroll-offset` is the pinned tab row's
 * height, which `FormSection` scrolls under. Inside the layout provider so it reads the layout.
 * `pinned={false}` for an editor with no tab row (the project parts): sections scroll to the top edge.
 */
export function EditorScroller({
  children,
  pinned = true,
}: {
  children: ReactNode;
  pinned?: boolean;
}) {
  const compact = useFormLayout() === 'compact';
  const offset = !pinned ? '0rem' : compact ? '2.4286rem' : '2.5714rem';
  return (
    <div
      id="form-scroll-container"
      style={{ '--form-scroll-offset': offset } as CSSProperties}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
    >
      {children}
    </div>
  );
}
