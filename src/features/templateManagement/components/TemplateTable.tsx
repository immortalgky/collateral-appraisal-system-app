import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Pagination from '@shared/components/Pagination';
import { useParametersByGroup } from '@shared/utils/parameterUtils';
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

type SortKey = 'templateCode' | 'templateName' | 'propertyType' | 'factorCount';

interface TemplateTableProps {
  templates: TemplateRow[];
  basePath: string;
  onDelete?: (id: string) => void;
  onToggleStatus?: (template: TemplateRow) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  isTogglingStatus?: boolean;
  /** Fill the parent's height and pin the pagination bar to the bottom (task-list style). */
  fillHeight?: boolean;
}

const TemplateTable = ({
  templates,
  basePath,
  onDelete,
  onToggleStatus,
  isLoading,
  isDeleting,
  isTogglingStatus,
  fillHeight,
}: TemplateTableProps) => {
  const { t } = useTranslation(['templateManagement', 'common']);
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const propertyTypeParams = useParametersByGroup('PropertyType');
  const propertyTypeLabels = new Map(propertyTypeParams.map(p => [p.code, p.description]));

  const propertyTypeLabel = (code: string) => propertyTypeLabels.get(code) ?? code;

  // Reset to the first page whenever the data set or sort changes.
  useEffect(() => {
    setPage(0);
  }, [templates, pageSize, sortKey, sortDir]);

  // Three-stage cycle matching the task-list standard: unsorted -> asc -> desc -> unsorted.
  const handleSort = (key: SortKey) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Unsorted preserves the incoming order (create date ascending from the API).
  const sorted =
    sortKey == null
      ? templates
      : [...templates].sort((a, b) => {
          let cmp: number;
          if (sortKey === 'factorCount') {
            cmp = (a.factorCount ?? 0) - (b.factorCount ?? 0);
          } else if (sortKey === 'propertyType') {
            cmp = propertyTypeLabel(a.propertyType).localeCompare(propertyTypeLabel(b.propertyType));
          } else {
            cmp = a[sortKey].localeCompare(b[sortKey]);
          }
          return sortDir === 'asc' ? cmp : -cmp;
        });

  const totalPages = Math.ceil(sorted.length / pageSize);
  // Clamp against a shrunk data set so a stale page index can't render an empty page
  // (the reset effect fires post-render; this closes the one-frame gap).
  const currentPage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0;
  const paged = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const sortableHeader = (
    key: SortKey,
    label: string,
    align: 'left' | 'center',
    widthClass?: string,
  ) => {
    const isActive = sortKey === key;
    return (
      <th
        className={clsx(
          'px-4 py-3 text-xs font-semibold text-gray-500',
          align === 'center' ? 'text-center' : 'text-left',
          widthClass,
        )}
        aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() => handleSort(key)}
          className={clsx(
            'group inline-flex items-center gap-1 select-none transition-colors hover:text-gray-700',
            align === 'center' && 'justify-center',
          )}
        >
          <span>{label}</span>
          <Icon
            style="solid"
            name={isActive ? (sortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}
            className={clsx(
              'size-2.5',
              isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-500',
            )}
          />
        </button>
      </th>
    );
  };

  return (
    <div className={clsx(fillHeight && 'flex flex-col h-full min-h-0')}>
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Icon
            name="rectangle-list"
            style="regular"
            className="size-8 mx-auto mb-2 text-gray-300"
          />
          <p className="text-sm">{t('templates.empty')}</p>
        </div>
      ) : (
        <div className={clsx('overflow-x-auto', fillHeight && 'flex-1 min-h-0 overflow-y-auto')}>
          <table className="w-full text-sm">
            <thead className={clsx(fillHeight && 'sticky top-0 z-10 bg-gray-50')}>
              <tr className="border-b border-gray-100 bg-gray-50">
                {sortableHeader('templateCode', t('templates.columns.code'), 'left', 'w-36')}
                {sortableHeader('templateName', t('templates.columns.name'), 'left')}
                {sortableHeader('propertyType', t('templates.columns.propertyType'), 'left', 'w-72')}
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">
                  {t('templates.columns.description')}
                </th>
                {sortableHeader('factorCount', t('templates.columns.factors'), 'center', 'w-28')}
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center w-24">
                  {t('templates.columns.status')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center w-28">
                  {t('templates.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map(template => (
                <tr
                  key={template.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`${basePath}/${template.id}`)}
                >
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-800">{template.templateCode}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">{template.templateName}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {propertyTypeLabels.get(template.propertyType) ?? template.propertyType}
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
                      {template.isActive
                        ? t('templates.status.active')
                        : t('templates.status.inactive')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div
                      className="flex items-center justify-center gap-1"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`${basePath}/${template.id}`)}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        title={t('common:actions.edit')}
                        aria-label={t('common:actions.edit')}
                      >
                        <Icon name="pen" style="regular" className="size-4" />
                      </button>
                      {onToggleStatus && (
                        <button
                          type="button"
                          onClick={() => onToggleStatus(template)}
                          disabled={isTogglingStatus}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={
                            template.isActive
                              ? t('common:actions.deactivate')
                              : t('common:actions.activate')
                          }
                          aria-label={
                            template.isActive
                              ? t('common:actions.deactivate')
                              : t('common:actions.activate')
                          }
                        >
                          <Icon
                            name={template.isActive ? 'toggle-on' : 'toggle-off'}
                            style="regular"
                            className="size-4"
                          />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(template.id)}
                          disabled={isDeleting}
                          className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={t('common:actions.delete')}
                          aria-label={t('common:actions.delete')}
                        >
                          <Icon name="trash" style="regular" className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={sorted.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
};

export default TemplateTable;
