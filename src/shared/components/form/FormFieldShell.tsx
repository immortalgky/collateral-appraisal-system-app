import { useContext, type ReactNode } from 'react';
import clsx from 'clsx';

import { REQUIRED_MARK } from '../inputs/controlStyles';
import { COMPACT } from './compactStyles';
import { useFormLayout } from './formLayoutContext';
import { FormSectionBodyContext } from './formSheetContext';
import { ValidationLabelContext } from './validationMessage';

// Field wrapper classes (DESIGN.md 17.4): `col-span-*` is the field's own business in Standard (the
// section body is a 12-column grid). The Compact pair classes are in `compactStyles.ts`.
const LABEL_CLASS = 'block text-xs font-medium text-(--palette-ink)';

// A read page's label sits over its value, quieter than an edit label (DESIGN.md 17.3).
const READ_LABEL_CLASS = 'block text-xs font-medium text-(--palette-ink-2)';
// A `flex` / `items-center` wrapper (a toggle centred beside its label) is dropped: a field is label
// over control in Standard, whatever the config says.
const FLEX_CLASS = /(^|\s)(?:flex|items-center)(?=\s|$)/g;

// Written out in full so Tailwind sees them; `!` beats the section body's own 3/4 -> 6 rule.
const NARROW_SPAN = {
  3: '@max-[56rem]/form-shell:col-span-3!',
  4: '@max-[56rem]/form-shell:col-span-4!',
  6: '@max-[56rem]/form-shell:col-span-6!',
  12: '@max-[56rem]/form-shell:col-span-12!',
} as const;

const SPAN_CLASS = /(?:^|\s)(?:[\w-]+:)*col-(?:span|start|end)-\S+/g;
/** A fraction width or minimum (`w-1/2`, `w-[calc(50%-0.5714rem)]`, `min-w-[11rem]`), at any breakpoint: a Standard field that fills part of a full row. A Compact pair drops them. */
const PART_WIDTH =
  /(?:^|\s)(?:\S+:)*(?:w-(?:1\/[234]|full|\[calc[^\s\]]+\])|min-w-\[[^\s\]]+\])(?=\s|$)/g;

interface FormFieldShellProps {
  /** The `data-field` name: what a form error scrolls to. */
  name: string;
  /** Drawn by the shell. Leave out for a control that carries its own (a checkbox). */
  label?: string;
  /** A single control: the label is `<label htmlFor>` of the element with this id. */
  labelFor?: string;
  /** A group of controls: the label gets this id and the group is named by it. */
  labelId?: string;
  required?: boolean;
  /** Beside the label, outside it (the "?" help button). */
  addon?: ReactNode;
  /** The field's own classes; in Compact its `col-span-*` is replaced by the pair's. */
  wrapperClassName?: string;
  /** Compact: take a whole row (chip groups, textareas, several inputs), not half of one. */
  full?: boolean;
  /** Compact: the control is taller than one line (textarea, chip group); the label aligns to the top. */
  tall?: boolean;
  /** Compact: a half only from a wider sheet (a joined row of three controls). */
  wide?: boolean;
  /** The field belongs to a run that makes one row (`rowGroupRoles`): Standard keeps its spans too, Compact only starts the row. */
  rowGroup?: 'start' | 'member' | 'start-only';
  /** A chip group: Standard gives it the whole row, whatever span the config has (DESIGN.md 17.4). */
  chips?: boolean;
  /** The span in a narrow shell, in place of the 3/4 -> 6 fallback (Standard section body only). */
  narrowSpan?: 3 | 4 | 6 | 12;
  /** A read page: the same cell as the edit field (same span, row group and narrow behaviour), with the label (no required mark) over, or beside, the value in `children`. */
  read?: boolean;
  children: ReactNode;
}

/**
 * The wrapper every form field sits in (DESIGN.md 17.4): label above the control in Standard; in
 * Compact, inside a `FormSection`, a label-left pair (184px label cell) that sits two to a row on a
 * wide sheet. `FormFields` uses it for config-driven fields; a hand-built field in a form uses it
 * too, so it lays out like its neighbours.
 */
