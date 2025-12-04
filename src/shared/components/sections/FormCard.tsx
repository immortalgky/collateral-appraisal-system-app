import type { ReactNode, HTMLAttributes } from 'react';
import clsx from 'clsx';
import SectionHeader from './SectionHeader';

type IconColor = 'primary' | 'blue' | 'purple' | 'amber' | 'cyan' | 'emerald' | 'teal' | 'rose' | 'orange' | 'gray';

interface FormCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: IconColor;
  children: ReactNode;
  rightIcon?: ReactNode;
  noPadding?: boolean;
  /** Show colored left border accent */
  coloredBorder?: boolean;
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
  gray: 'border-l-gray-400',
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
  ...props
}: FormCardProps) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl shadow-sm border border-gray-100',
        coloredBorder && ['border-l-4', borderColorStyles[iconColor]],
        className
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
      />
      <div className={clsx(!noPadding && 'p-5')}>{children}</div>
    </div>
  );
};

export default FormCard;
