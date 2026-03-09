import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import TemplateForm from '../components/TemplateForm';
import TemplateFactorManager from '../components/TemplateFactorManager';
import type { TemplateFactor } from '../components/TemplateFactorManager';
import {
  useAddFactorToComparativeAnalysisTemplate,
  useCreateComparativeAnalysisTemplate,
  useGetComparativeAnalysisTemplateById,
  useRemoveFactorFromComparativeAnalysisTemplate,
  useUpdateComparativeAnalysisTemplate,
} from '../api/comparativeTemplate';
import { templateMgmtKeys } from '../api/queryKeys';
import { useGetFactors } from '../api/marketComparableFactor';
import type { TemplateDtoType, GetComparativeAnalysisTemplateByIdResponseType } from '@/shared/schemas/v1';
import axios from '@shared/api/axiosInstance';

const ComparativeTemplateDetailPage = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!templateId;

  const { data: templateDetail, isLoading: isLoadingTemplate } =
    useGetComparativeAnalysisTemplateById(templateId);
  const { data: allFactors = [] } = useGetFactors();
  const createMutation = useCreateComparativeAnalysisTemplate();
  const updateMutation = useUpdateComparativeAnalysisTemplate();
  const addFactorMutation = useAddFactorToComparativeAnalysisTemplate();
  const removeFactorMutation = useRemoveFactorFromComparativeAnalysisTemplate();

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
        onSuccess: async data => {
          toast.success('Template created successfully');
          const id = data.templateId;
          const isEmptyGuid = !id || id === '00000000-0000-0000-0000-000000000000';
          if (isEmptyGuid) {
            const { data: listData } = await axios.get('/comparative-analysis-templates');
            const templates: TemplateDtoType[] = listData.templates ?? [];
            const match = templates.find(t => t.templateCode === form.templateCode);
            navigate(`/comparative-templates/${match?.id ?? ''}`, { replace: true });
          } else {
            navigate(`/comparative-templates/${id}`, { replace: true });
          }
        },
        onError: () => toast.error('Failed to create template'),
      });
    }
  };

  const handleAddFactors = (selections: { factorId: string; isMandatory: boolean; isCalculationFactor: boolean }[]) => {
    if (!templateId) return;
    const baseSequence = (templateDetail?.comparativeFactors?.length ?? 0) + 1;
    let completed = 0;
    const total = selections.length;
    selections.forEach((sel, i) => {
      addFactorMutation.mutate(
        {
          templateId: templateId!,
          factorId: sel.factorId,
          displaySequence: baseSequence + i,
          isMandatory: sel.isMandatory,
          isCalculationFactor: sel.isCalculationFactor,
          defaultWeight: null,
          defaultIntensity: null,
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
    const existing = templateDetail?.comparativeFactors?.find(f => f.factorId === factorId);
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
              isCalculationFactor: existing.isCalculationFactor,
              defaultWeight: existing.defaultWeight ?? null,
              defaultIntensity: existing.defaultIntensity ?? null,
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

  const handleToggleCalculation = (factorId: string, isCalculationFactor: boolean) => {
    if (!templateId) return;
    const existing = templateDetail?.comparativeFactors?.find(f => f.factorId === factorId);
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
              isMandatory: existing.isMandatory,
              isCalculationFactor,
              defaultWeight: existing.defaultWeight ?? null,
              defaultIntensity: existing.defaultIntensity ?? null,
            },
            {
              onSuccess: () => toast.success('Calculation factor updated'),
              onError: () => toast.error('Failed to update calculation factor'),
            },
          );
        },
        onError: () => toast.error('Failed to update calculation factor'),
      },
    );
  };

  const handleUpdateDefaults = (factorId: string, defaultWeight: number | null, defaultIntensity: number | null) => {
    if (!templateId) return;
    const existing = templateDetail?.comparativeFactors?.find(f => f.factorId === factorId);
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
              isMandatory: existing.isMandatory,
              isCalculationFactor: existing.isCalculationFactor,
              defaultWeight,
              defaultIntensity,
            },
            {
              onSuccess: () => toast.success('Default values updated'),
              onError: () => toast.error('Failed to update default values'),
            },
          );
        },
        onError: () => toast.error('Failed to update default values'),
      },
    );
  };

  const handleReorder = (reorderedFactors: TemplateFactor[]) => {
    if (!templateId) return;
    queryClient.setQueryData<GetComparativeAnalysisTemplateByIdResponseType>(
      templateMgmtKeys.compTemplateDetail(templateId),
      (old) => {
        if (!old) return old;
        return {
          ...old,
          comparativeFactors: reorderedFactors.map((f) => {
            const original = old.comparativeFactors.find((o) => o.factorId === f.factorId);
            return original ? { ...original, displaySequence: f.displaySequence } : original!;
          }),
        };
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
          title={
            isEditMode
              ? 'Edit Comparative Analysis Template'
              : 'Create Comparative Analysis Template'
          }
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
            factors={templateDetail?.comparativeFactors ?? []}
            allFactors={allFactors}
            onAddFactor={handleAddFactors}
            onRemoveFactor={handleRemoveFactor}
            onToggleMandatory={handleToggleMandatory}
            onToggleCalculation={handleToggleCalculation}
            onUpdateDefaults={handleUpdateDefaults}
            onReorder={handleReorder}
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
