import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Switch from '@shared/components/inputs/Switch';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import TemplateForm from '../components/TemplateForm';
import TemplateFactorManager, { type TemplateFactor } from '../components/TemplateFactorManager';
import {
  useGetMCTemplateById,
  useCreateMCTemplate,
  useUpdateMCTemplate,
  useAddFactorToMCTemplate,
  useRemoveFactorFromMCTemplate,
  useReorderMCTemplateFactors,
  useToggleMCTemplateStatus,
  useSetMCTemplateFactorMandatory,
} from '../api/marketComparableTemplate';
import { useGetFactors } from '../api/marketComparableFactor';

const MarketComparableTemplateDetailPage = () => {
  const { t } = useTranslation(['templateManagement', 'common']);
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const isEditMode = !!templateId;

  const { data: templateDetail, isLoading: isLoadingTemplate } = useGetMCTemplateById(templateId);
  const { data: allFactors = [] } = useGetFactors();
  const createMutation = useCreateMCTemplate();
  const updateMutation = useUpdateMCTemplate();
  const addFactorMutation = useAddFactorToMCTemplate();
  const removeFactorMutation = useRemoveFactorFromMCTemplate();
  const reorderMutation = useReorderMCTemplateFactors();
  const toggleStatus = useToggleMCTemplateStatus();
  const setMandatoryMutation = useSetMCTemplateFactorMandatory();

  const [form, setForm] = useState({
    templateCode: '',
    templateName: '',
    propertyType: '',
    description: null as string | null,
  });
  const [deletingFactorId, setDeletingFactorId] = useState<string | null>(null);

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
        { id: templateId!, ...form },
        {
          onSuccess: () => toast.success(t('toasts.templateUpdated')),
          onError: () => toast.error(t('toasts.templateUpdateFailed')),
        },
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: data => {
          toast.success(t('toasts.templateCreated'));
          navigate(`/market-comparable-templates/${data.id}`, { replace: true });
        },
        onError: () => toast.error(t('toasts.templateCreateFailed')),
      });
    }
  };

  const handleAddFactors = (
    selections: { factorId: string; isMandatory: boolean; isCalculationFactor: boolean }[],
  ) => {
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
    setMandatoryMutation.mutate(
      { templateId, factorId, isMandatory },
      {
        onSuccess: () => toast.success(t('toasts.mandatoryUpdated')),
        onError: () => toast.error(t('toasts.mandatoryUpdateFailed')),
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

  const handleReorder = (reorderedFactors: TemplateFactor[]) => {
    if (!templateId) return;
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

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/market-comparable-templates')}
          aria-label={t('common:actions.back')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Icon name="chevron-left" style="solid" className="size-5" />
        </button>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {isEditMode ? t('templateDetail.mcEditTitle') : t('templateDetail.mcCreateTitle')}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/market-comparable-templates')}
          >
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
            factors={templateDetail?.factors ?? []}
            allFactors={allFactors}
            onAddFactor={handleAddFactors}
            onRemoveFactor={handleRemoveFactor}
            onToggleMandatory={handleToggleMandatory}
            onReorder={handleReorder}
            showCalculation={false}
            isAdding={addFactorMutation.isPending}
            isRemoving={removeFactorMutation.isPending}
            isUpdating={setMandatoryMutation.isPending}
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

export default MarketComparableTemplateDetailPage;
