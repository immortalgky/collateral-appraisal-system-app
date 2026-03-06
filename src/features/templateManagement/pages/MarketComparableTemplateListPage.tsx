import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import TemplateTable from '../components/TemplateTable';
import { useGetMCTemplates, useDeleteMCTemplate } from '../api/marketComparableTemplate';

const MarketComparableTemplateListPage = () => {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useGetMCTemplates();
  const deleteMutation = useDeleteMCTemplate();

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
        title="Market Comparable Templates"
        subtitle="Manage templates for market survey data collection"
        icon="rectangle-list"
        iconColor="cyan"
        rightIcon={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/market-comparable-templates/new')}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            Create Template
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        <TemplateTable
          templates={templates}
          basePath="/market-comparable-templates"
          onDelete={handleDelete}
          isLoading={isLoading}
          isDeleting={deleteMutation.isPending}
        />
      </div>
    </div>
  );
};

export default MarketComparableTemplateListPage;
