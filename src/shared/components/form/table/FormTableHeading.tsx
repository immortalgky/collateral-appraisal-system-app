import { useContext, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { COMPACT } from '../compactStyles';
import { useFormLayout } from '../formLayoutContext';
import { FormSectionBodyContext } from '../formSheetContext';
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
 * A table with its own title (`FormTableHeading`). Without `title` it is a plain pass-through: the
 * table takes the whole row and its add link keeps using the section band.
 *
 * Compact, inside a section: the title is the label of a label-left pair (the 184px column, at the
 * top like a tall field's label) and the table sits in the control column, in line with the fields
 * above and below. The add link goes under the title, not in the band (too far above a table in
 * mid-section). A table in a form that is not in a section body keeps the heading bar.
 */
export function FormTableBlock({
  title,
  compactTitle,
  wide,
  children,
}: {
  title?: ReactNode;
  /** Compact in a section body only: the label for a table that has no heading elsewhere (`title` left out). */
  compactTitle?: ReactNode;
  /** The table needs more than the control column holds on a narrow sheet (a `minWidth` of about 52rem): under 66rem of sheet the title is a heading row above the table. */
  wide?: boolean;
  children: ReactNode;
}) {
  const layout = useFormLayout();
  const inSectionBody = useContext(FormSectionBodyContext);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  if (layout === 'compact' && inSectionBody && !title && compactTitle) title = compactTitle;
  if (!title) return <>{children}</>;
  if (layout === 'standard')
    return (
      <>
        <FormTableHeading>{title}</FormTableHeading>
        {children}
      </>
    );
  if (inSectionBody)
    return (
      <div className={wide ? COMPACT.pairWideTable : COMPACT.pair}>
        <div className={clsx(wide ? COMPACT.labelWideTable : COMPACT.label, COMPACT.labelTop)}>
          <div className="flex min-w-0 flex-col gap-1">
            {title}
            <span ref={setSlot} className="flex items-center gap-[0.7143rem]" />
          </div>
        </div>
        <div className="min-w-0">
          <TableAddSlotProvider value={slot}>{children}</TableAddSlotProvider>
        </div>
      </div>
    );
  return (
    <>
      <FormTableHeading addSlotRef={setSlot}>{title}</FormTableHeading>
      <TableAddSlotProvider value={slot}>{children}</TableAddSlotProvider>
    </>
  );
}
