import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { type ReactNode } from 'react';
import Icon from './Icon';
import { FormLayoutProvider } from './form/FormLayoutProvider';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showCloseButton?: boolean;
  /** A smaller title, tighter header and body: for a short chooser, not a form. */
  compact?: boolean;
}

const Modal: React.FunctionComponent<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  compact = false,
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    '3xl': 'max-w-[90vw]',
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />

      {/*
        Two-level layout so tall content scrolls from the top instead of getting
        clipped by items-center: outer div scrolls, inner flex uses min-h-full so
        short modals stay centered while tall ones push the page scroll.
      */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className={clsx(
              sizeClasses[size],
              'w-full bg-(--palette-surface) rounded-lg shadow-xl overflow-visible',
              'transition-all duration-300 ease-out',
              'data-closed:opacity-0 data-closed:scale-95',
            )}
          >
            {/* Header */}
            <div
              className={clsx(
                'flex items-center justify-between border-b border-(--palette-line)',
                compact ? 'px-5 py-3' : 'px-6 py-4',
              )}
            >
              <h2
                className={clsx(
                  'font-semibold text-(--palette-ink)',
                  compact ? 'text-base' : 'text-xl',
                )}
              >
                {title}
              </h2>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-(--palette-gray-400) hover:text-(--palette-gray-600) transition-colors"
                  aria-label="Close modal"
                >
                  <Icon name="xmark" style="regular" className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            {/*
              Stop submit here: React bubbles synthetic submit through the portal, so a form inside
              this modal would also submit an enclosing page <form>. It must be a plain div, not
              DialogPanel: HeadlessUI skips merged on* handlers once preventDefault was called
              (react-hook-form's handleSubmit calls it), so a handler on the panel never runs.
              The layout provider crosses the portal: a dialog opened from a Compact sheet is still Standard.
            */}
            <div
              onSubmit={e => e.stopPropagation()}
              className={clsx('overflow-visible', compact ? 'px-5 py-4' : 'px-6 py-4')}
            >
              <FormLayoutProvider layout="standard">{children}</FormLayoutProvider>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default Modal;
