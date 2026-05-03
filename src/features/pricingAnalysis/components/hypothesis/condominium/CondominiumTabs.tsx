import { useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@/shared/components';
import { MethodFooterActions } from '../../MethodFooterActions';
import { FormProvider } from '@/shared/components/form/FormProvider';
import {
  CondominiumFormSchema,
  condominiumFormDefaults,
  type CondominiumFormValues,
} from '../../../schemas/hypothesisForm';
import type {
  GetHypothesisAnalysisResult,
  CondominiumSummaryDto,
  SaveHypothesisAnalysisRequest,
  SaveHypothesisAnalysisResult,
  PreviewHypothesisAnalysisRequest,
  PreviewHypothesisAnalysisResult,
} from '../../../types/hypothesis';
import { CondoUnitDetailsTab } from './CondoUnitDetailsTab';
import { CondominiumSummaryTab } from './CondominiumSummaryTab';
import type { UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';

type CondoTabId = 'unitDetails' | 'summary';

const TABS = [
  { id: 'unitDetails' as const, label: 'Unit Details', icon: 'table' },
  { id: 'summary' as const, label: 'Summary', icon: 'chart-bar' },
];

function mapSavedToFormValues(savedData: GetHypothesisAnalysisResult): CondominiumFormValues {
  const s = savedData.condominiumSummary;
  return {
    summary: {
      areaTitleDeed: s?.areaTitleDeed ?? null,
      far: s?.far ?? null,
      totalBuildingArea: s?.totalBuildingArea ?? null,
      estSalesDurationMonths: s?.estSalesDurationMonths ?? null,
      condoBuildingCostPerSqM: s?.condoBuildingCostPerSqM ?? null,
      setAvgRoomSizeUnits: s?.setAvgRoomSizeUnits ?? null,
      furniturePerUnit: s?.furniturePerUnit ?? null,
      externalUtilities: s?.externalUtilities ?? null,
      // FSD soft defaults applied on rehydration so legacy analyses (saved before
      // the defaults existed) pick them up on next load.
      hardCostContingencyPercent: s?.hardCostContingencyPercent ?? 3,
      estConstructionPeriodMonths: s?.estConstructionPeriodMonths ?? null,
      professionalFeePerMonth: s?.professionalFeePerMonth ?? null,
      adminCostPerMonth: s?.adminCostPerMonth ?? null,
      sellingAdvPercent: s?.sellingAdvPercent ?? 3,
      titleDeedFee: s?.titleDeedFee ?? null,
      eiaCost: s?.eiaCost ?? null,
      condoRegistrationFee: s?.condoRegistrationFee ?? null,
      otherExpensesPercent: s?.otherExpensesPercent ?? 3,
      transferFeePercent: s?.transferFeePercent ?? 1,
      specificBizTaxPercent: s?.specificBizTaxPercent ?? 3.3,
      riskProfitPercent: s?.riskProfitPercent ?? 30,
      discountRate: s?.discountRate ?? null,
      remark: s?.remark ?? null,
    },
    remark: savedData.remark ?? null,
  };
}

interface CondominiumTabsProps {
  pricingAnalysisId: string;
  methodId: string;
  savedData: GetHypothesisAnalysisResult;
  saveMutation: UseMutationResult<
    SaveHypothesisAnalysisResult,
    Error,
    { pricingAnalysisId: string; methodId: string; request: SaveHypothesisAnalysisRequest }
  >;
  previewMutation: UseMutationResult<
    PreviewHypothesisAnalysisResult,
    Error,
    { pricingAnalysisId: string; methodId: string; request: PreviewHypothesisAnalysisRequest }
  >;
  onDirty: (dirty: boolean) => void;
  onSaveSuccess: (appraisalValue: number) => void;
  onReset: () => void;
  onCancel: () => void;
}

export function CondominiumTabs({
  pricingAnalysisId,
  methodId,
  savedData,
  saveMutation,
  previewMutation,
  onDirty,
  onSaveSuccess,
  onReset,
  onCancel,
}: CondominiumTabsProps) {
  const [activeTab, setActiveTab] = useState<CondoTabId>('unitDetails');
  const [previewSummary, setPreviewSummary] = useState<CondominiumSummaryDto | null>(null);
  const [previewTotalLandAreaFromTitles, setPreviewTotalLandAreaFromTitles] = useState<number | null>(null);

  const isInitialized = useRef(false);

  const methods = useForm<CondominiumFormValues>({
    resolver: zodResolver(CondominiumFormSchema),
    defaultValues: condominiumFormDefaults,
    shouldUnregister: false,
  });

  const {
    handleSubmit,
    formState: { isDirty },
    getValues,
    reset,
    watch,
  } = methods;

  useEffect(() => {
    onDirty(isDirty);
  }, [isDirty, onDirty]);

  // ─── Debounced preview ────────────────────────────────────────────────────

  const watchedFields = watch(['summary']);
  const prevWatchKey = useRef<string | null>(null);

  const runPreview = useCallback(() => {
    const values = getValues();
    const request: PreviewHypothesisAnalysisRequest = {
      condominiumSummary: {
        areaTitleDeed: values.summary.areaTitleDeed,
        far: values.summary.far,
        totalBuildingArea: values.summary.totalBuildingArea,
        estSalesDurationMonths: values.summary.estSalesDurationMonths,
        condoBuildingCostPerSqM: values.summary.condoBuildingCostPerSqM,
        setAvgRoomSizeUnits: values.summary.setAvgRoomSizeUnits,
        furniturePerUnit: values.summary.furniturePerUnit,
        externalUtilities: values.summary.externalUtilities,
        hardCostContingencyPercent: values.summary.hardCostContingencyPercent,
        estConstructionPeriodMonths: values.summary.estConstructionPeriodMonths,
        professionalFeePerMonth: values.summary.professionalFeePerMonth,
        adminCostPerMonth: values.summary.adminCostPerMonth,
        sellingAdvPercent: values.summary.sellingAdvPercent,
        titleDeedFee: values.summary.titleDeedFee,
        eiaCost: values.summary.eiaCost,
        condoRegistrationFee: values.summary.condoRegistrationFee,
        otherExpensesPercent: values.summary.otherExpensesPercent,
        transferFeePercent: values.summary.transferFeePercent,
        specificBizTaxPercent: values.summary.specificBizTaxPercent,
        riskProfitPercent: values.summary.riskProfitPercent,
        discountRate: values.summary.discountRate,
        remark: values.summary.remark,
      },
      costItems: [],
    };

    previewMutation.mutate(
      { pricingAnalysisId, methodId, request },
      {
        onSuccess: (result) => {
          if (result.condominiumSummary) setPreviewSummary(result.condominiumSummary);
          if (result.totalLandAreaFromTitles !== undefined)
            setPreviewTotalLandAreaFromTitles(result.totalLandAreaFromTitles ?? null);
        },
      },
    );
  }, [pricingAnalysisId, methodId, previewMutation, getValues]);

  useEffect(() => {
    const key = JSON.stringify(watchedFields);
    if (prevWatchKey.current === null) {
      prevWatchKey.current = key;
      return;
    }
    if (!isDirty) return;
    if (key === prevWatchKey.current) return;
    prevWatchKey.current = key;

    const timer = setTimeout(runPreview, 400);
    return () => clearTimeout(timer);
  }, [watchedFields, isDirty, runPreview]);

  // Single-shot init: reset the form from saved data, then immediately fire the
  // initial preview so Summary tab populates even when navigating in via React
  // Query cache. See LandBuildingTabs for the rationale.
  const rowCount = savedData.condominiumRows.length;
  useEffect(() => {
    if (isInitialized.current || !savedData) return;
    isInitialized.current = true;

    reset(mapSavedToFormValues(savedData));

    if (rowCount > 0) {
      runPreview();
    }
  }, [savedData, reset, runPreview, rowCount]);

  // After init, re-run preview when the unit row set changes (upload/delete).
  const prevRowCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isInitialized.current) return;
    if (prevRowCountRef.current === null) {
      prevRowCountRef.current = rowCount;
      return;
    }
    if (prevRowCountRef.current === rowCount) return;
    prevRowCountRef.current = rowCount;
    if (rowCount === 0) return;
    runPreview();
  }, [rowCount, runPreview]);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleOnSubmit = async (values: CondominiumFormValues) => {
    const request: SaveHypothesisAnalysisRequest = {
      condominiumSummary: {
        areaTitleDeed: values.summary.areaTitleDeed,
        far: values.summary.far,
        totalBuildingArea: values.summary.totalBuildingArea,
        estSalesDurationMonths: values.summary.estSalesDurationMonths,
        condoBuildingCostPerSqM: values.summary.condoBuildingCostPerSqM,
        setAvgRoomSizeUnits: values.summary.setAvgRoomSizeUnits,
        furniturePerUnit: values.summary.furniturePerUnit,
        externalUtilities: values.summary.externalUtilities,
        hardCostContingencyPercent: values.summary.hardCostContingencyPercent,
        estConstructionPeriodMonths: values.summary.estConstructionPeriodMonths,
        professionalFeePerMonth: values.summary.professionalFeePerMonth,
        adminCostPerMonth: values.summary.adminCostPerMonth,
        sellingAdvPercent: values.summary.sellingAdvPercent,
        titleDeedFee: values.summary.titleDeedFee,
        eiaCost: values.summary.eiaCost,
        condoRegistrationFee: values.summary.condoRegistrationFee,
        otherExpensesPercent: values.summary.otherExpensesPercent,
        transferFeePercent: values.summary.transferFeePercent,
        specificBizTaxPercent: values.summary.specificBizTaxPercent,
        riskProfitPercent: values.summary.riskProfitPercent,
        discountRate: values.summary.discountRate,
        remark: values.summary.remark,
      },
      costItems: [],
      remark: values.remark,
    };

    try {
      const result = await saveMutation.mutateAsync({ pricingAnalysisId, methodId, request });
      const finalValue = result.condominiumSummary?.totalAssetValueRounded ?? 0;
      // Allow next savedData change to re-hydrate from server (picks up any server-side changes).
      isInitialized.current = false;
      reset(values);
      onSaveSuccess(finalValue);
    } catch {
      toast.error('Failed to save');
    }
  };

  const effectiveSummary = previewSummary ?? savedData.condominiumSummary;
  const effectiveTotalLandAreaFromTitles =
    previewTotalLandAreaFromTitles ?? savedData.totalLandAreaFromTitles ?? null;

  return (
    <FormProvider methods={methods} schema={CondominiumFormSchema}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(handleOnSubmit)(e);
        }}
        className="flex flex-col h-full gap-4"
      >
        {/* Tab bar */}
        <nav className="shrink-0 flex gap-0.5 bg-gray-50/80 p-0.5 rounded-lg border border-gray-100 self-start">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50',
                )}
              >
                <Icon
                  name={tab.icon}
                  style="solid"
                  className={clsx('size-3.5', isActive ? 'text-primary' : 'text-gray-400')}
                />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Scrollable content region — keeps the action bar pinned at form bottom */}
        <div className="flex-1 min-h-0 overflow-auto">
          {activeTab === 'unitDetails' && (
            <CondoUnitDetailsTab
              pricingAnalysisId={pricingAnalysisId}
              methodId={methodId}
              uploads={savedData.uploads}
              rows={savedData.condominiumRows}
              previewSummary={effectiveSummary}
              totalLandAreaFromTitles={effectiveTotalLandAreaFromTitles}
            />
          )}

          {activeTab === 'summary' && (
            <CondominiumSummaryTab
              previewSummary={effectiveSummary}
              totalLandAreaFromTitles={effectiveTotalLandAreaFromTitles}
            />
          )}
        </div>

        <MethodFooterActions
          showReset
          isSubmitting={saveMutation.isPending}
          onReset={onReset}
          onCancel={onCancel}
        />
      </form>
    </FormProvider>
  );
}
