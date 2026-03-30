import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { type ReactNode } from 'react';
import Icon from './Icon';
import clsx from 'clsx';

interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const widthClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

const SlideOverPanel = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 'lg',
  children,
}: SlideOverPanelProps) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <DialogPanel
              transition
              className={clsx(
                widthClasses[width],
                'pointer-events-auto w-screen',
                'transform transition duration-300 ease-in-out',
                'data-closed:translate-x-full',
              )}
            >
              <div className="flex h-full flex-col bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    {subtitle && (
                      <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close panel"
                  >
                    <Icon name="xmark" style="regular" className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {children}
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default SlideOverPanel;
