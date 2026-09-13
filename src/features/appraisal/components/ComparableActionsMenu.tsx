import type { KeyboardEvent, MouseEvent } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';

interface ComparableActionsMenuProps {
  onOpen: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

/**
 * The ⋮ menu on a comparable row: open, duplicate, delete.
 *
 * Every event stops here. The row underneath opens the comparable on click and on Enter, and the
 * menu's panel is portalled — but React still bubbles portal events through the component tree,
 * so without this a click on "Delete" would also open the comparable.
 */
const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

export const ComparableActionsMenu = ({ onOpen, onCopy, onDelete }: ComparableActionsMenuProps) => {
  const { t } = useTranslation('appraisal');

  const item = (label: string, icon: string, onClick: () => void, danger = false) => (
    <MenuItem>
      {({ focus }) => (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onClick();
          }}
          className={clsx(
            'flex w-full items-center gap-2 px-3 py-2 text-sm',
            danger ? 'text-red-600' : 'text-gray-700',
            focus && (danger ? 'bg-red-50' : 'bg-gray-50'),
          )}
        >
          <Icon name={icon} className={clsx('text-xs', !danger && 'text-gray-400')} />
          {label}
        </button>
      )}
    </MenuItem>
  );

  return (
    <Menu as="div" className="relative">
      <MenuButton
        onClick={stop}
        onKeyDown={stop}
        aria-label={t('markets.actions.menu')}
        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <Icon name="ellipsis-vertical" className="text-sm" style="solid" />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom end', gap: 4 }}
        onClick={stop}
        onKeyDown={stop}
        className="z-50 w-40 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
      >
        {item(t('markets.actions.open'), 'pen-to-square', onOpen)}
        {item(t('markets.actions.copy'), 'copy', onCopy)}
        <div className="my-1 border-t border-gray-100" />
        {item(t('markets.actions.delete'), 'trash', onDelete, true)}
      </MenuItems>
    </Menu>
  );
};

export default ComparableActionsMenu;
