import clsx from 'clsx';
import React from 'react';

interface SectionDividerProps {
  label?: string;
  children?: React.ReactNode; // icon or custom content
  labelAlignment?: 'left' | 'center' | 'right';
  className?: string;
  lineClassName?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: 's' | 'm' | 'l';
}

function SectionDivider({
  label,
  children,
  labelAlignment = 'center',
  className,
  lineClassName,
  orientation = 'horizontal',
  size = 'm',
}: SectionDividerProps) {
  const content = children ?? label;

  const borderSize = {
    s: '1',
    m: '2',
    l: '4',
  };

  if (orientation === 'vertical') {
    return (
      <div className={clsx('flex flex-col items-center mx-4 px-1', className)}>
        <div
          className={clsx(
            'flex-1 w-px border-neutral-3',
            `border-l-${borderSize[size]}`,
            lineClassName,
          )}
        />
        {content ? <div className="py-2 shrink-0">{content}</div> : null}
        <div
          className={clsx(
            'flex-1 w-px border-neutral-3',
            `border-l-${borderSize[size]}`,
            lineClassName,
          )}
        />
      </div>
    );
  }

  // horizontal
  const leftSize = labelAlignment === 'left' ? 'flex-none w-6' : 'flex-1';
  const rightSize = labelAlignment === 'right' ? 'flex-none w-6' : 'flex-1';

  return (
    <div className={clsx('flex items-center w-full my-4 py-1', className)}>
      <div
        className={clsx(`border-b-${borderSize[size]} border-neutral-3`, leftSize, lineClassName)}
      />
      {content ? <div className="mx-3 shrink-0">{content}</div> : null}
      <div
        className={clsx(`border-b-${borderSize[size]} border-neutral-3`, rightSize, lineClassName)}
      />
    </div>
  );
}

export default SectionDivider;
