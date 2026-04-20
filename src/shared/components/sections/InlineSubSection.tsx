import type { ReactNode } from 'react';
import clsx from 'clsx';

interface InlineSubSectionProps {
  title: string;
  description?: string;
  rightSlot?: ReactNode;
  className?: string;
  children: ReactNode;
}

const InlineSubSection = ({
  title,
  description,
  rightSlot,
  className,
  children,
}: InlineSubSectionProps) => {
  return (
    <section className={clsx('py-4 first:pt-1 last:pb-1', className)}>
      <div className="mb-3">
        <div className="flex items-center gap-1.5">
          <h4 className="text-[11px] font-semibold text-gray-600 tracking-wider uppercase">
            {title}
          </h4>
          {rightSlot && <span className="text-[11px] text-gray-400">{rightSlot}</span>}
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
};

export default InlineSubSection;
