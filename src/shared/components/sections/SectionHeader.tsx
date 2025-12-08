import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'card';
}

const SectionHeader = ({
  title,
  subtitle,
  rightIcon,
  variant = 'default',
  className,
}: SectionHeaderProps) => {
  if (variant === 'card') {
    return (
      <div
        className={clsx(
          'flex items-center justify-between px-6 py-4 border-b border-gray-100',
          className,
        )}
      >
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {rightIcon && rightIcon}
      </div>
    );
  }

  return (
    <div className={clsx('mb-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {rightIcon && rightIcon}
      </div>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      <hr className="border-gray-200 mt-3" />
    </div>
  );
};

export default SectionHeader;
