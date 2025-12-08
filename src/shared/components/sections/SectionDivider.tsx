import clsx from 'clsx';

interface SectionDividerProps {
  label: string;
  labelAlignment?: 'left' | 'center' | 'right';
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  color?: 'primary' | 'secondary' | 'accent' | 'neutral'; // etc.
}

function SectionDivider({
  label = '',
  labelAlignment = 'center',
  className,
  orientation = 'horizontal',
  color = 'primary',
}: SectionDividerProps) {
  const labelAlignmentStyle = {
    left: 'divider-start',
    center: 'divider-center',
    right: 'divider-end',
  };
  const orientationStyle = {
    horizontal: 'my-4 w-full',
    vertical: 'divider-vertical h-8',
  };

  return (
    <div className="flex w-full">
      <div
        className={clsx(
          'divider',
          `divider-${color}`,
          labelAlignmentStyle[labelAlignment],
          orientationStyle[orientation],
          className,
        )}
      >
        {label}
      </div>
    </div>
  );
}

export default SectionDivider;