export function FormFieldShell({
  name,
  label,
  labelFor,
  labelId,
  required,
  addon,
  wrapperClassName = '',
  full: fullPair,
  tall,
  wide,
  rowGroup,
  chips,
  narrowSpan,
  read,
  children,
}: FormFieldShellProps) {
  // Compact only lays out as pairs inside a FormSection body; a form dropped anywhere else (a modal
  // opened from the page) keeps the Standard wrapper.
  const layout = useFormLayout();
  const inSectionBody = useContext(FormSectionBodyContext);
  const compact = layout === 'compact' && inSectionBody;

  const labelClass = compact ? undefined : read ? READ_LABEL_CLASS : LABEL_CLASS;
  const text = (
    <>
      {label}
      {required && !read && <span className={REQUIRED_MARK}>*</span>}
    </>
  );
  const head = label ? (
    <>
      {labelFor ? (
        <label htmlFor={labelFor} className={labelClass}>
          {text}
        </label>
      ) : (
        <span id={labelId} className={labelClass}>
          {text}
        </span>
      )}
      {addon}
    </>
  ) : null;
  const control =
    label && labelId && !labelFor ? (
      <div role="group" aria-labelledby={labelId}>
        {children}
      </div>
    ) : (
      children
    );

  // The control's error text names this field by its label (validationMessage.ts).
  const labelled = (
    <ValidationLabelContext.Provider value={label}>{control}</ValidationLabelContext.Provider>
  );

  if (!compact) {
    // The 12-column section body only: a form in a grid of its own keeps its spans.
    if (chips && inSectionBody)
      wrapperClassName = clsx(wrapperClassName.replace(SPAN_CLASS, ''), 'col-span-12');
    return (
      <div
        data-field={name}
        data-keep-row={rowGroup === 'start' || rowGroup === 'member' ? '' : undefined}
        className={clsx(
          // `flex` / `items-center` would put the label beside the control: label over control
          // in Standard, whatever the config says.
          wrapperClassName.replace(FLEX_CLASS, '$1').trim().replace(/\s+/g, ' '),
          rowGroup === 'start' && 'col-start-1',
          narrowSpan && inSectionBody && NARROW_SPAN[narrowSpan],
        )}
      >
        {head && (
          <div className={clsx('flex items-center gap-1.5', read ? 'mb-px' : 'mb-1')}>{head}</div>
        )}
        {labelled}
      </div>
    );
  }

  // The config's own spans are for the 12-column Standard grid and would stretch this one, so they
  // are dropped for the pair's own.
  const full = fullPair || /(?:^|\s)col-span-12(?=\s|$)/.test(wrapperClassName);
  const pair = (
    <div
      data-field={name}
      data-half={full ? undefined : ''}
      className={clsx(
        COMPACT.pair,
        full ? COMPACT.full : wide ? COMPACT.halfWide : COMPACT.half,
        (rowGroup === 'start' || rowGroup === 'start-only') && COMPACT.rowStart,
        // `flex` / `items-center` on the wrapper would replace the pair's grid
        wrapperClassName.replace(SPAN_CLASS, '').replace(PART_WIDTH, '').replace(FLEX_CLASS, '$1'),
      )}
    >
      {head && (
        <div className={clsx(COMPACT.label, tall || chips ? COMPACT.labelTop : COMPACT.labelMid)}>
          {head}
        </div>
      )}
      <div
        className={clsx(
          COMPACT.control,
          read ? COMPACT.readMin : COMPACT.controlMin,
          !head && 'col-span-full',
        )}
      >
        <div className="min-w-0 flex-1">{labelled}</div>
      </div>
    </div>
  );
  // Two to a row: a run that makes one row (address: sub-district / district / province) starts one, so its
  // first pair is not pulled up beside the field before it.
  return rowGroup === 'start' || rowGroup === 'start-only' ? (
    <>
      <div aria-hidden data-row-break="" className={COMPACT.rowBreak} />
      {pair}
    </>
  ) : (
    pair
  );
}
