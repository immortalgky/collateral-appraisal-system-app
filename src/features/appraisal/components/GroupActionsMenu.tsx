import { useTranslation } from 'react-i18next';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';

interface GroupActionsMenuProps {
  onRename: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  /** Size of the trigger's icon — the split view's rail runs smaller than the group header. */
  iconClassName?: string;
  /** Item wording; defaults to the property group's. The Photos tab's topics pass their own. */
  labels?: { rename: string; delete: string };
  className?: string;
}

/**
 * Rename and delete, for a property group.
 *
 * One always-there button instead of two that appear on hover: revealing controls on hover made
 * the header twitch as the pointer crossed it, and the two actions are rare enough that neither
 * deserves a permanent target of its own.
 *
 * Shared by the group header and the split view's rail so the same group offers the same two
 * actions wherever it is drawn.
 */
export const GroupActionsMenu = ({
  onRename,
  onDelete,
  isDeleting = false,
  iconClassName = 'text-xs',
  labels,
  className,
}: GroupActionsMenuProps) => {
  const { t } = useTranslation('appraisal');

  return (
    <Menu as="div" className={clsx('relative shrink-0', className)}>
      <MenuButton
        className="flex items-center rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        title={t('properties.groupActions')}
      >
        <Icon name="ellipsis-vertical" className={iconClassName} style="solid" />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom end', gap: 4 }}
        className="z-50 w-44 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
      >
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              onClick={onRename}
              className={clsx(
                'flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700',
                focus && 'bg-gray-50',
              )}
            >
              <Icon name="pencil" className="text-xs text-gray-400" />
              {labels?.rename ?? t('properties.renameGroup')}
            </button>
          )}
        </MenuItem>
        <MenuItem disabled={isDeleting}>
          {({ focus }) => (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className={clsx(
                'flex w-full items-center gap-2 px-3 py-2 text-sm',
                isDeleting ? 'cursor-not-allowed text-gray-400' : 'text-red-600',
                focus && !isDeleting && 'bg-red-50',
              )}
            >
              <Icon
                name={isDeleting ? 'spinner' : 'trash'}
                className={clsx('text-xs', isDeleting && 'animate-spin')}
              />
              {labels?.delete ?? t('properties.deleteGroup')}
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};

export default GroupActionsMenu;
