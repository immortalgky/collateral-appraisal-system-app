import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { useCollateralTypeName } from './titleHooks';
import { addableCodes } from '../../utils/titleList';

interface TitleAddMenuProps {
  /** Add a title of this type; '' adds one with the type still to choose. */
  onAdd: (code: string) => void;
  allowed: ReadonlySet<string> | null;
  /** Where the list opens from the button; right-aligned by default, centred in the empty state. */
  anchor?: 'bottom end' | 'bottom';
}

export function TitleAddMenu({ onAdd, allowed, anchor = 'bottom end' }: TitleAddMenuProps) {
  const { t } = useTranslation('request');
  const nameOf = useCollateralTypeName();
  const item =
    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-(--palette-ink) data-focus:bg-(--palette-surface-3)';

  return (
    <Menu>
      <MenuButton
        className={clsx(
          'inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors',
          'hover:bg-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
        )}
      >
        <Icon style="solid" name="plus" className="size-3.5" />
        {t('titleOptions.addTitle')}
        <Icon style="solid" name="chevron-down" className="size-3" />
      </MenuButton>
      <MenuItems
        anchor={anchor}
        className="z-50 mt-1 min-w-64 overflow-hidden rounded-lg border border-(--palette-line) bg-(--palette-surface) py-1 shadow-lg focus:outline-none"
      >
        {addableCodes(allowed).map(code => (
          <MenuItem key={code}>
            <button type="button" className={item} onClick={() => onAdd(code)}>
              {nameOf(code)}
              <small className="ml-auto text-xs text-(--palette-gray-400)">{code}</small>
            </button>
          </MenuItem>
        ))}
        <MenuItem>
          <button
            type="button"
            className={clsx(
              item,
              'border-t border-(--palette-line-soft) text-(--palette-gray-500)',
            )}
            onClick={() => onAdd('')}
          >
            {t('titleSection.add.chooseLater')}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
