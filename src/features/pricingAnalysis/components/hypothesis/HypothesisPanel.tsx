/**
 * HypothesisPanel — entry point for both HypothesisLandBuilding and HypothesisCondominium methods.
 *
 * Flow:
 *  1. On first open: no analysis exists → show variant picker + Generate button.
 *  2. After Generate: render the appropriate tabbed UI.
 *  3. Save → PUT endpoint.  Reset → DELETE endpoint (confirm dialog).
 *  4. Live preview on input change (~400ms debounce) via POST /preview.
 */
import { useCallback, useRef, useState } from 'react';
import { Icon } from '@/shared/components';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetHypothesisAnalysis,
  useGenerateHypothesisAnalysis,
  useSaveHypothesisAnalysis,
  useResetMethod,
  usePreviewHypothesisAnalysis,
} from '../../api';
import { pricingAnalysisKeys } from '../../api/queryKeys';
import type { HypothesisVariant } from '../../types/hypothesis';
import { LandBuildingTabs } from './landBuilding/LandBuildingTabs';
import { CondominiumTabs } from './condominium/CondominiumTabs';

interface HypothesisPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

// ─── Variant picker shown before Generate ────────────────────────────────────

function VariantPicker({
  onGenerate,
  isGenerating,
}: {
  onGenerate: (variant: HypothesisVariant) => void;
  isGenerating: boolean;
}) {
  const { t } = useTranslation('pricingAnalysis');
  const options: Array<{ value: HypothesisVariant; title: string; subtitle: string }> = [
    {
      value: 'LandBuilding',
      title: t('hypothesis.variants.landBuilding'),
      subtitle: t('hypothesis.variants.landBuildingSubtitle'),
    },
    {
      value: 'Condominium',
      title: t('hypothesis.variants.condominium'),
      subtitle: t('hypothesis.variants.condominiumSubtitle'),
    },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 text-primary">
        <Icon name="calculator" style="solid" className="size-8" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{t('hypothesis.title')}</h3>
        <p className="text-sm text-gray-500">{t('hypothesis.chooseTemplate')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            disabled={isGenerating}
            onClick={() => onGenerate(opt.value)}
            className="flex flex-col items-start gap-1 p-4 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 disabled:opacity-60 transition-colors text-left"
          >
            <span className="text-sm font-semibold text-gray-900">{opt.title}</span>
            <span className="text-xs text-gray-500">{opt.subtitle}</span>
          </button>
        ))}
      </div>
      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Icon name="spinner" className="size-4 animate-spin" />
          {t('hypothesis.generating')}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function HypothesisPanel({
  activeMethod,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: HypothesisPanelProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { pricingAnalysisId, methodId, approachType, methodType } = activeMethod ?? {};
  const queryClient = useQueryClient();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Callbacks passed down to variant tabs
  const onDirtyRef = useRef(onCalculationMethodDirty);
  onDirtyRef.current = onCalculationMethodDirty;

  const generateMutation = useGenerateHypothesisAnalysis();
  const saveMutation = useSaveHypothesisAnalysis();
  const resetMutation = useResetMethod();
  const previewMutation = usePreviewHypothesisAnalysis();

  const { data: savedData, isPending: isLoading } = useGetHypothesisAnalysis(
    pricingAnalysisId,
    methodId,
  );

  // Variant comes from the saved aggregate (set at generate time via template choice).
  const variant: HypothesisVariant | null = savedData?.variant ?? null;

  const hasAnalysis = !!savedData?.hypothesisAnalysisId;

  const handleGenerate = useCallback(
    async (v: HypothesisVariant) => {
      if (!pricingAnalysisId || !methodId) return;
      try {
        await generateMutation.mutateAsync({
          pricingAnalysisId,
          methodId,
          request: { variant: v },
        });
        toast.success(t('hypothesis.toasts.analysisCreated'));
      } catch {
        toast.error(t('hypothesis.toasts.analysisFailed'));
      }
    },
    [pricingAnalysisId, methodId, generateMutation],
  );

  const handleSave = useCallback(
    async (appraisalValue: number) => {
      if (!pricingAnalysisId || !methodId) return;
      if (approachType && methodType) {
        onCalculationSave({
          approachType,
          methodType,
          appraisalValue,
        });
      }
      toast.success(t('hypothesis.toasts.saved'));
    },
    [pricingAnalysisId, methodId, approachType, methodType, onCalculationSave],
  );

  const handleConfirmReset = async () => {
    setIsResetDialogOpen(false);
    if (!pricingAnalysisId || !methodId) return;
    try {
      await resetMutation.mutateAsync({ pricingAnalysisId, methodId });
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.hypothesisAnalysis(pricingAnalysisId, methodId),
      });
      toast.success(t('hypothesis.toasts.analysisReset'));
    } catch {
      toast.error(t('hypothesis.toasts.analysisResetFailed'));
    }
  };

  if (isLoading) {
    return <PanelSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
          <Icon name="calculator" style="solid" className="size-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('hypothesis.title')}</h2>
          {variant && (
            <p className="text-xs text-gray-500">
              {variant === 'LandBuilding'
                ? t('hypothesis.variants.landBuilding')
                : t('hypothesis.variants.condominium')}
            </p>
          )}
        </div>
      </div>

      {!hasAnalysis ? (
        <VariantPicker onGenerate={handleGenerate} isGenerating={generateMutation.isPending} />
      ) : variant === 'LandBuilding' ? (
        <div className="flex-1 min-h-0">
          <LandBuildingTabs
            pricingAnalysisId={pricingAnalysisId!}
            methodId={methodId!}
            savedData={savedData!}
            saveMutation={saveMutation}
            previewMutation={previewMutation}
            onDirty={d => onDirtyRef.current(d)}
            onSaveSuccess={handleSave}
            onReset={() => setIsResetDialogOpen(true)}
            onCancel={onCancelCalculationMethod}
          />
        </div>
      ) : variant === 'Condominium' ? (
        <div className="flex-1 min-h-0">
          <CondominiumTabs
            pricingAnalysisId={pricingAnalysisId!}
            methodId={methodId!}
            savedData={savedData!}
            saveMutation={saveMutation}
            previewMutation={previewMutation}
            onDirty={d => onDirtyRef.current(d)}
            onSaveSuccess={handleSave}
            onReset={() => setIsResetDialogOpen(true)}
            onCancel={onCancelCalculationMethod}
          />
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
        message={t('confirm.resetAnalysis')}
      />
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-lg bg-gray-200" />
        <div className="bg-gray-200 rounded h-5 w-48" />
      </div>
      <div className="rounded-lg border border-gray-200 p-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded h-10" />
        ))}
      </div>
    </div>
  );
}
