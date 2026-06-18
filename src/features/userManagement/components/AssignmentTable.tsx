import { useState, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Badge from '@shared/components/Badge';
import Icon from '@shared/components/Icon';

export interface AssignmentColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
}

interface AssignmentTableProps<T> {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  columns: AssignmentColumn<T>[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  searchPlaceholder?: string;
  searchFields?: (item: T) => string[];
}

type SortDir = 'asc' | 'desc';

const AssignmentTable = <T,>({
  items,
  getId,
  getLabel,
  columns,
  selectedIds,
  onChange,
  searchPlaceholder,
  searchFields,
}: AssignmentTableProps<T>) => {
  const { t } = useTranslation(['userManagement', 'common']);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = q
      ? items.filter(item => {
          const fields = searchFields ? searchFields(item) : [getLabel(item)];
          return fields.some(f => (f ?? '').toLowerCase().includes(q));
        })
      : items;

    if (sortKey) {
      const col = columns.find(c => c.key === sortKey);
      if (col) {
        result = [...result].sort((a, b) => {
          const aVal = col.render
            ? String(col.render(a) ?? '')
            : String((a as Record<string, unknown>)[sortKey] ?? '');
          const bVal = col.render
            ? String(col.render(b) ?? '')
            : String((b as Record<string, unknown>)[sortKey] ?? '');
          const cmp = aVal.localeCompare(bVal);
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }

    return result;
  }, [items, search, sortKey, sortDir, columns, getLabel, searchFields]);

  const filteredIds = useMemo(() => filtered.map(getId), [filtered, getId]);

  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
  const someFilteredSelected = filteredIds.some(id => selectedIds.includes(id));

  const toggleHeaderCheckbox = () => {
    if (allFilteredSelected) {
      onChange(selectedIds.filter(id => !filteredIds.includes(id)));
    } else {
      const toAdd = filteredIds.filter(id => !selectedIds.includes(id));
      onChange([...selectedIds, ...toAdd]);
    }
  };

  const toggleRow = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(s => s !== id) : [...selectedIds, id]);
  };

  // Three-stage cycle matching the task-list standard: unsorted → asc → desc → unsorted.
  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir('asc');
    }
  };

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.includes(getId(item))),
    [items, selectedIds, getId],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Selected chips */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map(item => {
            const id = getId(item);
            return (
              <Badge
                key={id}
                badgeStyle="soft"
                dot={false}
                removable
                onRemove={() => toggleRow(id)}
                aria-label={t('aria.removeItem', { name: getLabel(item) })}
              >
                {getLabel(item)}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Icon
          name="magnifying-glass"
          style="regular"
          className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={searchPlaceholder ?? t('placeholders.searchRoles')}
          aria-label={searchPlaceholder ?? t('placeholders.searchRoles')}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Icon name="magnifying-glass" style="regular" className="size-6 mb-2 text-gray-300" />
              <p className="text-sm">{t('empty.noItemsFound')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="w-10 py-2.5 px-3 bg-gray-50">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={el => {
                        if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                      }}
                      onChange={toggleHeaderCheckbox}
                      className="rounded border-gray-300 text-primary focus:ring-primary/20"
                    />
                  </th>
                  {columns.map(col => {
                    const isActive = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50"
                        aria-sort={
                          isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                        }
                      >
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSort(col.key)}
                            className={clsx(
                              'group inline-flex items-center gap-1 transition-colors hover:text-gray-700',
                              isActive && 'text-primary',
                            )}
                          >
                            <span>{col.label}</span>
                            <Icon
                              style="solid"
                              name={
                                isActive ? (sortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'
                              }
                              className={clsx(
                                'size-2.5',
                                isActive
                                  ? 'text-primary'
                                  : 'text-gray-300 group-hover:text-gray-500',
                              )}
                            />
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => {
                  const id = getId(item);
                  const selected = selectedIds.includes(id);
                  return (
                    <tr
                      key={id}
                      onClick={() => toggleRow(id)}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        selected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50',
                      )}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleRow(id)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-gray-300 text-primary focus:ring-primary/20"
                        />
                      </td>
                      {columns.map(col => (
                        <td key={col.key} className="py-2.5 px-3 text-gray-700">
                          {col.render
                            ? col.render(item)
                            : String((item as Record<string, unknown>)[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Count summary */}
      <p className="text-xs text-gray-400">
        {t('selectionCount.items', { count: selectedIds.length })}
        {search.trim() && filtered.length !== items.length && (
          <span className="ml-1">
            ({filtered.length}/{items.length})
          </span>
        )}
      </p>
    </div>
  );
};

export default AssignmentTable;
