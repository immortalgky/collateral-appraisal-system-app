import { useTranslation } from 'react-i18next';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Icon from './Icon';
import clsx from 'clsx';

import flagEn from '@assets/flags/en.svg';
import flagTh from '@assets/flags/th.svg';
import flagZh from '@assets/flags/zh.svg';

const languages = [
  { code: 'en', label: 'English', flag: flagEn },
  { code: 'th', label: 'ไทย', flag: flagTh },
  { code: 'zh', label: '中文', flag: flagZh },
] as const;

/**
 * The classes that differ between the two looks. DARK_STYLE is for the sign-in page's navy panel: fixed px,
 * literal colours, a light menu, no theme (the identity provider's copy of this picker matches it exactly).
 */
const DEFAULT_STYLE = {
  trigger:
    'gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-base-200 hover:bg-gray-100 dark:hover:bg-base-300 border-gray-200/60 dark:border-base-300 text-gray-700 dark:text-base-content',
  flag: 'w-5 h-3.5',
  chevron: 'text-gray-400',
  menu: 'mt-1.5 w-40 rounded-xl bg-white dark:bg-base-200 p-1 ring-1 ring-black/8 dark:ring-base-300',
  item: 'gap-2.5 rounded-lg px-2.5 py-2 text-sm',
  itemOn: 'bg-gray-50 dark:bg-base-300 text-gray-900 dark:text-base-content',
  itemOff:
    'text-gray-600 dark:text-gray-300 data-[focus]:bg-gray-50 dark:data-[focus]:bg-base-300 data-[focus]:text-gray-900 dark:data-[focus]:text-base-content',
  check: 'text-(--palette-primary-text)',
};

// The trigger's focus ring: the global :focus-visible rule (index.css) already gives 2px solid + 2px
// offset; only its teal changes, and it is unlayered, so the utility needs `!` to beat it.
const DARK_STYLE = {
  trigger:
    'h-[36px] gap-[6px] px-[10px] rounded-full border-white/25 text-[12px] leading-[20px] text-white hover:bg-white/10 focus-visible:outline-[#93c5fd]!',
  flag: 'w-[20px] h-[14px]',
  chevron: 'text-[12px] text-[#99a1af]',
  menu: 'mt-[6px] w-[140px] rounded-[12px] bg-white p-[4px] ring-1 ring-black/8 focus:outline-none!',
  item: 'gap-[10px] rounded-[8px] px-[10px] py-[8px] text-[13px] leading-[20px]',
  itemOn: 'bg-[#f9fafb] text-[#101828]',
  itemOff: 'text-[#4a5565] data-[focus]:bg-[#f9fafb] data-[focus]:text-[#101828]',
  check: 'text-[13px] text-[#0d9488]',
};

export default function LanguageSwitcher({
  onDark = false,
}: {
  /**
   * Light-on-dark trigger, for the sign-in page's navy panel. Fixed px and fixed light-menu colours
   * (no rem, no theme) so the identity provider's copy of this picker can match it exactly.
   */
  onDark?: boolean;
}): React.ReactNode {
  const { i18n } = useTranslation();

  const current = languages.find(l => i18n.language?.startsWith(l.code)) ?? languages[0];
  const style = onDark ? DARK_STYLE : DEFAULT_STYLE;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className={clsx(
          'flex items-center border font-semibold transition-all cursor-pointer',
          style.trigger,
        )}
      >
        <img
          src={current.flag}
          alt={current.code}
          className={clsx('rounded-[2px] object-cover', style.flag)}
        />
        <span>{current.code.toUpperCase()}</span>
        <Icon name="chevron-down" style="solid" className={style.chevron} />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className={clsx(
          'z-50 origin-top-right shadow-lg transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
          style.menu,
        )}
      >
        {languages.map(lang => (
          <MenuItem key={lang.code}>
            <button
              type="button"
              onClick={() => i18n.changeLanguage(lang.code)}
              className={clsx(
                'group flex w-full items-center transition-colors',
                style.item,
                current.code === lang.code ? ['font-medium', style.itemOn] : style.itemOff,
              )}
            >
              <img
                src={lang.flag}
                alt={lang.code}
                className={clsx('rounded-[2px] object-cover', style.flag)}
              />
              <span className="flex-1 text-left">{lang.label}</span>
              {current.code === lang.code && (
                <Icon name="check" style="solid" className={style.check} />
              )}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
