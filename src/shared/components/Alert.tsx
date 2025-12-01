import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import Icon from './Icon';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: AlertVariant;
  title?: string;
  icon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = ({
  children,
  variant = 'info',
  title,
  icon = true,
  dismissible = false,
  onDismiss,
  className,
  ...props
}: AlertProps) => {
  const variantStyles = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-green-50 text-success border-green-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-red-50 text-danger border-red-200',
  };

  const iconStyles = {
    info: 'text-secondary',
    success: 'text-success',
    warning: 'text-amber-500',
    danger: 'text-danger',
  };

  const iconNames = {
    info: 'circle-info',
    success: 'circle-check',
    warning: 'triangle-exclamation',
    danger: 'circle-exclamation',
  };

  return (
    <div
      role="alert"
      className={clsx(
        'relative rounded-lg border p-4',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      <div className="flex">
        {icon && (
          <div className="flex-shrink-0">
            <Icon
              style="solid"
              name={iconNames[variant]}
              className={clsx('h-5 w-5', iconStyles[variant])}
            />
          </div>
        )}

        <div className={clsx('flex-1', icon && 'ml-3')}>
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <div className={clsx('text-sm', title && 'mt-1')}>{children}</div>
        </div>

        {dismissible && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={onDismiss}
              className={clsx(
                'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                variant === 'info' && 'hover:bg-blue-100 focus:ring-blue-500',
                variant === 'success' && 'hover:bg-green-100 focus:ring-green-500',
                variant === 'warning' && 'hover:bg-amber-100 focus:ring-amber-500',
                variant === 'danger' && 'hover:bg-red-100 focus:ring-red-500',
              )}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
