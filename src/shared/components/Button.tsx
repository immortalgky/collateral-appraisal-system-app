import { Children, isValidElement, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import { useFormLayout } from './form/formLayoutContext';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'danger'
  | 'dangerOutline'
  | 'success'
  | 'warning'
  | 'info'
  | 'ghost';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth = false,
  ...props
}: ButtonProps) => {
  const compact = useFormLayout() === 'compact';

  // Variant styles using theme colors. Every variant has a 1px border (transparent unless it is
  // an outlined one) so all of them are the same height. A filled primary button is `primary-700`:
  // white on `primary-600` is 3.7:1 (DESIGN.md 17.11). Every text is at least 4.5:1 in light and
  // dark: the neutral variants read `--palette-*` (which have dark values), the solid colours use a
  // shade dark enough for white text (`danger-600`, `green-700`, `blue-700`) and `warning` the dark
  // `warning-content`; `secondary` follows the theme's own `secondary-content` (white in light, dark
  // on the lighter dark-mode slate). The outline border is the control edge `--palette-input-edge` (17.10).
  const variantStyles = {
    primary: 'border border-transparent bg-primary-700 hover:bg-primary-800 text-white shadow-sm',
    secondary:
      'border border-transparent bg-secondary hover:bg-secondary/80 text-secondary-content shadow-sm',
    outline:
      'border border-(--palette-input-edge) hover:border-(--palette-input-edge-hover) hover:bg-(--palette-surface-3) text-(--palette-ink)',
    danger: 'border border-transparent bg-danger-600 hover:bg-danger-900 text-white',
    dangerOutline:
      'border border-(--palette-req-line) hover:bg-(--palette-req-wash) text-(--palette-req)',
    success: 'border border-transparent bg-green-700 hover:bg-green-800 text-white',
    warning:
      'border border-transparent bg-warning hover:bg-warning/80 text-warning-content shadow-sm',
    info: 'border border-transparent bg-blue-700 hover:bg-blue-800 text-white shadow-sm',
    // Borderless and fill-less in both layouts (the mock's `.bt.gh`); hover is the grey fill.
    ghost: 'border border-transparent hover:bg-(--palette-surface-3) text-(--palette-ink)',
  };

  // Size styles. Heights are explicit, never derived from `py`, so a Thai label cannot change the
  // button's height (17.12). The type scale is relative to a 14px root (theme.css), so a normal
  // button is 13px (text-sm) and `sm` 12px. `lg` and `xl` are not part of the form system.
  const sizeStyles = {
    xs: 'h-[1.7143rem] px-2 text-xs',
    sm: compact ? 'h-chip-c px-3 text-xs' : 'h-[2.1429rem] px-3 text-xs',
    md: compact ? 'h-[2.1429rem] px-4 text-sm' : 'h-[2.4286rem] px-4 text-sm',
    lg: 'px-5 py-2.5 text-base',
    xl: 'px-6 py-3 text-lg',
  };

  // Loading spinner component
  const LoadingSpinner = ({ beforeLabel }: { beforeLabel: boolean }) => (
    <svg
      className={clsx('animate-spin h-4 w-4', beforeLabel && 'mr-2')}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

  // While loading the spinner stands in for the leading icon, wherever the caller put it
  // (`leftIcon`, or an <Icon> written as the first child): dropping it keeps the button's width
  // steady. A trailing <Icon> ("Next ›") stays, and an icon-only button gets a bare, centred
  // spinner: the margin is only for a label that follows it. A `rightIcon` stays for the same
  // reason: the button keeps its width.
  const kids = Children.toArray(children);
  const leadingIconChild = isLoading && isValidElement(kids[0]) && kids[0].type === Icon;
  const content = leadingIconChild ? kids.slice(1) : kids;

  return (
    <button
      // Default to "button" so a Button rendered inside a <form> doesn't implicitly
      // submit the form when clicked. Real submit buttons opt in via `type="submit"`,
      // and the spread below lets callers override this default when needed.
      type="button"
      className={clsx(
        // Focus is the global `:focus-visible` outline (DESIGN.md section 6), not a ring.
        'inline-flex items-center justify-center font-medium transition-colors',
        compact ? 'rounded-ctl-c' : 'rounded-ctl',
        // Disabled is a grey fill with `ink-2` text (7.3:1 in dark), not `opacity-50`, which drops
        // the label below 4.5:1 (DESIGN.md 17.10). A loading button keeps its colours.
        disabled
          ? 'disabled:bg-(--palette-surface-3) disabled:text-(--palette-ink-2) disabled:border-(--palette-line) disabled:shadow-none disabled:cursor-not-allowed'
          : 'disabled:cursor-wait',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <LoadingSpinner beforeLabel={content.length > 0} />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {isLoading ? content : children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;
