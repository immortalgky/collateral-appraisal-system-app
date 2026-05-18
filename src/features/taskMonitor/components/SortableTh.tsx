import Icon from '@shared/components/Icon';
import type { SortDir } from '../types';

interface SortableThProps {
  label: string;
  /** When undefined, the header is non-sortable (plain text). */
  sortKey?: string;
  activeSortKey?: string;
  activeSortDir?: SortDir;
  onSortChange?: (sortKey: string, sortDir: SortDir) => void;
  className?: string;
}

/**
 * Table header cell with a click-to-sort affordance. Cycles between asc → desc.
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
    const nextDir: SortDir = isActive && activeSortDir === 'asc' ? 'desc' : 'asc';
    onSortChange(sortKey, nextDir);
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
        className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors group"
      >
        <span>{label}</span>
        {isActive ? (
          <Icon
            style="solid"
            name={activeSortDir === 'asc' ? 'arrow-up' : 'arrow-down'}
            className="size-3 text-primary"
          />
        ) : (
          <Icon
            style="solid"
            name="sort"
            className="size-3 text-gray-300 group-hover:text-gray-500"
          />
        )}
      </button>
    </th>
  );
}

export default SortableTh;
