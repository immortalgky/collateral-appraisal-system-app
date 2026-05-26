import { useParams } from 'react-router-dom';
import { Button, Icon, SectionHeader } from '@/shared/components';
import ParameterDetailTable from '../components/ParameterDetailTable';
import { useParametersQuery } from '@/shared/api/parameters';
import { useCreateParameter, useDeleteParameter, useUpdateParameter } from '../api/parameter';
import useBreadcrumb from '@/shared/hooks/useBreadcrumb';
import ParameterDetailModal from '../components/ParameterDetailModal';
import { useState } from 'react';
import toast from 'react-hot-toast';

const ParameterDetailPage = () => {
  const { group } = useParams<{ group: string }>();
  const decodedGroup = decodeURIComponent(group ?? '');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: allParameters = [], isLoading } = useParametersQuery();
  const parameters = allParameters.filter(p => p.group === decodedGroup);
  const updateParameter = useUpdateParameter();
  const deleteParameter = useDeleteParameter();
  const createParameter = useCreateParameter();
  useBreadcrumb(decodedGroup, 'layer-group');

  const handleCreate = async (data: {
    group: string;
    code: string;
    description: string;
    country: string;
    language: string;
    seqNo: number;
    isActive: boolean;
  }) => {
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

  const handleUpdate = async (
    parId: number,
    data: {
      code?: string;
      description?: string;
      country?: string;
      language?: string;
      seqNo?: number;
      isActive?: boolean;
    },
  ) => {
    await updateParameter.mutateAsync({ parId, ...data });
  };

  const handleDelete = async (parId: number) => {
    await deleteParameter.mutateAsync(parId);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title={decodedGroup}
        subtitle={`Manage parameters in the "${decodedGroup}" group`}
        icon="layer-group"
        iconColor="rose"
        rightIcon={
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            Add Parameter
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        <ParameterDetailTable
          group={decodedGroup}
          parameters={parameters}
          isLoading={isLoading}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      </div>
      {/* Create / Edit Modal */}
      <ParameterDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        group={group}
        isSaving={isSaving}
      />
    </div>
  );
};

export default ParameterDetailPage;
