import { useEffect, useRef } from 'react';
import Icon from '@shared/components/Icon';

interface ContextMenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface PropertyContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const PropertyContextMenu = ({
  x,
  y,
  items,
  onClose,
}: PropertyContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 1000,
      }}
      className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
          className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
            item.disabled
              ? 'text-gray-400 cursor-not-allowed'
              : item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Icon name={item.icon} className="w-4" />
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
