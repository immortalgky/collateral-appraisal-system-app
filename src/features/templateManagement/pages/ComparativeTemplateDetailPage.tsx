import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import TemplateForm from '../components/TemplateForm';
import TemplateFactorManager from '../components/TemplateFactorManager';
import {
  useGetCompTemplateById,
  useCreateCompTemplate,
  useUpdateCompTemplate,
  useAddFactorToCompTemplate,
  useRemoveFactorFromCompTemplate,
} from '../api/comparativeTemplate';
import { useGetFactors } from '../api/marketComparableFactor';

const ComparativeTemplateDetailPage = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const isEditMode = !!templateId;

  const { data: templateDetail, isLoading: isLoadingTemplate } = useGetCompTemplateById(templateId);
  const { data: allFactors = [] } = useGetFactors();
  const createMutation = useCreateCompTemplate();
  const updateMutation = useUpdateCompTemplate();
  const addFactorMutation = useAddFactorToCompTemplate();
  const removeFactorMutation = useRemoveFactorFromCompTemplate();

  const [form, setForm] = useState({
    templateCode: '',
    templateName: '',
    propertyType: '',
    description: null as string | null,
  });

  useEffect(() => {
    if (templateDetail) {
      setForm({
        templateCode: templateDetail.templateCode,
        templateName: templateDetail.templateName,
        propertyType: templateDetail.propertyType,
        description: templateDetail.description,
      });
    }
  }, [templateDetail]);

  const handleSave = () => {
    if (!form.templateCode || !form.templateName || !form.propertyType) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isEditMode) {
      updateMutation.mutate(
        {
          id: templateId!,
          templateName: form.templateName,
          description: form.description,
          isActive: null,
        },
        {
          onSuccess: () => toast.success('Template updated successfully'),
          onError: () => toast.error('Failed to update template'),
        },
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: (data) => {
          toast.success('Template created successfully');
          navigate(`/comparative-templates/${data.templateId ?? data.id}`, { replace: true });
        },
        onError: () => toast.error('Failed to create template'),
      });
    }
  };

  const handleAddFactors = (selections: { factorId: string; isMandatory: boolean }[]) => {
    if (!templateId) return;
    const baseSequence = (templateDetail?.factors?.length ?? 0) + 1;
    let completed = 0;
    const total = selections.length;
    selections.forEach((sel, i) => {
      addFactorMutation.mutate(
        {
          templateId: templateId!,
          factorId: sel.factorId,
          displaySequence: baseSequence + i,
          isMandatory: sel.isMandatory,
          defaultWeight: null,
        },
        {
          onSuccess: () => {
            completed++;
            if (completed === total) toast.success(`${total} factor(s) added`);
          },
          onError: () => toast.error('Failed to add factor'),
        },
      );
    });
  };

  const handleToggleMandatory = (factorId: string, isMandatory: boolean) => {
    if (!templateId) return;
    const existing = templateDetail?.factors?.find((f) => f.factorId === factorId);
    if (!existing) return;
    removeFactorMutation.mutate(
      { templateId, factorId },
      {
        onSuccess: () => {
          addFactorMutation.mutate(
            {
              templateId: templateId!,
              factorId,
              displaySequence: existing.displaySequence,
              isMandatory,
              defaultWeight: existing.defaultWeight ?? null,
            },
            {
              onSuccess: () => toast.success('Mandatory updated'),
              onError: () => toast.error('Failed to update mandatory'),
            },
          );
        },
        onError: () => toast.error('Failed to update mandatory'),
      },
    );
  };

  const handleRemoveFactor = (factorId: string) => {
    if (!templateId) return;
    removeFactorMutation.mutate(
      { templateId, factorId },
      {
        onSuccess: () => toast.success('Factor removed'),
        onError: () => toast.error('Failed to remove factor'),
      },
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/comparative-templates')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Icon name="chevron-left" style="solid" className="size-5" />
        </button>
        <SectionHeader
          title={isEditMode ? 'Edit Comparative Analysis Template' : 'Create Comparative Analysis Template'}
          subtitle={isEditMode ? templateDetail?.templateCode : 'Fill in the template details'}
          icon="chart-mixed"
          iconColor="orange"
          className="mb-0"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <TemplateForm value={form} onChange={setForm} isEditMode={isEditMode} />

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/comparative-templates')}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSave}>
            {isEditMode ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>

      {isEditMode && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <TemplateFactorManager
            factors={templateDetail?.factors ?? []}
            allFactors={allFactors}
            onAddFactor={handleAddFactors}
            onRemoveFactor={handleRemoveFactor}
            onToggleMandatory={handleToggleMandatory}
            isAdding={addFactorMutation.isPending}
            isRemoving={removeFactorMutation.isPending}
            isUpdating={addFactorMutation.isPending || removeFactorMutation.isPending}
            showDefaultWeight
          />
        </div>
      )}
    </div>
  );
};

export default ComparativeTemplateDetailPage;
