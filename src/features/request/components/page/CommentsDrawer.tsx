import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Right-hand drawer for the request comments.
 *
 * Not SlideOverPanel on purpose: that one is a Headless UI dialog, which makes everything outside
 * it inert, and the comment delete confirm (ConfirmDialog) portals outside it.
 */
const CommentsDrawer = ({ isOpen, onClose, children }: CommentsDrawerProps) => {
  const { t } = useTranslation('request');
  // Read through a ref so a new onClose per page render does not re-run the effect (and its focus restore).
  const asideRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    asideRef.current?.querySelector<HTMLElement>('input')?.focus();
    // ConfirmDialog swallows Escape while it is open, so this only fires for the drawer itself.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('rightMenu.tabComments')}
        className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-(--palette-surface) shadow-xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-(--palette-line-soft) px-4 py-3">
          <h3 className="text-base font-semibold text-(--palette-ink)">
            {t('rightMenu.tabComments')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('page.comments.close')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-(--palette-gray-400) transition-colors hover:bg-(--palette-surface-3) hover:text-(--palette-gray-600)"
          >
            <Icon style="solid" name="xmark" className="size-4!" />
          </button>
        </header>
        {children}
      </aside>
    </div>,
    document.body,
  );
};

export default CommentsDrawer;
