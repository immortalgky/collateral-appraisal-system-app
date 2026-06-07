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
          return fields.some(f => f.toLowerCase().includes(q));
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
    onChange(
      selectedIds.includes(id) ? selectedIds.filter(s => s !== id) : [...selectedIds, id],
    );
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
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
              <thead className="sticky top-0 bg-primary/10 z-10">
                <tr>
                  <th className="w-10 py-2.5 px-3">
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
                  {columns.map(col => (
                    <th
                      key={col.key}
                      className={clsx(
                        'py-2.5 px-3 text-left text-xs font-semibold text-primary',
                        col.sortable && 'cursor-pointer select-none hover:text-primary/80',
                      )}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && (
                          <span className="inline-flex flex-col gap-px">
                            <Icon
                              name="chevron-up"
                              style="solid"
                              className={clsx(
                                'size-2',
                                sortKey === col.key && sortDir === 'asc'
                                  ? 'text-primary'
                                  : 'text-gray-300',
                              )}
                            />
                            <Icon
                              name="chevron-down"
                              style="solid"
                              className={clsx(
                                'size-2',
                                sortKey === col.key && sortDir === 'desc'
                                  ? 'text-primary'
                                  : 'text-gray-300',
                              )}
                            />
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
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
