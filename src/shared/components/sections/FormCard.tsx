import type { ReactNode, HTMLAttributes } from 'react';
import clsx from 'clsx';
import SectionHeader from './SectionHeader';

type IconColor =
  | 'primary'
  | 'blue'
  | 'purple'
  | 'amber'
  | 'cyan'
  | 'emerald'
  | 'teal'
  | 'rose'
  | 'orange'
  | 'gray';

interface FormCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: IconColor;
  children: ReactNode;
  rightIcon?: ReactNode;
  noPadding?: boolean;
  required?: boolean;
  /** Show colored left border accent */
  coloredBorder?: boolean;
  /** Heading size class (default text-base); only a page that needs another size sets it. */
  headingClassName?: string;
  /** Header size: `sm` is the compact header for data-dense panes (DESIGN.md section 8). */
  size?: 'md' | 'sm';
  /**
   * Extra classes for the body wrapper (the div under the header). Use it to make the body a flex
   * column that fills a height-capped card: `bodyClassName="flex min-h-0 flex-1 flex-col"`.
   */
  bodyClassName?: string;
}

// Border color styles matching icon colors
const borderColorStyles: Record<IconColor, string> = {
  primary: 'border-l-primary',
  blue: 'border-l-blue-500',
  purple: 'border-l-purple-500',
  amber: 'border-l-amber-500',
  cyan: 'border-l-cyan-500',
  emerald: 'border-l-emerald-500',
  teal: 'border-l-teal-500',
  rose: 'border-l-rose-500',
  orange: 'border-l-orange-500',
  gray: 'border-l-(--palette-line-strong)',
};

/**
 * FormCard - A styled card container for form sections
 * Provides consistent styling with rounded corners, shadow, and border
 * similar to the dashboard widget style
 *
 * @example
 * <FormCard title="Customer Info" icon="user" iconColor="blue" coloredBorder>
 *   <form>...</form>
 * </FormCard>
 */
const FormCard = ({
  title,
  subtitle,
  icon,
  iconColor = 'primary',
  children,
  rightIcon,
  noPadding = false,
  coloredBorder = false,
  className,
  required,
  headingClassName,
  size,
  bodyClassName,
  ...props
}: FormCardProps) => {
  return (
    <div
      className={clsx(
        'bg-(--palette-surface) rounded-2xl shadow-sm border border-(--palette-line-soft)',
        coloredBorder && ['border-l-4', borderColorStyles[iconColor]],
        className,
      )}
      {...props}
    >
      <SectionHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        iconColor={iconColor}
        rightIcon={rightIcon}
        variant="card"
        required={required}
        headingClassName={headingClassName}
        size={size}
      />
      <div className={clsx(!noPadding && 'p-5', bodyClassName)}>{children}</div>
    </div>
  );
};

export default FormCard;
