import type { ReactNode } from 'react';
import clsx from 'clsx';

interface InlineSubSectionProps {
  title?: string;
  description?: string;
  rightSlot?: ReactNode;
  className?: string;
  /** Reduced visual weight: smaller title, normal-case, less spacing. */
  compact?: boolean;
  children: ReactNode;
}

const InlineSubSection = ({
  title,
  description,
  rightSlot,
  className,
  compact = false,
  children,
}: InlineSubSectionProps) => {
  return (
    <section
      className={clsx(compact ? 'py-3 first:pt-1 last:pb-1' : 'py-4 first:pt-1 last:pb-1', className)}
    >
      {(title || description) && (
        <div className={compact ? 'mb-2' : 'mb-3'}>
          <div className="flex items-center gap-1.5">
            {title && (
              <h4
                className={clsx(
                  compact
                    ? 'text-xs font-medium text-gray-500'
                    : 'text-[11px] font-semibold text-gray-600 tracking-wider uppercase',
                )}
              >
                {title}
              </h4>
            )}
            {rightSlot && <span className="text-[11px] text-gray-400">{rightSlot}</span>}
          </div>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
};

export default InlineSubSection;
