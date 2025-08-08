import type { HTMLAttributes, ReactNode } from 'react';
import ReturnButton from '../buttons/ReturnButton';
import Icon from '../Icon';

interface AppHeaderProps extends HTMLAttributes<HTMLDivElement> {
  iconVariant: 'folder';
  title: string;
  details?: ReactNode;
}

const AppHeader = ({ iconVariant, title, details }: AppHeaderProps) => {
  let icon;
  if (iconVariant === 'folder') {
    icon = (
      <div className="size-8 bg-primary rounded-md flex items-center justify-center">
        <Icon style="solid" name="folder-open" className="text-neutral-2" />
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-center">
      <div>
        <ReturnButton />
      </div>
      <div className="">{icon}</div>
      <div className="text-lg font-medium">{title}</div>
      <div>{details}</div>
    </div>
  );
};

export default AppHeader;
