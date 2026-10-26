import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';

interface MoreActionsMenuProps {
  onDuplicate: () => void;
  onDelete: () => void;
  /** Both actions need a saved request (and nothing running) */
  disabled: boolean;
}

/** The "..." menu in the action bar: the rare actions, so the bar keeps to Cancel and the saves. */
const MoreActionsMenu = ({ onDuplicate, onDelete, disabled }: MoreActionsMenuProps) => {
  const { t } = useTranslation('request');

  return (
    <Menu as="div" className="relative">
      <MenuButton
        title={t('page.actions.more')}
        aria-label={t('page.actions.more')}
        className="flex size-8 items-center justify-center rounded-lg text-(--palette-gray-500) transition-colors hover:bg-(--palette-surface-3) hover:text-(--palette-ink)"
      >
        <Icon style="solid" name="ellipsis" className="size-4!" />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'top start', gap: 8 }}
        className="z-50 w-44 rounded-lg bg-(--palette-surface) py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
      >
        <MenuItem disabled={disabled}>
          {({ focus }) => (
            <button
              type="button"
              onClick={onDuplicate}
              disabled={disabled}
              className={clsx(
                'flex w-full items-center gap-2 px-3 py-2 text-sm',
                disabled ? 'cursor-not-allowed text-(--palette-gray-300)' : 'text-(--palette-ink)',
                focus && !disabled && 'bg-(--palette-surface-2)',
              )}
            >
              <Icon style="regular" name="copy" className="size-3.5!" />
              {t('actions.duplicate')}
            </button>
          )}
        </MenuItem>
        <MenuItem disabled={disabled}>
          {({ focus }) => (
            <button
              type="button"
              onClick={onDelete}
              disabled={disabled}
              className={clsx(
                'flex w-full items-center gap-2 px-3 py-2 text-sm',
                disabled
                  ? 'cursor-not-allowed text-(--palette-gray-300)'
                  : 'text-(--palette-danger)',
                focus && !disabled && 'bg-(--palette-req-wash)',
              )}
            >
              <Icon style="regular" name="trash-can" className="size-3.5!" />
              {t('page.actions.deleteRequest')}
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};

export default MoreActionsMenu;
