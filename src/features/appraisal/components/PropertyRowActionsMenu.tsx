import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

interface PropertyRowActionsMenuProps {
  property: PropertyItem;
  groupId: string;
  onEdit: (property: PropertyItem, groupId: string) => void;
  onMoveTo: (property: PropertyItem, groupId: string) => void;
  onCopy: (property: PropertyItem) => void;
  onPaste: (groupId: string) => void;
  onDelete: (property: PropertyItem, groupId: string) => void;
  hasClipboard: boolean;
  className?: string;
}

/**
 * The per-property "…" menu.
 *
 * Lifted out of the old table row so the dense table, the card grid and the split view all offer
 * the same actions — the two views that cannot be dragged rely on "Move to" here instead, so it
 * has to be present wherever a property is listed, not just in the table.
 */
export const PropertyRowActionsMenu = ({
  property,
  groupId,
  onEdit,
  onMoveTo,
  onCopy,
  onPaste,
  onDelete,
  hasClipboard,
  className,
}: PropertyRowActionsMenuProps) => {
  const { t } = useTranslation('appraisal');
  const readOnly = usePageReadOnly();

  if (readOnly) return null;

  const item = (
    label: string,
    icon: string,
    onClick: () => void,
    opts: { danger?: boolean; disabled?: boolean } = {},
  ) => (
    <MenuItem disabled={opts.disabled}>
      {({ focus }) => (
        <button
          type="button"
          onClick={onClick}
          disabled={opts.disabled}
          className={clsx(
            'flex w-full items-center gap-2 px-3 py-2 text-sm',
            opts.disabled && 'text-gray-400 cursor-not-allowed',
            !opts.disabled && opts.danger && 'text-red-600',
            !opts.disabled && !opts.danger && 'text-gray-700',
            focus && !opts.disabled && (opts.danger ? 'bg-red-50' : 'bg-gray-50'),
          )}
        >
          <Icon name={icon} className={clsx('text-xs', !opts.danger && 'text-gray-400')} />
          {label}
        </button>
      )}
    </MenuItem>
  );

  return (
    <Menu as="div" className={clsx('relative', className)}>
      <MenuButton
        onClick={e => e.stopPropagation()}
        className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <Icon name="ellipsis-vertical" className="text-sm" style="solid" />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom end', gap: 4 }}
        className="z-50 w-36 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none"
      >
        <div className="py-1">
          {item(t('properties.contextMenu.edit'), 'pen-to-square', () => onEdit(property, groupId))}
          {item(t('properties.contextMenu.moveTo'), 'arrow-right-arrow-left', () =>
            onMoveTo(property, groupId),
          )}
          {item(t('properties.contextMenu.copy'), 'copy', () => onCopy(property))}
          {item(
            t('properties.contextMenu.paste'),
            'paste',
            () => hasClipboard && onPaste(groupId),
            {
              disabled: !hasClipboard,
            },
          )}
          <div className="border-t border-gray-100 my-1" />
          {item(t('properties.contextMenu.delete'), 'trash', () => onDelete(property, groupId), {
            danger: true,
          })}
        </div>
      </MenuItems>
    </Menu>
  );
};

export default PropertyRowActionsMenu;
