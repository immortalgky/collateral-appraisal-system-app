import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  noPadding?: boolean;
  bordered?: boolean;
}

const Card = ({
  children,
  className,
  title,
  subtitle,
  footer,
  noPadding = false,
  bordered = true,
  ...props
}: CardProps) => {
  return (
    <div
      className={clsx(
        'bg-(--palette-surface) rounded-lg shadow-sm overflow-hidden',
        bordered && 'border border-(--palette-line)',
        className,
      )}
      {...props}
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-(--palette-line)">
          {title && <h3 className="text-base font-semibold text-(--palette-ink)">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-(--palette-gray-500)">{subtitle}</p>}
        </div>
      )}

      <div className={noPadding ? '' : 'p-6'}>{children}</div>

      {footer && (
        <div className="px-6 py-4 bg-(--palette-surface-2) border-t border-(--palette-line)">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
