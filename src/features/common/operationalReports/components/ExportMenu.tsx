import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { forwardRef, useState, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';
export type ExportLang = 'th' | 'en';

interface ExportMenuProps {
  onExport: (format: ExportFormat, lang?: ExportLang) => void;
  isExporting: boolean;
  /** Report defines Thai headers → offer the export-language choice. */
  hasThaiHeaders?: boolean;
}

const LANGS: { value: ExportLang; label: string }[] = [
  { value: 'th', label: 'ไทย' },
  { value: 'en', label: 'English' },
];

const ITEMS: { format: ExportFormat; label: string; icon: string; color: string }[] = [
  {
    format: 'xlsx',
    label: 'Excel',
    icon: 'file-excel',
    color: 'text-green-600 dark:text-green-400',
  },
  { format: 'csv', label: 'CSV', icon: 'file-csv', color: 'text-blue-600 dark:text-blue-400' },
  { format: 'pdf', label: 'PDF', icon: 'file-pdf', color: 'text-(--palette-danger)' },
];

// MenuItem forces role="menuitem" on its child; a custom `as` lets the language options be
// radio-like menu items (arrow-key reachable, aria-checked) inside the menu.
const LangOption = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { checked: boolean }
>(({ checked, ...props }, ref) => (
  <button ref={ref} type="button" {...props} role="menuitemradio" aria-checked={checked} />
));
LangOption.displayName = 'LangOption';

/** Single "Export ▾" action menu (Excel / CSV / PDF), matching the app's headlessui Menu pattern. */
function ExportMenu({ onExport, isExporting, hasThaiHeaders }: ExportMenuProps) {
  const [lang, setLang] = useState<ExportLang>('th');
  return (
    <Menu as="div" className="relative shrink-0">
      <MenuButton
        disabled={isExporting}
        className="inline-flex items-center gap-1.5 rounded-lg border border-(--palette-line-strong) bg-(--palette-surface) px-3 py-1.5 text-sm font-medium text-(--palette-ink) hover:bg-(--palette-surface-2) hover:border-(--palette-line-strong) transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <Icon
          style="solid"
          name={isExporting ? 'spinner' : 'file-arrow-down'}
          className={clsx(
            'size-3.5 text-(--palette-primary-text)',
            isExporting && 'animate-spin text-(--palette-gray-400)',
          )}
        />
        Export
        <Icon style="regular" name="chevron-down" className="size-3 text-(--palette-gray-400)" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        // headlessui closes the menu on Enter/Space; for the language options, set the language
        // here (focus is virtual, so the active item is the one carrying data-focus) and skip it.
        onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          const active = e.currentTarget.querySelector<HTMLElement>(
            '[role="menuitemradio"][data-focus]',
          );
          if (!active) return;
          e.preventDefault();
          setLang(active.dataset.lang as ExportLang);
        }}
        className="mt-1 min-w-36 rounded-lg border border-(--palette-line) bg-(--palette-surface) py-1 shadow-lg z-50 focus:outline-none"
      >
        {hasThaiHeaders && (
          <div
            role="group"
            aria-label="Export language"
            className="mx-2 mb-1 mt-1 flex rounded-md bg-(--palette-surface-3) p-0.5"
          >
            {LANGS.map(l => (
              // MenuItems makes these arrow-key reachable; preventDefault keeps the menu open on pick.
              <MenuItem
                key={l.value}
                as={LangOption}
                checked={lang === l.value}
                data-lang={l.value}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  setLang(l.value);
                }}
                className={clsx(
                  'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors data-focus:ring-2 data-focus:ring-primary/30',
                  lang === l.value
                    ? 'bg-(--palette-surface) text-(--palette-ink) shadow-sm'
                    : 'text-(--palette-gray-500)',
                )}
              >
                {l.label}
              </MenuItem>
            ))}
          </div>
        )}
        {ITEMS.map(item => (
          <MenuItem key={item.format}>
            <button
              type="button"
              onClick={() => onExport(item.format, hasThaiHeaders ? lang : undefined)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-(--palette-ink) transition-colors data-focus:bg-(--palette-surface-3)"
            >
              <Icon style="solid" name={item.icon} className={clsx('size-3.5', item.color)} />
              <span className="flex-1">{item.label}</span>
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

export default ExportMenu;
