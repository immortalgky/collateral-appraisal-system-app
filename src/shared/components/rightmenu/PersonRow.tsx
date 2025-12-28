import Icon from '../Icon';

interface PersonRowProps {
  label: string;
  name: string;
  avatar: string | null;
  isMe?: boolean;
  onClick?: () => void;
  editable?: boolean;
}

const PersonRow = ({ label, name, avatar, isMe, onClick, editable }: PersonRowProps) => {
  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const content = (
    <>
      {avatar ? (
        <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-xs font-medium text-primary-700">
            {name !== 'Not set' ? getInitials(name) : '?'}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-900 truncate">
          {name}
          {isMe && <span className="ml-1 text-xs text-primary-600 font-normal">(Me)</span>}
        </div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
      {editable && (
        <Icon
          name="pen"
          style="regular"
          className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </>
  );

  if (onClick && editable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group w-full flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
      >
        {content}
      </button>
    );
  }

  return <div className="group flex items-center gap-2 p-2 bg-gray-50 rounded-lg">{content}</div>;
};

export default PersonRow;
