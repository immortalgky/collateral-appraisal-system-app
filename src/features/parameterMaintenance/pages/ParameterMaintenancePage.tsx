import { useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import ParameterGroupTable from '../components/ParameterGroupTable';
import { Button, SectionHeader } from '@/shared/components';
import { useParametersQuery } from '@/shared/api/parameters';
import ParameterDetailModal from '../components/ParameterDetailModal';
import type { ParameterFormValues } from '../components/ParameterDetailModal';
import { useCreateParameter } from '../api/parameter';

const BASE_PATH = '/parameter';

const ParameterMaintenancePage = () => {
  const { data: allParameters = [], isLoading } = useParametersQuery();
  const createParameter = useCreateParameter();

  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async (data: ParameterFormValues) => {
    setIsSaving(true);
    try {
      await createParameter.mutateAsync(data);
      toast.success('Parameter created');
      setModalOpen(false);
    } catch (error: any) {
      toast.error(error?.apiError?.detail || 'Failed to create parameter.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title="Parameters"
        subtitle="Manage general system parameters"
        icon="sliders"
        iconColor="rose"
        rightIcon={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            Create Parameter
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        <ParameterGroupTable
          parameters={allParameters}
          basePath={BASE_PATH}
          isLoading={isLoading}
        />
      </div>

      <ParameterDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        isSaving={isSaving}
        groupEditable={true}
      />
    </div>
  );
};

export default ParameterMaintenancePage;
