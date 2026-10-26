import { forwardRef, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';
import { useFormLayout } from '../form/formLayoutContext';
import { controlFrame, controlPad, controlSkin } from './controlStyles';

interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Red border and ring, with `aria-invalid`. */
  error?: boolean;
  /** A table cell select (DESIGN.md 17.7): 28px in a Compact form, the plain Standard control otherwise. */
  cell?: boolean;
}

/**
 * A native `<select>` drawn as the form-system box (DESIGN.md 17.3), for filter bars, dialogs and
 * admin pages that keep the OS menu and the DOM `value` / `onChange(event)` contract. A form field
 * that should look and behave like the rest uses `Dropdown`; this exists so the pages that stay on
 * `<select>` still match its height, border, focus and states.
 *
 * Give it `<option>` children and a width class as before. `index.css` already removes the OS
 * arrow, draws the chevron and keeps the right inset; the fixed height centres the text.
 */
const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ error, cell = false, className, disabled, ...props }, ref) => {
    const layout = useFormLayout();
    return (
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className={clsx(
          'block',
          controlFrame(layout, cell),
          controlPad(layout, cell, 'l'),
          controlSkin({ error, disabled }),
          !disabled && 'cursor-pointer',
          className,
        )}
        {...props}
      />
    );
  },
);

NativeSelect.displayName = 'NativeSelect';

export default NativeSelect;
