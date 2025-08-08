import Icon from '@/shared/components/Icon';
import type { HTMLAttributes } from 'react';

interface TitleInformationHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  onCopy: () => void;
}

const TitleInformationHeader = ({ title, onCopy, ...props }: TitleInformationHeaderProps) => {
  return (
    <div {...props}>
      <div className="flex gap-4 items-center my-4">
        <p className="font-medium m-0">{title}</p>
        <button type="button" onClick={onCopy}>
          <Icon style="solid" name="copy" className="text-cyan-600" />
        </button>
      </div>
    </div>
  );
};

export default TitleInformationHeader;
