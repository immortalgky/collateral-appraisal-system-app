import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useController, useFormContext } from 'react-hook-form';
import { ValidationText } from '../form/ValidationText';
import { ERROR_TEXT } from './controlStyles';

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

/** The input inside the selected chip. Grows with its text up to the chip row, then scrolls. */
export function OtherInput({
  spec,
  disabled,
  focusOnMount,
}: {
  spec: OtherSpec;
  disabled?: boolean;
  focusOnMount?: boolean;
}) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: spec.name, control });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mirrorRef = useRef<HTMLSpanElement | null>(null);
  const text: string = field.value ?? '';

  // The input is as wide as its text really is. Thai glyphs and combining marks do not follow `ch`,
  // so a hidden mirror with the input's own font and padding is measured instead. Past the chip
  // row's width the input stops growing (max-w-full) and the text scrolls inside it.
  const [width, setWidth] = useState<number>();
  const measure = () => {
    const w = mirrorRef.current?.getBoundingClientRect().width;
    if (w) setWidth(Math.ceil(w) + CARET);
  };
  useLayoutEffect(measure, [text]);
  // A web font arriving later changes every glyph's width.
  useEffect(() => {
    void document.fonts?.ready.then(measure);
  }, []);

  // After the toggle's own focus handling, which would otherwise take it back.
  useEffect(() => {
    if (!focusOnMount) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
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
        {text}
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
          'min-w-0 max-w-full rounded-full border-0 bg-(--form-input-bg) text-(--palette-ink)',
          'outline-none disabled:bg-(--palette-surface-2) disabled:text-(--palette-ink-2)',
        )}
      />
    </span>
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
