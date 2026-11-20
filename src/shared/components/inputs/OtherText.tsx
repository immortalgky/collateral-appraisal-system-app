import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon';
import { ValidationText } from '../form/ValidationText';
import type { FormLayoutMode } from '../form/formLayoutContext';
import { chipClass, ERROR_TEXT, otherInputChipClass } from './controlStyles';

/**
 * The "อื่นๆ" text of a chip group, typed inside the chip. It is the companion field the form
 * config already pairs with the group (`showWhen` on the group's name), so no field name changes.
 */
export interface OtherSpec {
  /** Full form path of the companion field. */
  name: string;
  /** The option value that opens it ('99'). */
  is: string;
  maxLength: number;
  /** The companion's own label, for its validation message. */
  label?: string;
  required?: boolean;
}

/** Font, size and padding shared by the input and its measuring mirror. */
const INPUT_TEXT = 'px-[0.7143rem] text-sm leading-normal';
/** Room for the caret after the last glyph. */
const CARET = 4;

/** The input inside the "other" chip. Grows with its text up to the chip row, then scrolls. */
export function OtherInput({
  spec,
  disabled,
  focusOnMount,
  placeholder,
}: {
  spec: OtherSpec;
  disabled?: boolean;
  focusOnMount?: boolean;
  placeholder?: string;
}) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: spec.name, control });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mirrorRef = useRef<HTMLSpanElement | null>(null);
  const text: string = field.value ?? '';

  // The input is as wide as its text really is. Thai glyphs and combining marks do not follow `ch`,
  // so a hidden mirror with the input's own font and padding is measured instead. Past the chip
  // row's width the input stops growing (max-w-full) and the text scrolls inside it. With no text
  // the placeholder is what is measured.
  const [width, setWidth] = useState<number>();
  const measure = () => {
    const w = mirrorRef.current?.getBoundingClientRect().width;
    if (w) setWidth(Math.ceil(w) + CARET);
  };
  useLayoutEffect(measure, [text, placeholder]);
  // A web font arriving later changes every glyph's width.
  useEffect(() => {
    void document.fonts?.ready.then(measure);
  }, []);

  // After the toggle's own focus handling, which would otherwise take it back. The caret goes to
  // the end, so editing a typed text continues it.
  useEffect(() => {
    if (!focusOnMount) return;
    const id = requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    return () => cancelAnimationFrame(id);
  }, [focusOnMount]);

  return (
    <span data-field={spec.name} className="relative flex min-w-0 self-stretch">
      <span
        ref={mirrorRef}
        aria-hidden="true"
        data-other-mirror
        className={clsx(INPUT_TEXT, 'pointer-events-none invisible absolute whitespace-pre')}
      >
        {text || placeholder}
      </span>
      <input
        ref={el => {
          inputRef.current = el;
          field.ref(el);
        }}
        data-other
        type="text"
        value={text}
        maxLength={spec.maxLength}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={spec.label}
        aria-required={spec.required || undefined}
        aria-invalid={fieldState.invalid || undefined}
        onChange={e => field.onChange(e.target.value)}
        onBlur={e => {
          field.onBlur();
          // A long value shows its beginning again once the appraiser leaves it.
          e.currentTarget.scrollLeft = 0;
        }}
        // Typing is text: neither the group's arrow-key navigation nor a surrounding <form>'s
        // Enter-to-submit may see these keys.
        onKeyDown={e => {
          e.stopPropagation();
          if (e.key === 'Enter') e.preventDefault();
        }}
        onKeyUp={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        style={{ width, minWidth: '12ch' }}
        className={clsx(
          INPUT_TEXT,
          'min-w-0 max-w-full rounded-full border-0 text-(--palette-ink)',
          'outline-none placeholder:text-(--palette-ink-2) disabled:text-(--palette-ink-2)',
          'bg-transparent',
        )}
      />
    </span>
  );
}

/**
 * Where the "other" chip is between typing and typed. Typing while focused (or while blank, which
 * is still selected and still owes a text); typed once the appraiser leaves a filled input; back to
 * typing when they click the chip. A saved text opens as typed, so a record loading never takes focus.
 */
export function useOtherEdit(spec: OtherSpec, focusOnMount?: boolean) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: spec.name, control });
  const [editing, setEditing] = useState(!!focusOnMount);
  const [focusRequest, setFocusRequest] = useState(!!focusOnMount);
  const text = String(field.value ?? '');
  return {
    text,
    invalid: !!fieldState.error,
    /** The input is shown: typing now, or nothing typed yet. */
    typing: editing || text.trim() === '',
    focusRequest,
    edit: () => {
      setEditing(true);
      setFocusRequest(true);
    },
    /** Focus came into the input (a click, a tab): it is being edited until focus leaves the chip. */
    begin: () => setEditing(true),
    /** Focus left the chip. A blank text stays selected, so the input stays too. */
    commit: () => {
      setEditing(false);
      setFocusRequest(false);
    },
  };
}

