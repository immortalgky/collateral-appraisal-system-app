import { useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

import Icon from '../Icon';
import { TableAddSlotProvider } from './table/addSlot';
import { useFormLayout } from './formLayoutContext';
import {
  FormSectionBodyContext,
  FormSectionRegistryContext,
  FormSectionStatusContext,
} from './formSheetContext';
import { SectionHeaderStatus } from './missing/SectionStatus';

const SHEET = {
  standard: 'flex flex-col gap-[0.8571rem]',
  compact:
    '@container/sheet overflow-hidden rounded-[0.5714rem] border border-(--palette-line) bg-(--palette-surface)',
};

/**
 * The root of a form (DESIGN.md 17.6): sets the vertical rhythm and, in Compact, the container the
 * label-left pairs measure (`@container/sheet`, two pairs per row from 60rem). Put the form's
 * `FormSection`s inside.
 *
 * ```tsx
 * <FormSheet>
 *   <FormSection title={t('...')} icon="building">
 *     <FormFields fields={...} />      // 12-column grid; anything else needs `col-span-12`
 *   </FormSection>
 * </FormSheet>
 * ```
 *
 * Standard: one card per section with 12px between. Compact: one bordered sheet, the sections abut.
 */
export function FormSheet({ children, className }: { children: ReactNode; className?: string }) {
  const layout = useFormLayout();
  return <div className={clsx('min-w-0', SHEET[layout], className)}>{children}</div>;
}

interface FormSectionProps {
  title: string;
  /** Font Awesome name. Standard draws it before the title; Compact has no icon (the band is the mark). */
  icon?: string;
  /** Right end of the head: a button, or in Compact the "+ add" link. */
  actions?: ReactNode;
  /** Quiet text at the right end, before `actions`. */
  hint?: ReactNode;
  /** `false` for a section with no tracked fields (photos): it shows no missing-fields status. */
  status?: boolean;
  /** Anchor for the table of contents. Generated when left out. */
  id?: string;
  className?: string;
  children: ReactNode;
}

// Under the pinned tab bar. The shell sets `--form-scroll-offset` to the bar's height.
const SCROLL_MARGIN = 'scroll-mt-[calc(var(--form-scroll-offset,2.5714rem)+1rem)]';

const SECTION = {
  standard: {
    section: 'rounded-section border border-(--palette-line) bg-(--palette-surface) shadow-sm',
    header: 'flex items-center gap-2 border-b border-(--palette-line-soft) px-4 py-[0.6429rem]',
    // Spans 3 and 4 are fields a quarter and a third wide; below the form shell's breakpoint
    // (84.2857rem, the rail's) at most two fit a row. Fields of a run that makes one row
    // (`data-keep-row`: address 6+3+3, latitude/longitude 6+6) keep their spans down to 48rem.
    body: 'grid grid-cols-12 gap-x-[1.1429rem] gap-y-[1.2857rem] px-4 pt-[0.8571rem] pb-4 @max-[84.2857rem]/form-shell:[&>.col-span-3:not([data-keep-row])]:col-span-6 @max-[84.2857rem]/form-shell:[&>.col-span-4:not([data-keep-row])]:col-span-6 @max-[48rem]/form-shell:[&>.col-span-3]:col-span-6 @max-[48rem]/form-shell:[&>.col-span-4]:col-span-6',
  },
  compact: {
    section: 'first:[&>header]:border-t-0',
    header:
      'flex h-[2.4286rem] items-center gap-2 border-y border-(--palette-line) bg-(--palette-surface-3) px-[0.8571rem]',
    // The pairs draw `border-l` and `border-b`. Shifting the body left by the border hides the left
    // edge under the sheet's own, so only the divider between two pairs shows; the bottom one
    // slides under the next band's top border.
    body: '-mb-px -ml-px grid grid-cols-12',
  },
};

/**
 * One titled section of a `FormSheet`. The only section component in forms (it replaces
 * `SectionHeader variant="card"`, `FormCard` and the `SectionRow` copies). One section, one title:
 * do not repeat it above a table that is the section's only content.
 */
export function FormSection({
  title,
  icon,
  actions,
  hint,
  status = true,
  id,
  className,
  children,
}: FormSectionProps) {
  const layout = useFormLayout();
  const generated = useId();
  const sectionId = id ?? `section-${generated.replace(/:/g, '')}`;
  const titleId = `${sectionId}-title`;
  const ref = useRef<HTMLElement>(null);
  const [addSlot, setAddSlot] = useState<HTMLElement | null>(null);
  const register = useContext(FormSectionRegistryContext);
  const statusInHeader = useContext(FormSectionStatusContext) && status;

  useEffect(() => {
    if (!register || !ref.current) return;
    return register({ id: sectionId, title, icon, el: ref.current });
  }, [register, sectionId, title, icon]);

  const classes = SECTION[layout];
  return (
    <section
      ref={ref}
      id={sectionId}
      aria-labelledby={titleId}
      className={clsx(SCROLL_MARGIN, classes.section, className)}
    >
      <header className={classes.header}>
        {layout === 'standard' && icon && (
          <Icon
            style="solid"
            name={icon}
            // `size-*` is ignored by `.icon` (1em); the font size sets it.
            className="shrink-0 text-[1.0714rem] text-(--palette-accent-ink)"
          />
        )}
        <h3 id={titleId} className="text-base font-semibold text-(--palette-ink)">
          {title}
        </h3>
        {(hint || actions || statusInHeader || layout === 'compact') && (
          <div className="ml-auto flex items-center gap-[0.7143rem]">
            {statusInHeader && <SectionHeaderStatus id={sectionId} />}
            {hint && <span className="text-xs text-(--palette-ink-2)">{hint}</span>}
            {actions}
            {/* Compact: the table kit portals its "+ add" links in here (DESIGN.md 17.7). */}
            {layout === 'compact' && (
              <span ref={setAddSlot} className="flex items-center gap-[0.7143rem]" />
            )}
          </div>
        )}
      </header>
      <TableAddSlotProvider value={layout === 'compact' ? addSlot : null}>
        <FormSectionBodyContext.Provider value>
          <div className={classes.body}>{children}</div>
        </FormSectionBodyContext.Provider>
      </TableAddSlotProvider>
    </section>
  );
}
