import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';

interface TemplateRow {
  id: string;
  templateCode: string;
  templateName: string;
  propertyType: string;
  description: string | null;
  isActive: boolean;
  factorCount?: number;
}

interface TemplateTableProps {
  templates: TemplateRow[];
  basePath: string;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
}

const TemplateTable = ({
  templates,
  basePath,
  onDelete,
  isLoading,
  isDeleting,
}: TemplateTableProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const filtered = templates.filter((t) => {
    if (statusFilter === 'active' && !t.isActive) return false;
    if (statusFilter === 'inactive' && t.isActive) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.templateCode.toLowerCase().includes(q) ||
      t.templateName.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="relative flex-1 max-w-sm">
          <Icon name="magnifying-glass" style="regular" className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-3 py-2 capitalize transition-colors',
                statusFilter === s
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-500 hover:bg-gray-50',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length !== templates.length && (
        <div className="px-4 pb-2">
          <span className="text-xs text-gray-400">
            Showing {filtered.length} of {templates.length} template(s)
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Icon name="rectangle-list" style="regular" className="size-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No templates found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-primary/10">
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left first:rounded-tl-lg w-36">
                  Code
                </th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Name</th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left w-36">
                  Property Type
                </th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Description</th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center w-28">Factors</th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center w-24">Status</th>
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center last:rounded-tr-lg w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(template => (
                <tr
                  key={template.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`${basePath}/${template.id}`)}
                >
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono font-medium text-gray-800">{template.templateCode}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                    {template.templateName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {template.propertyType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 max-w-xs truncate">
                    {template.description || <span className="text-gray-300">-</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {template.factorCount != null ? (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        <Icon name="layer-group" style="regular" className="size-3 text-gray-400" />
                        {template.factorCount}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        template.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div
                      className="flex items-center justify-center gap-1"
                      onClick={e => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => navigate(`${basePath}/${template.id}`)}
                        leftIcon={<Icon name="pen-to-square" style="regular" className="size-3.5" />}
                      >
                        Edit
                      </Button>
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={isDeleting}
                          onClick={() => onDelete(template.id)}
                          leftIcon={
                            <Icon name="trash-can" style="regular" className="size-3.5 text-danger" />
                          }
                        />
                      )}
                    </div>
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

export default TemplateTable;
