import { Dialog, DialogBackdrop, DialogPanel, Transition } from '@headlessui/react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { FormLayoutProvider } from './form/FormLayoutProvider';
import { NO_OUTLINE } from '@/shared/hooks/usePointerMode';
import clsx from 'clsx';

interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  width?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
  children: ReactNode;
  /** Pinned under the scrolling content — for actions that must stay reachable on long forms. */
  footer?: ReactNode;
  /** Controls shown on the title row, left of the close button (e.g. filter chips). */
  headerActions?: ReactNode;
  /** Runs once the panel has finished closing (its leave transition is done). */
  afterLeave?: () => void;
}

const widthClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-[70vw]',
  // Edge to edge, for a panel that has become a screen in its own right.
  full: 'max-w-full',
};

const SlideOverPanel = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 'lg' as const,
  children,
  footer,
  headerActions,
  afterLeave,
}: SlideOverPanelProps) => {
  const { t } = useTranslation('common');
  // Inside a Transition the dialog takes its open state from it (and an `open` prop is not allowed),
  // which is what makes `afterLeave` available; without one the dialog is driven by `open` as before.
  const dialog = (open?: boolean) => (
    // The dialog root (tabindex -1) and the panel take the focus when something inside is clicked
    // or the drawer opens; they are containers, not controls, so the global :focus-visible outline
    // — which only an inline style can switch off — must never box them in blue.
    <Dialog
      {...(open === undefined ? {} : { open })}
      onClose={onClose}
      className="relative z-50"
      style={NO_OUTLINE}
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <DialogPanel
              transition
              style={NO_OUTLINE}
              className={clsx(
                widthClasses[width],
                'pointer-events-auto w-screen',
                'transform transition duration-300 ease-in-out',
                'data-closed:translate-x-full',
              )}
            >
              <div className="flex h-full flex-col bg-(--palette-surface) shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-(--palette-line)">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold break-words text-(--palette-ink)">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="mt-0.5 text-sm text-(--palette-gray-500)">{subtitle}</p>
                    )}
                  </div>
                  {headerActions && (
                    <div className="ml-auto flex shrink-0 items-center pl-3">{headerActions}</div>
                  )}
                  <button
                    onClick={onClose}
                    className="ml-3 text-(--palette-gray-400) hover:text-(--palette-gray-600) transition-colors"
                    aria-label={t('actions.closePanel')}
                  >
                    <Icon name="xmark" style="regular" className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <FormLayoutProvider layout="standard">{children}</FormLayoutProvider>
                </div>

                {footer && (
                  <div className="border-t border-(--palette-line) bg-(--palette-surface) px-6 py-3">
                    {footer}
                  </div>
                )}
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );

  return afterLeave ? (
    <Transition show={isOpen} afterLeave={afterLeave}>
      {dialog()}
    </Transition>
  ) : (
    dialog(isOpen)
  );
};

export default SlideOverPanel;
