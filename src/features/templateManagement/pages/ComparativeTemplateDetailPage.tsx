import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Switch from '@shared/components/inputs/Switch';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import TemplateForm from '../components/TemplateForm';
import TemplateFactorManager from '../components/TemplateFactorManager';
import type { TemplateFactor } from '../components/TemplateFactorManager';
import {
  useAddFactorToComparativeAnalysisTemplate,
  useCreateComparativeAnalysisTemplate,
  useGetComparativeAnalysisTemplateById,
  useRemoveFactorFromComparativeAnalysisTemplate,
  useReorderComparativeAnalysisTemplateFactors,
  useToggleComparativeAnalysisTemplateStatus,
  useUpdateComparativeAnalysisTemplate,
  useUpdateFactorInComparativeAnalysisTemplate,
} from '../api/comparativeTemplate';
import { templateMgmtKeys } from '../api/queryKeys';
import { useGetFactors } from '../api/marketComparableFactor';
import type {
  TemplateDtoType,
  GetComparativeAnalysisTemplateByIdResponseType,
} from '@/shared/schemas/v1';
import axios from '@shared/api/axiosInstance';

const ComparativeTemplateDetailPage = () => {
  const { t } = useTranslation(['templateManagement', 'common']);
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
  const updateFactorMutation = useUpdateFactorInComparativeAnalysisTemplate();
  const reorderMutation = useReorderComparativeAnalysisTemplateFactors();
  const toggleStatus = useToggleComparativeAnalysisTemplateStatus();
  const [deletingFactorId, setDeletingFactorId] = useState<string | null>(null);

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
      toast.error(t('templateForm.validation.requiredFields'));
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
          onSuccess: () => toast.success(t('toasts.templateUpdated')),
          onError: () => toast.error(t('toasts.templateUpdateFailed')),
        },
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: async data => {
          toast.success(t('toasts.templateCreated'));
          const id = data.templateId;
          const isEmptyGuid = !id || id === '00000000-0000-0000-0000-000000000000';
          if (isEmptyGuid) {
            const { data: listData } = await axios.get('/comparative-analysis-templates');
            const templates: TemplateDtoType[] = listData.templates ?? [];
            const match = templates.find(tpl => tpl.templateCode === form.templateCode);
            navigate(`/comparative-templates/${match?.id ?? ''}`, { replace: true });
          } else {
            navigate(`/comparative-templates/${id}`, { replace: true });
          }
        },
        onError: () => toast.error(t('toasts.templateCreateFailed')),
      });
    }
  };

  const handleToggleStatus = (isActive: boolean) => {
    if (!templateId) return;
    toggleStatus.mutate(
      { id: templateId, isActive },
      {
        onSuccess: () => toast.success(t('toasts.statusUpdated')),
        onError: () => toast.error(t('toasts.statusUpdateFailed')),
      },
    );
  };

  const handleAddFactors = (
    selections: { factorId: string; isMandatory: boolean; isCalculationFactor: boolean }[],
  ) => {
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
            if (completed === total) toast.success(t('toasts.factorsAdded', { n: total }));
          },
          onError: () => toast.error(t('toasts.factorAddFailed')),
        },
      );
    });
  };

  const handleToggleMandatory = (factorId: string, isMandatory: boolean) => {
    if (!templateId) return;
    const existing = templateDetail?.comparativeFactors?.find(f => f.factorId === factorId);
    if (!existing) return;
    updateFactorMutation.mutate(
      {
        templateId,
        factorId,
        isMandatory,
        isCalculationFactor: existing.isCalculationFactor,
        defaultWeight: existing.defaultWeight ?? null,
        defaultIntensity: existing.defaultIntensity ?? null,
      },
      {
        onSuccess: () => toast.success(t('toasts.mandatoryUpdated')),
        onError: () => toast.error(t('toasts.mandatoryUpdateFailed')),
      },
    );
  };

  const handleToggleCalculation = (factorId: string, isCalculationFactor: boolean) => {
    if (!templateId) return;
    const existing = templateDetail?.comparativeFactors?.find(f => f.factorId === factorId);
    if (!existing) return;
    updateFactorMutation.mutate(
      {
        templateId,
        factorId,
        isMandatory: existing.isMandatory,
        isCalculationFactor,
        defaultWeight: existing.defaultWeight ?? null,
        defaultIntensity: existing.defaultIntensity ?? null,
      },
      {
        onSuccess: () => toast.success(t('toasts.calculationUpdated')),
        onError: () => toast.error(t('toasts.calculationUpdateFailed')),
      },
    );
  };

  const handleUpdateDefaults = (
    factorId: string,
    defaultWeight: number | null,
    defaultIntensity: number | null,
  ) => {
    if (!templateId) return;
    const existing = templateDetail?.comparativeFactors?.find(f => f.factorId === factorId);
    if (!existing) return;
    updateFactorMutation.mutate(
      {
        templateId,
        factorId,
        isMandatory: existing.isMandatory,
        isCalculationFactor: existing.isCalculationFactor,
        defaultWeight,
        defaultIntensity,
      },
      {
        onSuccess: () => toast.success(t('toasts.defaultValuesUpdated')),
        onError: () => toast.error(t('toasts.defaultValuesUpdateFailed')),
      },
    );
  };

  const handleReorder = (reorderedFactors: TemplateFactor[]) => {
    if (!templateId) return;

    // Optimistically reflect the new order in the cached detail for instant feedback.
    queryClient.setQueryData<GetComparativeAnalysisTemplateByIdResponseType>(
      templateMgmtKeys.compTemplateDetail(templateId),
      old => {
        if (!old) return old;
        return {
          ...old,
          comparativeFactors: reorderedFactors.map(f => {
            const original = old.comparativeFactors.find(o => o.factorId === f.factorId);
            return original ? { ...original, displaySequence: f.displaySequence } : original!;
          }),
        };
      },
    );

    // Persist the new order; onSuccess invalidation reconciles with the server.
    reorderMutation.mutate(
      {
        templateId,
        factors: reorderedFactors.map(f => ({
          factorId: f.factorId,
          displaySequence: f.displaySequence,
        })),
      },
      {
        onSuccess: () => toast.success(t('toasts.factorsReordered')),
        onError: () => toast.error(t('toasts.reorderFailed')),
      },
    );
  };

  const handleRemoveFactor = (factorId: string) => {
    setDeletingFactorId(factorId);
  };

  const handleConfirmRemoveFactor = () => {
    if (!templateId || !deletingFactorId) return;
    removeFactorMutation.mutate(
      { templateId, factorId: deletingFactorId },
      {
        onSuccess: () => {
          toast.success(t('toasts.factorRemoved'));
          setDeletingFactorId(null);
        },
        onError: () => {
          toast.error(t('toasts.factorRemoveFailed'));
          setDeletingFactorId(null);
        },
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/comparative-templates')}
          aria-label={t('common:actions.back')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Icon name="chevron-left" style="solid" className="size-5" />
        </button>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {isEditMode ? t('templateDetail.compEditTitle') : t('templateDetail.compCreateTitle')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isEditMode ? templateDetail?.templateCode : t('templateDetail.createSubtitle')}
          </p>
        </div>
        {isEditMode && templateDetail && (
          <Switch
            checked={templateDetail.isActive}
            onChange={handleToggleStatus}
            label={
              templateDetail.isActive
                ? t('templates.status.active')
                : t('templates.status.inactive')
            }
            size="sm"
            variant="status"
            disabled={toggleStatus.isPending}
            className="ml-auto shrink-0"
          />
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <TemplateForm value={form} onChange={setForm} isEditMode={isEditMode} />

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/comparative-templates')}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSave}>
            {isEditMode ? t('common:actions.save') : t('common:actions.create')}
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
            isUpdating={updateFactorMutation.isPending}
            showDefaultWeight
            showMandatory={false}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingFactorId}
        onClose={() => setDeletingFactorId(null)}
        onConfirm={handleConfirmRemoveFactor}
        title={t('confirm.deleteFactorTitle')}
        message={t('confirm.deleteFactor')}
        confirmText={t('common:actions.remove')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
        isLoading={removeFactorMutation.isPending}
      />
    </div>
  );
};

export default ComparativeTemplateDetailPage;
