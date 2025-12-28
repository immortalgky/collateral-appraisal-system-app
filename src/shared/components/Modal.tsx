import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { type ReactNode } from 'react';
import Icon from './Icon';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCloseButton?: boolean;
}

const Modal: React.FunctionComponent<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <DialogPanel
          transition
          className={clsx(
            sizeClasses[size],
            'w-full bg-white rounded-lg shadow-xl overflow-visible',
            'transition-all duration-300 ease-out',
            'data-closed:opacity-0 data-closed:scale-95',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <Icon name="xmark" style="regular" className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-visible">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default Modal;
