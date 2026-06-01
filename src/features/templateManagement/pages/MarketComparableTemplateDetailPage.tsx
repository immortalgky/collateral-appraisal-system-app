import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import TemplateForm from '../components/TemplateForm';
import TemplateFactorManager from '../components/TemplateFactorManager';
import {
  useGetMCTemplateById,
  useCreateMCTemplate,
  useUpdateMCTemplate,
  useAddFactorToMCTemplate,
  useRemoveFactorFromMCTemplate,
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
    const existing = templateDetail?.factors?.find(f => f.factorId === factorId);
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
            },
            {
              onSuccess: () => toast.success(t('toasts.mandatoryUpdated')),
              onError: () => toast.error(t('toasts.mandatoryUpdateFailed')),
            },
          );
        },
        onError: () => toast.error(t('toasts.mandatoryUpdateFailed')),
      },
    );
  };

  const handleRemoveFactor = (factorId: string) => {
    if (!templateId) return;
    removeFactorMutation.mutate(
      { templateId, factorId },
      {
        onSuccess: () => toast.success(t('toasts.factorRemoved')),
        onError: () => toast.error(t('toasts.factorRemoveFailed')),
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
          onClick={() => navigate('/market-comparable-templates')}
          aria-label={t('common:actions.back')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Icon name="chevron-left" style="solid" className="size-5" />
        </button>
        <SectionHeader
          title={isEditMode ? t('templateDetail.mcEditTitle') : t('templateDetail.mcCreateTitle')}
          subtitle={isEditMode ? templateDetail?.templateCode : t('templateDetail.createSubtitle')}
          icon="rectangle-list"
          iconColor="cyan"
          className="mb-0"
        />
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
            isAdding={addFactorMutation.isPending}
            isRemoving={removeFactorMutation.isPending}
            isUpdating={addFactorMutation.isPending || removeFactorMutation.isPending}
          />
        </div>
      )}
    </div>
  );
};

export default MarketComparableTemplateDetailPage;
