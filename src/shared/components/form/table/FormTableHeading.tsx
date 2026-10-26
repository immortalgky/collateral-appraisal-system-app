import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useFormLayout } from '../formLayoutContext';
import { TableAddSlotProvider } from './addSlot';

/**
 * The name of a table that shares its section with other fields (DESIGN.md 17.4 sub-heading: a
 * semibold line with a hairline). Not for a table that is the section's only content: the section
 * title names it, and a second heading above it repeats the title (17.6). `addSlotRef` (Compact)
 * leaves the right end of the line for the table's add link; `FormTableBlock` wires it.
 */
export function FormTableHeading({
  children,
  addSlotRef,
}: {
  children: ReactNode;
  addSlotRef?: (el: HTMLElement | null) => void;
}) {
  const layout = useFormLayout();
  return (
    <div
      className={clsx(
        'border-b border-(--palette-line-soft) text-sm font-semibold text-(--palette-ink)',
        layout === 'standard' ? 'mb-[0.7143rem] pb-1' : 'flex items-center px-[0.8571rem] py-1.5',
      )}
    >
      {children}
      {addSlotRef && (
        <span ref={addSlotRef} className="ml-auto flex items-center gap-[0.7143rem]" />
      )}
    </div>
  );
}

/**
 * A table with its own `FormTableHeading`: in Compact the table's add link goes to the right end of
 * that heading, not the section band (too far above a table in mid-section). Without `title` it
 * is a plain pass-through and the link keeps using the band.
 */
export function FormTableBlock({ title, children }: { title?: ReactNode; children: ReactNode }) {
  const layout = useFormLayout();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  if (!title) return <>{children}</>;
  if (layout === 'standard')
    return (
      <>
        <FormTableHeading>{title}</FormTableHeading>
        {children}
      </>
    );
  return (
    <>
      <FormTableHeading addSlotRef={setSlot}>{title}</FormTableHeading>
      <TableAddSlotProvider value={slot}>{children}</TableAddSlotProvider>
    </>
  );
}
