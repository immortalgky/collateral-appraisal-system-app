import type { ReactNode, HTMLAttributes } from 'react';
import clsx from 'clsx';
import SectionHeader from './SectionHeader';

interface FormCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightIcon?: ReactNode;
  noPadding?: boolean;
}

/**
 * FormCard - A styled card container for form sections
 * Provides consistent styling with rounded corners, shadow, and border
 * similar to the dashboard widget style
 */
const FormCard = ({
  title,
  subtitle,
  children,
  rightIcon,
  noPadding = false,
  className,
  ...props
}: FormCardProps) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl shadow-sm border border-gray-100',
        className
      )}
      {...props}
    >
      <SectionHeader title={title} subtitle={subtitle} rightIcon={rightIcon} variant="card" />
      <div className={clsx(!noPadding && 'p-6')}>{children}</div>
    </div>
  );
};

export default FormCard;
