import Icon from '@/shared/components/Icon';
import type { HTMLAttributes } from 'react';

interface TitleItemCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  description: string;
}
const TitleItemCard = ({ label, description, ...props }: TitleItemCardProps) => {
  return (
    <div className="flex items-center gap-3" {...props}>
      <div className="size-10 bg-cyan-600/20 rounded-full flex items-center justify-center">
        <Icon style="solid" name="file" className="text-cyan-600" />
      </div>
      <div className="flex flex-col">
        <div className="text-cyan-600">{label}</div>
        <div className="text-xs">{description}</div>
      </div>
    </div>
  );
};

export default TitleItemCard;
