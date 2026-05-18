import Icon from '@shared/components/Icon';
import type { SortDir } from '../types';

interface SortableThProps {
  label: string;
  /** When undefined, the header is non-sortable (plain text). */
  sortKey?: string;
  activeSortKey?: string;
  activeSortDir?: SortDir;
  /** Called with `(undefined, undefined)` when the sort is cleared. */
  onSortChange?: (sortKey: string | undefined, sortDir: SortDir | undefined) => void;
  className?: string;
}

/**
 * Table header cell with a click-to-sort affordance. Cycles asc → desc → none.
 * Non-sortable when `sortKey` is omitted (renders plain label).
 */
function SortableTh({
  label,
  sortKey,
  activeSortKey,
  activeSortDir,
  onSortChange,
  className,
}: SortableThProps) {
  const isSortable = Boolean(sortKey && onSortChange);
  const isActive = isSortable && sortKey === activeSortKey;

  const handleClick = () => {
    if (!isSortable || !sortKey || !onSortChange) return;
    // Three-stage cycle: unsorted → asc → desc → unsorted
    if (!isActive) {
      onSortChange(sortKey, 'asc');
      return;
    }
    if (activeSortDir === 'asc') {
      onSortChange(sortKey, 'desc');
      return;
    }
    // currently 'desc' → clear
    onSortChange(undefined, undefined);
  };

  const baseCls =
    'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50';

  if (!isSortable) {
    return <th className={`${baseCls} ${className ?? ''}`.trim()}>{label}</th>;
  }

  return (
    <th
      className={`${baseCls} ${className ?? ''}`.trim()}
      aria-sort={isActive ? (activeSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 hover:text-gray-700 transition-colors group ${
          isActive ? 'text-primary' : ''
        }`}
      >
        <span>{label}</span>
        <Icon
          style="solid"
          name={isActive ? (activeSortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}
          className={`size-2.5 ${
            isActive ? 'text-primary' : 'text-gray-300 group-hover:text-gray-500'
          }`}
        />
      </button>
    </th>
  );
}

export default SortableTh;
