import { useTranslation } from 'react-i18next';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Icon from './Icon';
import clsx from 'clsx';

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
] as const;

export default function LanguageSwitcher(): React.ReactNode {
  const { i18n } = useTranslation();

  const current = languages.find(l => i18n.language?.startsWith(l.code)) ?? languages[0];

  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200/60 text-xs font-semibold text-gray-700 transition-all cursor-pointer">
        <span className="text-sm leading-none">{current.flag}</span>
        <span>{current.code.toUpperCase()}</span>
        <Icon name="chevron-down" style="solid" className="size-2.5 text-gray-400" />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="z-50 mt-1.5 w-40 origin-top-right rounded-xl bg-white p-1 shadow-lg ring-1 ring-black/8 transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        {languages.map(lang => (
          <MenuItem key={lang.code}>
            <button
              type="button"
              onClick={() => i18n.changeLanguage(lang.code)}
              className={clsx(
                'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                current.code === lang.code
                  ? 'bg-gray-50 text-gray-900 font-medium'
                  : 'text-gray-600 data-[focus]:bg-gray-50 data-[focus]:text-gray-900',
              )}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.label}</span>
              {current.code === lang.code && (
                <Icon name="check" style="solid" className="size-3.5 text-primary-600" />
              )}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
