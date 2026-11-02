import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import Icon from '../Icon';
import { useFormReadOnly } from '../form/context';

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

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: IconColor;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'card';
  required?: boolean;
  /** Heading size class of the card variant; a page that wants another size passes it. */
  headingClassName?: string;
  /**
   * Card variant only. `md` (default) is `px-5 py-4`; `sm` is the compact card header for
   * data-dense panes, `px-4 py-2.5` (DESIGN.md section 8).
   */
  size?: 'md' | 'sm';
  /** Card variant only: `false` drops the line under the header (the body follows after a small gap). */
  divider?: boolean;
  /** Default variant: beside the title on its line, e.g. a count. */
  titleAddon?: React.ReactNode;
  /** Default variant: after the title block, still on the left, e.g. a view switch. */
  afterTitle?: React.ReactNode;
}

const iconColorStyles: Record<IconColor, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-(--palette-primary-text)' },
  // A tint of the icon's own colour (not a -50 shade, which is near-white in dark).
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  gray: { bg: 'bg-(--palette-surface-3)', text: 'text-(--palette-gray-500)' },
};

const SectionHeader = ({
  title,
  subtitle,
  icon,
  iconColor = 'primary',
  rightIcon,
  variant = 'default',
  className,
  required,
  headingClassName = 'text-base',
  size = 'md',
  divider = true,
  titleAddon,
  afterTitle,
}: SectionHeaderProps) => {
  const colorStyle = iconColorStyles[iconColor];
  // A read page draws no required mark (DESIGN.md 17.3).
  const readOnly = useFormReadOnly();
  const showRequired = required && !readOnly;

  if (variant === 'card') {
    return (
      <div
        className={clsx(
          'flex items-center justify-between',
          divider && 'border-b border-(--palette-line-soft)',
          // Without the line the header has no bottom padding: the body sets the gap.
          size === 'sm'
            ? divider
              ? 'px-4 py-2.5'
              : 'px-4 pt-2.5'
            : divider
              ? 'px-5 py-4'
              : 'px-5 pt-5',
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
            <h3 className={clsx('font-semibold text-(--palette-ink)', headingClassName)}>
              {title}
              {showRequired && <span className="text-(--palette-req) ml-0.5">*</span>}
            </h3>
            {subtitle && <p className="text-xs text-(--palette-gray-500) mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {rightIcon && rightIcon}
      </div>
    );
  }

  const heading = (
    <h3 className={clsx('font-semibold text-(--palette-ink)', icon ? 'text-base' : 'text-sm')}>
      {title}
      {showRequired && <span className="text-(--palette-req) ml-0.5">*</span>}
    </h3>
  );

  return (
    <div className={clsx('mb-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', colorStyle.bg)}
            >
              <Icon name={icon} style="solid" className={clsx('size-3.5', colorStyle.text)} />
            </div>
          )}
          <div>
            {/* A section inside a card (no icon) sits one step under the card's own 15px heading;
                with an icon it is a page header and takes the card heading's size. */}
            {titleAddon ? (
              <div className="flex items-center gap-2">
                {heading}
                {titleAddon}
              </div>
            ) : (
              heading
            )}
            {subtitle && <p className="text-xs text-(--palette-gray-500) mt-0.5">{subtitle}</p>}
          </div>
          {afterTitle}
        </div>
        {rightIcon && rightIcon}
      </div>
      {!icon && <hr className="border-(--palette-line) mt-2" />}
    </div>
  );
};

export default SectionHeader;
