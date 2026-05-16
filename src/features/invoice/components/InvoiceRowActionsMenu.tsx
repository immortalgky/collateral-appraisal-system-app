import { useState } from 'react';
import Icon from '@/shared/components/Icon';

export type InvoiceRowAction = {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'danger';
};

interface InvoiceRowActionsMenuProps {
  actions: InvoiceRowAction[];
}

const InvoiceRowActionsMenu = ({ actions }: InvoiceRowActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  if (actions.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Row actions"
      >
        <Icon name="ellipsis-vertical" style="solid" className="size-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={e => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px]">
            {actions.map(action => (
              <button
                key={action.label}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setOpen(false);
                  action.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                  action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                }`}
              >
                <Icon name={action.icon} style="solid" className="size-3.5 shrink-0" />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceRowActionsMenu;
