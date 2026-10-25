import { Description, Field, Label, Textarea as HeadlessTextarea } from '@headlessui/react';
import clsx from 'clsx';
import { type ReactNode, type TextareaHTMLAttributes, useState } from 'react';
import { useFormReadOnly } from '../form/context';
import { useFormLayout } from '../form/formLayoutContext';
import { ValidationText } from '../form/ValidationText';
import { controlSkin, counterClass, ERROR_TEXT, HELPER_TEXT, REQUIRED_MARK } from './controlStyles';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  /** Node rendered next to the label, outside it (e.g. a FieldHelp "?" button) */
  labelAddon?: ReactNode;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  /** The `n/max` counter is always on (DESIGN.md 17.3); pass `false` to opt a field out. */
  showCharCount?: boolean;
}

/** A "อื่นๆ" free-text box (max 100) is a short one: it gets the shorter minimum height. */
const SHORT_TEXT_MAX_LENGTH = 100;

/** A box for this much text opens 5 rows tall (an explicit `rows` wins); a shorter one keeps the browser's 2. */
const LONG_TEXT_MAX_LENGTH = 1000;
const LONG_TEXT_ROWS = 5;

const MIN_HEIGHT = {
  standard: { long: 'min-h-[5.1429rem]', short: 'min-h-[4rem]' },
  compact: { long: 'min-h-[4rem]', short: 'min-h-[3.1429rem]' },
} as const;

const Textarea = ({
  label,
  labelAddon,
  helperText,
  error,
  fullWidth = true,
  required,
  disabled,
  className,
  showCharCount = true,
  maxLength = 4000,
  value,
  onInput,
  ...props
}: TextareaProps) => {
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;
  const layout = useFormLayout();
  // A controlled box counts its `value`. A `register()`ed one has none, so it counts what is typed
  // (a programmatic reset writes the DOM without an input event and leaves this count stale).
  const [typedLength, setTypedLength] = useState(
    typeof props.defaultValue === 'string' ? props.defaultValue.length : 0,
  );
  const currentLength = typeof value === 'string' ? value.length : typedLength;
  const shouldShowCount = showCharCount && maxLength !== undefined;
  const isShort = maxLength <= SHORT_TEXT_MAX_LENGTH;

  return (
    <Field className={clsx(fullWidth && 'w-full', 'flex', 'flex-col')}>
      {labelAddon ? (
        <div className="flex items-center gap-1.5 mb-1">
          {label && (
            <Label className="block text-xs font-medium text-(--palette-ink)">
              {label}
              {required && <span className={REQUIRED_MARK}>*</span>}
            </Label>
          )}
          {labelAddon}
        </div>
      ) : (
        label && (
          <Label className="block text-xs font-medium text-(--palette-ink) mb-1">
            {label}
            {required && <span className={REQUIRED_MARK}>*</span>}
          </Label>
        )
      )}
      <HeadlessTextarea
        // The same box as a text control, taller: vertical padding here is real padding (the height
        // is the content's), and `leading-normal` keeps Thai marks whole.
        className={clsx(
          'block resize-y leading-normal',
          layout === 'standard'
            ? 'px-[0.8571rem] py-[0.5714rem] rounded-ctl'
            : 'px-[0.7143rem] py-[0.4286rem] rounded-ctl-c',
          MIN_HEIGHT[layout][isShort ? 'short' : 'long'],
          controlSkin({ error: !!error, disabled: isDisabled }),
          fullWidth && 'w-full',
          className,
        )}
        invalid={!!error}
        disabled={isDisabled}
        maxLength={maxLength}
        rows={maxLength >= LONG_TEXT_MAX_LENGTH ? LONG_TEXT_ROWS : undefined}
        value={value}
        onInput={e => {
          setTypedLength(e.currentTarget.value.length);
          onInput?.(e);
        }}
        {...props}
      />
      {(helperText || error || shouldShowCount) && (
        <div className="flex justify-between gap-2 mt-1">
          {(error || helperText) && (
            <Description className={error ? ERROR_TEXT : HELPER_TEXT}>
              {error ? <ValidationText message={error} label={label} /> : helperText}
            </Description>
          )}
          {shouldShowCount && (
            <span className={clsx('ml-auto', counterClass(currentLength > maxLength))}>
              {currentLength.toLocaleString('en-US')}/{maxLength.toLocaleString('en-US')}
            </span>
          )}
        </div>
      )}
    </Field>
  );
};

export default Textarea;
