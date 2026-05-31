import { useParams } from 'react-router-dom';
import { Button, Icon, SectionHeader } from '@/shared/components';
import ParameterDetailTable from '../components/ParameterDetailTable';
import { useParametersQuery } from '@/shared/api/parameters';
import { useCreateParameter, useDeleteParameter, useUpdateParameter } from '../api/parameter';
import useBreadcrumb from '@/shared/hooks/useBreadcrumb';
import ParameterDetailModal from '../components/ParameterDetailModal';
import type { ParameterFormValues } from '../components/ParameterDetailModal';
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

  const handleCreate = async (data: ParameterFormValues) => {
    setIsSaving(true);
    try {
      await createParameter.mutateAsync({
        group: data.group,
        code: data.code,
        descriptionTh: data.descriptionTh,
        descriptionEn: data.descriptionEn,
        country: data.country,
        seqNo: data.seqNo,
        isActive: data.isActive,
      });
      toast.success('Parameter created');
      setModalOpen(false);
    } catch (error: any) {
      toast.error(error?.apiError?.detail || 'Failed to create parameter.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (params: {
    parIdTh: number;
    parIdEn: number;
    code: string;
    descriptionTh: string;
    descriptionEn: string;
    country: string;
    seqNo: number;
    isActive: boolean;
  }) => {
    await updateParameter.mutateAsync(params);
  };

  const handleDelete = async (params: { parIdTh: number; parIdEn: number }) => {
    await deleteParameter.mutateAsync(params);
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

      {/* Create Modal */}
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