export interface OtherTextChipProps {
  className: string;
  onClick: () => void;
  /** Accessible name: "Other: <text>, edit" (the localised `chips.otherEdit`). */
  label: string;
  /** The full text, for a long one that is cut short. */
  title: string;
  children: ReactNode;
  disabled: boolean;
}

/** The typed text as a chip that is already selected: a plain pressed button unless the group needs its own. */
const defaultTextChip = ({
  className,
  onClick,
  label,
  title,
  children,
  disabled,
}: OtherTextChipProps) => (
  <button
    type="button"
    aria-pressed
    aria-label={label}
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={className}
  >
    {children}
  </button>
);

/**
 * The selected "Other" chip: it turns, in place, into a text field while the appraiser types and
 * back into an ordinary selected chip (✓ text ✎) once they leave it. Clicking that chip edits again.
 * Written once here so every chip group (checkbox, radio, the planning colour) behaves the same.
 */
export function OtherChip({
  spec,
  layout,
  disabled = false,
  focusOnMount,
  onRemove,
  check = true,
  optionLabel,
  renderTextChip = defaultTextChip,
}: {
  spec: OtherSpec;
  layout: FormLayoutMode;
  disabled?: boolean;
  focusOnMount?: boolean;
  /** Deselect "Other" and drop its text: the "×" of the input chip. */
  onRemove: () => void;
  /** The group's selected chips carry a ✓ (checkboxes do, plain radios do not). */
  check?: boolean;
  /** The option's own caption: shown while no text is typed, as on a read page with "other" picked and no text. */
  optionLabel?: string;
  /** A group whose chips are its own elements (a Headless radio) draws the typed chip itself. */
  renderTextChip?: (props: OtherTextChipProps) => ReactNode;
}) {
  const { t } = useTranslation('common');
  const edit = useOtherEdit(spec, focusOnMount);

  if (disabled || !edit.typing) {
    // A blank text (a read page, or "other" picked with nothing typed) shows the option's own caption.
    const caption = optionLabel?.trim() || t('chips.other');
    const blank = edit.text.trim() === '';
    const shown = blank ? caption : edit.text;
    return renderTextChip({
      className: chipClass(layout, true, disabled),
      onClick: disabled ? () => {} : edit.edit,
      // Disabled: no "edit" in the name, which would promise an edit that is not there.
      label: disabled
        ? blank
          ? caption
          : `${caption}: ${shown}`
        : t('chips.otherEdit', { text: shown }),
      title: shown,
      disabled,
      children: (
        <>
          {check && <ChipCheck />}
          <span className="min-w-0 truncate">{shown}</span>
          {!disabled && (
            <Icon style="solid" name="pen" className="ml-[0.4286rem] shrink-0 text-xs" />
          )}
        </>
      ),
    });
  }

  return (
    <span
      className={otherInputChipClass(layout, edit.invalid)}
      onFocus={edit.begin}
      // Leaving to the "×" inside the chip is not leaving the chip.
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) edit.commit();
      }}
    >
      <OtherInput
        spec={spec}
        focusOnMount={edit.focusRequest}
        placeholder={t('chips.otherPlaceholder')}
      />
      <button
        type="button"
        aria-label={t('chips.otherRemove')}
        title={t('chips.otherRemove')}
        // The input keeps focus, so the chip does not turn into its typed form under the click.
        onMouseDown={e => e.preventDefault()}
        onClick={onRemove}
        className="mr-[0.4286rem] inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 text-xs text-(--palette-ink-2) hover:text-(--palette-ink)"
      >
        <Icon style="solid" name="xmark" />
      </button>
    </span>
  );
}

/** The check mark of a selected chip. */
export function ChipCheck() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-[0.4286rem] w-[0.6429rem] shrink-0"
    >
      <path d="M1 4.2 3.7 7 9 1" />
    </svg>
  );
}

/** Under the chip row: the companion's validation error. */
export function OtherNote({ spec }: { spec: OtherSpec }) {
  const { control } = useFormContext();
  const { fieldState } = useController({ name: spec.name, control });
  if (!fieldState.error?.message) return null;
  return (
    <p className={ERROR_TEXT}>
      <ValidationText message={fieldState.error.message} label={spec.label} />
    </p>
  );
}
