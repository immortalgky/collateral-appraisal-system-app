import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useGetComparativeAnalysisTemplates();
  const deleteMutation = useDeleteComparativeAnalysisTemplate();

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Template deleted successfully'),
      onError: () => toast.error('Failed to delete template'),
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title="Comparative Analysis Templates"
        subtitle="Manage templates for pricing calculation methods (DC/SAG/WQS)"
        icon="chart-mixed"
        iconColor="orange"
        rightIcon={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/comparative-templates/new')}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            Create Template
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
