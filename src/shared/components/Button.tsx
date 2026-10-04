import { Children, isValidElement, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import Icon from './Icon';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'danger'
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
  // Variant styles using theme colors
  const variantStyles = {
    primary: 'bg-primary hover:bg-primary/80 text-white shadow-sm',
    secondary: 'bg-secondary hover:bg-secondary/80 text-white shadow-sm',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
    danger: 'bg-danger hover:bg-danger/80 text-white',
    success: 'bg-success hover:bg-success/80 text-white',
    warning: 'bg-warning hover:bg-warning/80 text-white shadow-sm',
    info: 'bg-info hover:bg-info/80 text-white shadow-sm',
    ghost: 'hover:bg-gray-100 text-gray-700',
  };

  // Size styles
  const sizeStyles = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
    xl: 'px-6 py-3 text-xl',
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
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
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
