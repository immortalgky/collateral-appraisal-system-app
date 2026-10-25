import type { ReactNode } from 'react';
import Icon from '../Icon';
import Avatar from '../Avatar';

interface PersonRowProps {
  label: string;
  name: string;
  avatar: string | null;
  isMe?: boolean;
  onClick?: () => void;
  editable?: boolean;
  trailing?: ReactNode;
}

const PersonRow = ({ label, name, avatar, isMe, onClick, editable, trailing }: PersonRowProps) => {
  const content = (
    <>
      <Avatar src={avatar} name={name !== 'Not set' ? name : '?'} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-(--palette-ink) truncate">
          {name}
          {isMe && (
            <span className="ml-1 text-xs text-(--palette-primary-text) font-normal">(Me)</span>
          )}
        </div>
        <div className="text-xs text-(--palette-gray-500)">{label}</div>
      </div>
      {trailing && <div className="text-xs text-(--palette-gray-500) shrink-0">{trailing}</div>}
      {editable && (
        <Icon
          name="pen"
          style="regular"
          className="w-3.5 h-3.5 text-(--palette-gray-400) opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </>
  );

  if (onClick && editable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group w-full flex items-center gap-2 p-2 bg-(--palette-surface-2) rounded-lg hover:bg-(--palette-surface-3) transition-colors text-left"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="group flex items-center gap-2 p-2 bg-(--palette-surface-2) rounded-lg">
      {content}
    </div>
  );
};

export default PersonRow;
