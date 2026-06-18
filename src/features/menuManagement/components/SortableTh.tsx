import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import type { SortDir } from '../tableSort';

interface SortableThProps {
  label: string;
  sortKey: string;
  activeKey: string | null;
  dir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}

/** A clickable table header that toggles sorting on its column. */
export function SortableTh({ label, sortKey, activeKey, dir, onSort, className }: SortableThProps) {
  const active = activeKey === sortKey;
  return (
    <th className={clsx('px-4 py-3', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={clsx(
          'group inline-flex items-center gap-1.5 transition-colors',
          active ? 'text-gray-700' : 'hover:text-gray-700',
        )}
      >
        {label}
        <Icon
          name={active ? (dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'sort'}
          style="solid"
          className={clsx(
            'size-3',
            active ? 'text-primary' : 'text-gray-300 group-hover:text-gray-400',
          )}
        />
      </button>
    </th>
  );
}
