import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import Icon from '../Icon';

type IconColor = 'primary' | 'blue' | 'purple' | 'amber' | 'cyan' | 'emerald' | 'teal' | 'rose' | 'orange' | 'gray';

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: IconColor;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'card';
}

const iconColorStyles: Record<IconColor, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-500' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const SectionHeader = ({
  title,
  subtitle,
  icon,
  iconColor = 'primary',
  rightIcon,
  variant = 'default',
  className,
}: SectionHeaderProps) => {
  const colorStyle = iconColorStyles[iconColor];

  if (variant === 'card') {
    return (
      <div
        className={clsx(
          'flex items-center justify-between px-5 py-4 border-b border-gray-100',
          className,
        )}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center shadow-sm',
                colorStyle.bg,
              )}
            >
              <Icon name={icon} style="solid" className={clsx('size-4', colorStyle.text)} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {rightIcon && rightIcon}
      </div>
    );
  }

  return (
    <div className={clsx('mb-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                colorStyle.bg,
              )}
            >
              <Icon name={icon} style="solid" className={clsx('size-3.5', colorStyle.text)} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {rightIcon && rightIcon}
      </div>
      {!icon && <hr className="border-gray-200 mt-2" />}
    </div>
  );
};

export default SectionHeader;
