import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import TemplateTable from '../components/TemplateTable';
import TemplateListToolbar, {
  filterTemplates,
  type TemplateStatusFilter,
} from '../components/TemplateListToolbar';
import {
  useGetMCTemplates,
  useDeleteMCTemplate,
  useToggleMCTemplateStatus,
} from '../api/marketComparableTemplate';

const MarketComparableTemplateListPage = () => {
  const { t } = useTranslation(['templateManagement', 'common']);
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useGetMCTemplates();
  const deleteMutation = useDeleteMCTemplate();
  const toggleStatus = useToggleMCTemplateStatus();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TemplateStatusFilter>('all');

  const filtered = useMemo(
    () => filterTemplates(templates, search, statusFilter),
    [templates, search, statusFilter],
  );

  const handleToggleStatus = (template: { id: string; isActive: boolean }) => {
    toggleStatus.mutate(
      { id: template.id, isActive: !template.isActive },
      {
        onSuccess: () => toast.success(t('toasts.statusUpdated')),
        onError: () => toast.error(t('toasts.statusUpdateFailed')),
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success(t('toasts.templateDeleted'));
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error(t('toasts.templateDeleteFailed'));
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('templates.mcPageTitle')}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {templates.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('templates.mcPageSubtitle')}</p>
        </div>
        <Button size="sm" onClick={() => navigate('/market-comparable-templates/new')}>
          <Icon style="solid" name="plus" className="size-3.5 mr-1.5" />
          {t('templates.createButton')}
        </Button>
      </div>

      <TemplateListToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <TemplateTable
          templates={filtered}
          basePath="/market-comparable-templates"
          onDelete={setDeleteTarget}
          onToggleStatus={handleToggleStatus}
          isTogglingStatus={toggleStatus.isPending}
          isLoading={isLoading}
          isDeleting={deleteMutation.isPending}
          fillHeight
        />
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('confirm.deleteTemplateTitle')}
        message={t('confirm.deleteTemplate')}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default MarketComparableTemplateListPage;
