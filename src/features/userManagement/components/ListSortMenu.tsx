import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';

export interface ListSortOption {
  /** Stable key identifying the sort field. */
  key: string;
  /** Display label for the menu row. */
  label: string;
}

interface ListSortMenuProps {
  options: ListSortOption[];
  /** Currently active sort field key. */
  sortKey: string;
  /** true = ascending, false = descending. */
  asc: boolean;
  /** Fired with the next (key, asc) when a row is chosen. */
  onChange: (key: string, asc: boolean) => void;
  title?: string;
}

/**
 * Compact sort dropdown for the admin master-detail left lists.
 * Clicking a different field selects it (ascending); clicking the active
 * field toggles its direction.
 */
const ListSortMenu = ({ options, sortKey, asc, onChange, title }: ListSortMenuProps) => {
  const { t } = useTranslation('userManagement');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (key: string) => {
    if (key === sortKey) {
      onChange(key, !asc);
    } else {
      onChange(key, true);
    }
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title={title ?? t('sort.sortBy')}
        aria-label={title ?? t('sort.sortBy')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          'size-7 flex items-center justify-center rounded-lg border transition-colors',
          open
            ? 'border-primary text-primary bg-primary/5'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50',
        )}
      >
        <Icon name="arrow-down-short-wide" style="solid" className="size-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {t('sort.sortBy')}
          </div>
          {options.map(opt => {
            const active = opt.key === sortKey;
            return (
              <button
                key={opt.key}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => handleSelect(opt.key)}
                className={clsx(
                  'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-colors',
                  active ? 'text-primary font-medium' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className="truncate">{opt.label}</span>
                {active && (
                  <Icon
                    name={asc ? 'arrow-up' : 'arrow-down'}
                    style="solid"
                    className="size-3 shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListSortMenu;
