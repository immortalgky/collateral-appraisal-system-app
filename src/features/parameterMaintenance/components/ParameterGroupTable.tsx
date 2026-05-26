import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';

export interface ParameterItem {
  parId: number;
  group: string;
  country: string;
  language: string;
  code: string;
  description: string;
  isActive: boolean;
  seqNo: number;
}

interface ParameterGroupRow {
  group: string;
  totalCount: number;
  activeCount: number;
}

interface ParameterGroupTableProps {
  parameters: ParameterItem[];
  basePath: string;
  isLoading?: boolean;
}

const ParameterGroupTable = ({ parameters, basePath, isLoading }: ParameterGroupTableProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const groups = useMemo<ParameterGroupRow[]>(() => {
    const map = new Map<string, { total: number; active: number }>();
    for (const p of parameters) {
      const existing = map.get(p.group) ?? { total: 0, active: 0 };
      map.set(p.group, {
        total: existing.total + 1,
        active: existing.active + (p.isActive ? 1 : 0),
      });
    }
    return Array.from(map.entries())
      .map(([group, counts]) => ({
        group,
        totalCount: counts.total,
        activeCount: counts.active,
      }))
      .sort((a, b) => a.group.localeCompare(b.group));
  }, [parameters]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const filtered = groups.filter(g => {
    if (!search.trim()) return true;
    return g.group.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="relative flex-1 max-w-sm">
          <Icon
            name="magnifying-glass"
            style="regular"
            className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by group name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0">{groups.length} group(s)</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Icon
            name="rectangle-list"
            style="regular"
            className="size-8 mx-auto mb-2 text-gray-300"
          />
          <p className="text-sm">No parameter groups found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-primary/10">
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left first:rounded-tl-lg">
                  Group
                </th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center w-32">
                  Total
                </th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center w-32">
                  Active
                </th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center last:rounded-tr-lg w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr
                  key={row.group}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`${basePath}/${encodeURIComponent(row.group)}`)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon name="layer-group" style="solid" className="size-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">{row.group}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm text-gray-600">{row.totalCount}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 text-sm',
                        row.activeCount === row.totalCount
                          ? 'text-emerald-600'
                          : row.activeCount === 0
                            ? 'text-gray-400'
                            : 'text-amber-600',
                      )}
                    >
                      {row.activeCount}
                      {row.activeCount < row.totalCount && (
                        <span className="text-xs text-gray-400">/ {row.totalCount}</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}/${encodeURIComponent(row.group)}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
                    >
                      <Icon name="list" style="regular" className="size-3" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ParameterGroupTable;
