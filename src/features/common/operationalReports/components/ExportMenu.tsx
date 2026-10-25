import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  isExporting: boolean;
}

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

/** Single "Export ▾" action menu (Excel / CSV / PDF), matching the app's headlessui Menu pattern. */
function ExportMenu({ onExport, isExporting }: ExportMenuProps) {
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
        className="mt-1 min-w-36 rounded-lg border border-(--palette-line) bg-(--palette-surface) py-1 shadow-lg z-50 focus:outline-none"
      >
        {ITEMS.map(item => (
          <MenuItem key={item.format}>
            <button
              type="button"
              onClick={() => onExport(item.format)}
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
