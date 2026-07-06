import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';

export type TemplateStatusFilter = 'all' | 'active' | 'inactive';

interface TemplateRowLike {
  templateCode: string;
  templateName: string;
  isActive: boolean;
}

/** Client-side search + status filtering shared by the template list pages. */
export const filterTemplates = <T extends TemplateRowLike>(
  templates: T[],
  search: string,
  statusFilter: TemplateStatusFilter,
): T[] =>
  templates.filter(tpl => {
    if (statusFilter === 'active' && !tpl.isActive) return false;
    if (statusFilter === 'inactive' && tpl.isActive) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      tpl.templateCode.toLowerCase().includes(q) || tpl.templateName.toLowerCase().includes(q)
    );
  });

interface TemplateListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TemplateStatusFilter;
  onStatusFilterChange: (value: TemplateStatusFilter) => void;
}

const TemplateListToolbar = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: TemplateListToolbarProps) => {
  const { t } = useTranslation(['templateManagement', 'common']);

  const filterLabels: Record<TemplateStatusFilter, string> = {
    all: t('factors.filterAll'),
    active: t('factors.filterActive'),
    inactive: t('factors.filterInactive'),
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-64">
        <Icon
          name="magnifying-glass"
          style="regular"
          className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t('templates.searchPlaceholder')}
          aria-label={t('templates.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-sm">
        {(['all', 'active', 'inactive'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onStatusFilterChange(s)}
            className={clsx(
              'px-3 py-2 transition-colors',
              statusFilter === s
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-500 hover:bg-gray-50',
            )}
          >
            {filterLabels[s]}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateListToolbar;
