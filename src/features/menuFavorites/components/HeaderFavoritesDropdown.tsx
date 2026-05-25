import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import { getIconBgClass } from '@shared/components/icon-bg';
import { useFavorites } from '../useFavorites';
import { FavoritesPickerModal } from './FavoritesPickerModal';
import type { MenuTreeNode } from '@features/menuManagement/types';

interface FavoriteMenuItemProps {
  node: MenuTreeNode;
  lang: string;
  onClose: () => void;
}

function FavoriteMenuItem({ node, lang, onClose }: FavoriteMenuItemProps) {
  const label = node.labels[lang] ?? node.labels['en'] ?? node.itemKey;

  return (
    <Link
      to={node.path!}
      role="menuitem"
      onClick={onClose}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-base-300 transition-colors"
    >
      <div
        className={clsx(
          'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
          getIconBgClass(node.iconColor),
        )}
      >
        <Icon
          name={node.iconName}
          style={node.iconStyle}
          className={clsx('size-3', node.iconColor ?? 'text-gray-500')}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{label}</span>
    </Link>
  );
}

export function HeaderFavoritesDropdown() {
  const { t, i18n } = useTranslation('common');
  const lang = i18n.language ?? 'en';
  const { favoriteItems, favoriteIds, replace } = useFavorites();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleManage = useCallback(() => {
    setOpen(false);
    setPickerOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-label={t('favorites.header.openLabel')}
          aria-expanded={open}
          aria-haspopup="menu"
          className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-base-200 text-amber-500 hover:bg-gray-100 dark:hover:bg-base-300 hover:text-amber-600 transition-all focus:outline-none"
        >
          <Icon name="star" style="solid" className="size-5" />
        </button>

        {open && (
          <div
            ref={panelRef}
            role="menu"
            aria-label={t('favorites.header.title')}
            className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white dark:bg-base-200 shadow-lg ring-1 ring-gray-200 dark:ring-base-300 focus:outline-none z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-base-300">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-base-content">{t('favorites.header.title')}</h3>
            </div>

            {/* Items */}
            <div className="max-h-72 overflow-y-auto p-2">
              {favoriteItems.length === 0 ? (
                <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
                  {t('favorites.header.empty')}
                </p>
              ) : (
                favoriteItems.map(node => (
                  <FavoriteMenuItem key={node.id} node={node} lang={lang} onClose={handleClose} />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 dark:border-base-300">
              <button
                type="button"
                onClick={handleManage}
                className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 text-sm font-medium text-primary hover:bg-gray-50 dark:hover:bg-base-300 transition-colors rounded-b-xl"
              >
                <Icon name="gear" style="regular" className="size-3.5" />
                {t('favorites.header.manage')}
              </button>
            </div>
          </div>
        )}
      </div>

      <FavoritesPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentIds={favoriteIds}
        onApply={replace}
      />
    </>
  );
}
