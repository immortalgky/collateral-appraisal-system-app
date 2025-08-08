import type { HTMLAttributes } from 'react';

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  rightIcon?: React.ReactNode;
}
const SectionHeader = ({ title, rightIcon }: SectionHeaderProps) => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-lg">{title}</div>
        {rightIcon && rightIcon}
      </div>
      <hr className="border-gray-300" />
    </div>
  );
};

export default SectionHeader;
