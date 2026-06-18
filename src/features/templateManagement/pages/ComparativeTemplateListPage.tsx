import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import TemplateTable from '../components/TemplateTable';
import {
  useDeleteComparativeAnalysisTemplate,
  useGetComparativeAnalysisTemplates,
} from '../api/comparativeTemplate';

const ComparativeTemplateListPage = () => {
  const { t } = useTranslation('templateManagement');
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useGetComparativeAnalysisTemplates();
  const deleteMutation = useDeleteComparativeAnalysisTemplate();

  const handleDelete = (id: string) => {
    if (!confirm(t('confirm.deleteTemplate'))) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(t('toasts.templateDeleted')),
      onError: () => toast.error(t('toasts.templateDeleteFailed')),
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title={t('templates.compPageTitle')}
        subtitle={t('templates.compPageSubtitle')}
        icon="chart-mixed"
        iconColor="orange"
        rightIcon={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/comparative-templates/new')}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            {t('templates.createButton')}
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        <TemplateTable
          templates={templates}
          basePath="/comparative-templates"
          onDelete={handleDelete}
          isLoading={isLoading}
          isDeleting={deleteMutation.isPending}
        />
      </div>
    </div>
  );
};

export default ComparativeTemplateListPage;
