import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';
type BadgeType = 'status' | 'priority' | 'channel';
type BadgeStyle = 'soft' | 'solid' | 'outline' | 'minimal' | 'ghost';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: boolean;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  /** Domain-specific badge type for auto color selection */
  type?: BadgeType;
  /** Value used with type to auto-select colors */
  value?: string | null;
  /** Visual style of the badge */
  badgeStyle?: BadgeStyle;
}

/** Base color tokens for each semantic color */
const colorTokens = {
  amber: {
    solid: 'bg-amber-500 text-white',
    soft: 'bg-amber-50 text-amber-700',
    outline: 'border border-amber-500 text-amber-600 bg-transparent',
    minimal: 'text-amber-600',
    ghost: 'bg-amber-500/10 text-amber-600',
    dot: 'bg-amber-500',
  },
  blue: {
    solid: 'bg-blue-500 text-white',
    soft: 'bg-blue-50 text-blue-700',
    outline: 'border border-blue-500 text-blue-600 bg-transparent',
    minimal: 'text-blue-600',
    ghost: 'bg-blue-500/10 text-blue-600',
    dot: 'bg-blue-500',
  },
  cyan: {
    solid: 'bg-cyan-500 text-white',
    soft: 'bg-cyan-50 text-cyan-700',
    outline: 'border border-cyan-500 text-cyan-600 bg-transparent',
    minimal: 'text-cyan-600',
    ghost: 'bg-cyan-500/10 text-cyan-600',
    dot: 'bg-cyan-500',
  },
  emerald: {
    solid: 'bg-emerald-500 text-white',
    soft: 'bg-emerald-50 text-emerald-700',
    outline: 'border border-emerald-500 text-emerald-600 bg-transparent',
    minimal: 'text-emerald-600',
    ghost: 'bg-emerald-500/10 text-emerald-600',
    dot: 'bg-emerald-500',
  },
  gray: {
    solid: 'bg-gray-500 text-white',
    soft: 'bg-gray-100 text-gray-600',
    outline: 'border border-gray-400 text-gray-600 bg-transparent',
    minimal: 'text-gray-600',
    ghost: 'bg-gray-500/10 text-gray-600',
    dot: 'bg-gray-400',
  },
  red: {
    solid: 'bg-red-500 text-white',
    soft: 'bg-red-50 text-red-700',
    outline: 'border border-red-500 text-red-600 bg-transparent',
    minimal: 'text-red-600',
    ghost: 'bg-red-500/10 text-red-600',
    dot: 'bg-red-500',
  },
  green: {
    solid: 'bg-green-500 text-white',
    soft: 'bg-green-50 text-green-700',
    outline: 'border border-green-500 text-green-600 bg-transparent',
    minimal: 'text-green-600',
    ghost: 'bg-green-500/10 text-green-600',
    dot: 'bg-green-500',
  },
  purple: {
    solid: 'bg-purple-500 text-white',
    soft: 'bg-purple-50 text-purple-700',
    outline: 'border border-purple-500 text-purple-600 bg-transparent',
    minimal: 'text-purple-600',
    ghost: 'bg-purple-500/10 text-purple-600',
    dot: 'bg-purple-500',
  },
};

type ColorKey = keyof typeof colorTokens;

/** Map type+value to color key */
const typeColorMap: Record<BadgeType, Record<string, ColorKey>> = {
  status: {
    new: 'blue',
    draft: 'amber',
    pending: 'purple',
    inprogress: 'cyan',
    completed: 'emerald',
    cancelled: 'gray',
    rejected: 'red',
    // Kanban status values
    'not started': 'blue',
    'in progress': 'cyan',
    overdue: 'red',
  },
  priority: {
    high: 'red',
    medium: 'amber',
    normal: 'gray',
    low: 'green',
  },
  channel: {
    manual: 'blue',
    los: 'purple',
    api: 'cyan',
  },
};

const sizeStyles = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
};

const dotSizeStyles = {
  xs: 'size-1',
  sm: 'size-1.5',
  md: 'size-2',
  lg: 'size-2.5',
};

const Badge = ({
  children,
  variant: _variant,
  size = 'sm',
  rounded = true,
  dot = true,
  removable = false,
  onRemove,
  type,
  value,
  badgeStyle = 'soft',
  className,
  ...props
}: BadgeProps) => {
  void _variant; // Keep for backward compatibility
  // Determine color key based on type+value or variant
  const normalizedValue = value?.toLowerCase() ?? '';
  const colorKey: ColorKey =
    type && value ? (typeColorMap[type]?.[normalizedValue] ?? 'gray') : 'gray';

  const colors = colorTokens[colorKey];
  const styleClasses = colors[badgeStyle];
  const dotColor = colors.dot;

  // For minimal style, don't show background
  const showDot = badgeStyle === 'minimal' ? dot : dot;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium',
        rounded ? 'rounded-full' : 'rounded-md',
        styleClasses,
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {showDot && <span className={clsx('rounded-full shrink-0', dotColor, dotSizeStyles[size])} />}
      {children ?? value ?? '-'}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className={clsx(
            'ml-0.5 -mr-1 inline-flex items-center justify-center rounded-full',
            'hover:bg-black/10 focus:outline-none',
            size === 'xs' && 'size-3',
            size === 'sm' && 'size-3.5',
            size === 'md' && 'size-4',
            size === 'lg' && 'size-5',
          )}
        >
          <svg
            className={clsx(
              size === 'xs' && 'size-2',
              size === 'sm' && 'size-2.5',
              size === 'md' && 'size-3',
              size === 'lg' && 'size-3.5',
            )}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  );
};

export default Badge;
