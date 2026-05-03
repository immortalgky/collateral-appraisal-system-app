import { useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@/shared/components';
import { MethodFooterActions } from '../../MethodFooterActions';
import { FormProvider } from '@/shared/components/form/FormProvider';
import {
  LandBuildingFormSchema,
  landBuildingFormDefaults,
  type LandBuildingFormValues,
} from '../../../schemas/hypothesisForm';
import type {
  GetHypothesisAnalysisResult,
  LandBuildingSummaryDto,
} from '../../../types/hypothesis';
import { UnitDetailsTab } from './UnitDetailsTab';
import { CostOfBuildingTab } from './CostOfBuildingTab';
import { LandBuildingSummaryTab } from './LandBuildingSummaryTab';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
  SaveHypothesisAnalysisRequest,
  SaveHypothesisAnalysisResult,
  PreviewHypothesisAnalysisRequest,
  PreviewHypothesisAnalysisResult,
  LandBuildingModelAggregate,
  CostItemDto,
} from '../../../types/hypothesis';
import toast from 'react-hot-toast';

type LandBuildingTabId = 'unitDetails' | 'costOfBuilding' | 'summary';

const TABS = [
  { id: 'unitDetails' as const, label: 'Unit Details', icon: 'table' },
  { id: 'costOfBuilding' as const, label: 'Cost of Building', icon: 'building' },
  { id: 'summary' as const, label: 'Summary', icon: 'chart-bar' },
];

/**
 * Compute basic per-model aggregates from saved data without calling the server.
 * Used as a fallback when previewModels is not yet populated (e.g. on cache hits)
 * so the Cost of Building tab and Summary's Construction Cost rows don't flash
 * empty state. Preview will replace this with server-computed values.
 *
 * Cost-related fields (totalBuildingValueAfterDepreciation, devCostRatioPercent)
 * are derived from saved cost items where possible; fields requiring the calc
 * service (e.g. devCostRatioPercent) default to 0 until preview overrides.
 */
function deriveModelsFromSavedData(
  savedData: GetHypothesisAnalysisResult,
): Record<string, LandBuildingModelAggregate> | null {
  if (!savedData.landBuildingRows || savedData.landBuildingRows.length === 0) {
    return null;
  }

  const grouped = new Map<string, LandBuildingModelAggregate>();
  for (const row of savedData.landBuildingRows) {
    const name = (row.modelName ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    let agg = grouped.get(key);
    if (!agg) {
      agg = {
        modelName: name,
        unitCount: 0,
        avgLandAreaSqWa: 0,
        totalLandAreaSqWa: 0,
        totalSellingPrice: 0,
        totalValueAfterDepreciation: 0,
        totalValueAfterDepreciationAllUnits: 0,
        devCostRatioPercent: 0,
        totalBuildingAreaSqM: 0,
        totalPriceBeforeDepreciation: 0,
        totalBuildingValueAfterDepreciation: 0,
      };
      grouped.set(key, agg);
    }
    agg.unitCount += 1;
    agg.totalLandAreaSqWa += row.landAreaSqWa ?? 0;
    agg.totalSellingPrice += row.sellingPrice ?? 0;
  }

  // Aggregate cost-of-building items per model (B09/B10/B11 + per-unit C19/C21).
  for (const ci of savedData.costItems ?? []) {
    if (ci.category !== 'CostOfBuilding' || !ci.modelName) continue;
    const agg = grouped.get(ci.modelName.toLowerCase());
    if (!agg) continue;
    agg.totalBuildingAreaSqM += ci.area ?? 0;
    agg.totalPriceBeforeDepreciation += ci.priceBeforeDepreciation ?? 0;
    const valueAfterDepre = ci.valueAfterDepreciation ?? ci.amount ?? 0;
    agg.totalBuildingValueAfterDepreciation += valueAfterDepre;
  }

  for (const agg of grouped.values()) {
    agg.avgLandAreaSqWa = agg.unitCount > 0 ? agg.totalLandAreaSqWa / agg.unitCount : 0;
    agg.totalValueAfterDepreciation = agg.totalBuildingValueAfterDepreciation;
    agg.totalValueAfterDepreciationAllUnits =
      agg.totalBuildingValueAfterDepreciation * agg.unitCount;
  }

  // devCostRatioPercent: requires C38 (total project dev cost) — sourced from saved summary.
  const totalDevCost = savedData.landBuildingSummary?.totalProjectDevCost ?? 0;
  if (totalDevCost > 0) {
    for (const agg of grouped.values()) {
      agg.devCostRatioPercent =
        (agg.totalValueAfterDepreciationAllUnits * 100) / totalDevCost;
    }
  }

  const result: Record<string, LandBuildingModelAggregate> = {};
  for (const [key, agg] of grouped.entries()) {
    result[key] = agg;
  }
  return result;
}

function mapSavedToFormValues(savedData: GetHypothesisAnalysisResult): LandBuildingFormValues {
  const s = savedData.landBuildingSummary;
  const cobItems = savedData.costItems.filter(i => i.category === 'CostOfBuilding');
  const otherItems = savedData.costItems.filter(i => i.category !== 'CostOfBuilding');

  return {
    summary: {
      totalArea: s?.totalArea ?? null,
      sellingAreaPercent: s?.sellingAreaPercent ?? null,
      publicUtilityAreaPercent: s?.publicUtilityAreaPercent ?? null,
      estSalesPeriod: s?.estSalesPeriod ?? null,
      publicUtilityRatePerSqWa: s?.publicUtilityRatePerSqWa ?? null,
      landFillingRatePerSqWa: s?.landFillingRatePerSqWa ?? null,
      // FSD soft defaults applied on rehydration so legacy analyses (saved before
      // the defaults existed) pick them up on next load.
      contingencyPercent: s?.contingencyPercent ?? 3,
      estConstructionPeriod: s?.estConstructionPeriod ?? null,
      allocationPermitFee: s?.allocationPermitFee ?? null,
      landTitleFeePerPlot: s?.landTitleFeePerPlot ?? null,
      professionalFeePerMonth: s?.professionalFeePerMonth ?? null,
      adminCostPerMonth: s?.adminCostPerMonth ?? null,
      sellingAdvPercent: s?.sellingAdvPercent ?? 3,
      projectContingencyPercent: s?.projectContingencyPercent ?? 3,
      transferFeePercent: s?.transferFeePercent ?? 1,
      specificBizTaxPercent: s?.specificBizTaxPercent ?? 3.3,
      riskPremiumPercent: s?.riskPremiumPercent ?? 30,
      discountRate: s?.discountRate ?? null,
      remark: s?.remark ?? null,
    },
    costOfBuildingItems: cobItems.map(i => ({
      id: i.id,
      category: i.category,
      kind: i.kind,
      description: i.description,
      displaySequence: i.displaySequence,
      amount: i.amount,
      rateAmount: i.rateAmount,
      quantity: i.quantity,
      ratePercent: i.ratePercent,
      modelName: i.modelName,
      area: i.area ?? null,
      pricePerSqM: i.pricePerSqM ?? null,
      year: i.year ?? null,
      annualDepreciationPercent: i.annualDepreciationPercent ?? null,
      priceBeforeDepreciation: i.priceBeforeDepreciation ?? null,
      totalDepreciationPercent: i.totalDepreciationPercent ?? null,
      depreciationAmount: i.depreciationAmount ?? null,
      valueAfterDepreciation: i.valueAfterDepreciation ?? null,
      isBuilding: i.isBuilding ?? true,
      depreciationMethod: i.depreciationMethod ?? 'Gross',
      depreciationPeriods: (i.depreciationPeriods ?? []).map(p => ({
        atYear: p.atYear,
        toYear: p.toYear,
        depreciationPerYear: p.depreciationPerYear,
      })),
    })),
    otherCostItems: otherItems.map(i => ({
      id: i.id,
      category: i.category,
      kind: i.kind,
      description: i.description,
      displaySequence: i.displaySequence,
      amount: i.amount,
      rateAmount: i.rateAmount,
      quantity: i.quantity,
      ratePercent: i.ratePercent,
      modelName: i.modelName,
      // These fields are CostOfBuilding-specific; provide harmless defaults for schema compatibility
      isBuilding: false,
      depreciationMethod: 'Gross' as const,
      depreciationPeriods: [],
    })),
    remark: savedData.remark ?? null,
  };
}

interface LandBuildingTabsProps {
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

export function LandBuildingTabs({
  pricingAnalysisId,
  methodId,
  savedData,
  saveMutation,
  previewMutation,
  onDirty,
  onSaveSuccess,
  onReset,
  onCancel,
}: LandBuildingTabsProps) {
  const [activeTab, setActiveTab] = useState<LandBuildingTabId>('unitDetails');
  const [previewSummary, setPreviewSummary] = useState<LandBuildingSummaryDto | null>(null);
  const [previewModels, setPreviewModels] = useState<Record<string, LandBuildingModelAggregate> | null>(null);
  const [previewTotalLandAreaFromTitles, setPreviewTotalLandAreaFromTitles] = useState<number | null>(null);
  const [previewCostItems, setPreviewCostItems] = useState<CostItemDto[] | null>(null);

  const isInitialized = useRef(false);

  const methods = useForm<LandBuildingFormValues>({
    resolver: zodResolver(LandBuildingFormSchema),
    defaultValues: landBuildingFormDefaults,
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

  const watchedFields = watch(['summary', 'costOfBuildingItems', 'otherCostItems']);
  const prevWatchKey = useRef<string | null>(null);

  const runPreview = useCallback(() => {
    const values = getValues();
    const request: PreviewHypothesisAnalysisRequest = {
      landBuildingSummary: {
        totalArea: values.summary.totalArea,
        sellingAreaPercent: values.summary.sellingAreaPercent,
        publicUtilityAreaPercent: values.summary.publicUtilityAreaPercent,
        estSalesPeriod: values.summary.estSalesPeriod,
        publicUtilityRatePerSqWa: values.summary.publicUtilityRatePerSqWa,
        landFillingRatePerSqWa: values.summary.landFillingRatePerSqWa,
        contingencyPercent: values.summary.contingencyPercent,
        estConstructionPeriod: values.summary.estConstructionPeriod,
        allocationPermitFee: values.summary.allocationPermitFee,
        landTitleFeePerPlot: values.summary.landTitleFeePerPlot,
        professionalFeePerMonth: values.summary.professionalFeePerMonth,
        adminCostPerMonth: values.summary.adminCostPerMonth,
        sellingAdvPercent: values.summary.sellingAdvPercent,
        projectContingencyPercent: values.summary.projectContingencyPercent,
        transferFeePercent: values.summary.transferFeePercent,
        specificBizTaxPercent: values.summary.specificBizTaxPercent,
        riskPremiumPercent: values.summary.riskPremiumPercent,
        discountRate: values.summary.discountRate,
        remark: values.summary.remark,
      },
      costItems: [
        ...(values.costOfBuildingItems ?? []).map((i, idx) => ({
          id: i.id,
          category: i.category,
          kind: i.kind,
          description: i.description,
          displaySequence: i.displaySequence ?? idx,
          amount: i.amount ?? 0,
          rateAmount: i.rateAmount,
          quantity: i.quantity,
          ratePercent: i.ratePercent,
          modelName: i.modelName,
          area: i.area,
          pricePerSqM: i.pricePerSqM,
          year: i.year,
          annualDepreciationPercent: i.annualDepreciationPercent,
          isBuilding: i.isBuilding ?? true,
          depreciationMethod: i.depreciationMethod ?? 'Gross',
          depreciationPeriods: i.depreciationPeriods ?? [],
        })),
        ...(values.otherCostItems ?? []).map((i, idx) => ({
          id: i.id,
          category: i.category,
          kind: i.kind,
          description: i.description,
          displaySequence: i.displaySequence ?? idx,
          amount: i.amount ?? 0,
          rateAmount: i.rateAmount,
          quantity: i.quantity,
          ratePercent: i.ratePercent,
          modelName: i.modelName,
          isBuilding: false,
          depreciationMethod: 'Gross' as const,
          depreciationPeriods: [],
        })),
      ],
    };

    previewMutation.mutate(
      { pricingAnalysisId, methodId, request },
      {
        onSuccess: (result) => {
          if (result.landBuildingSummary) setPreviewSummary(result.landBuildingSummary);
          if (result.models) setPreviewModels(result.models);
          if (result.totalLandAreaFromTitles !== undefined)
            setPreviewTotalLandAreaFromTitles(result.totalLandAreaFromTitles ?? null);
          if (result.costItems !== undefined) setPreviewCostItems(result.costItems ?? null);
        },
      },
    );
  }, [pricingAnalysisId, methodId, previewMutation, getValues]);

  // Watch inputs and debounce preview calls
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
  // initial preview so per-model aggregates (Cost of Building, Summary tab) populate
  // even when navigating in via React Query cache (no fresh fetch).
  //
  // The previous split (one effect for reset, another for rowCount) raced on mount
  // because the rowCount effect's `runPreview` captured the form before reset had
  // committed values. Combining them ensures reset() runs first, then runPreview
  // sees the freshly-reset getValues().
  const rowCount = savedData.landBuildingRows.length;
  useEffect(() => {
    if (isInitialized.current || !savedData) return;
    isInitialized.current = true;

    reset(mapSavedToFormValues(savedData));

    if (rowCount > 0) {
      runPreview();
    } else {
      setPreviewModels(null);
    }
  }, [savedData, reset, runPreview, rowCount]);

  // After init, re-run preview when the unit row set changes (e.g. after upload
  // or delete). Skipped on the very first render — that path is handled by the
  // init effect above.
  const prevRowCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isInitialized.current) return;
    if (prevRowCountRef.current === null) {
      prevRowCountRef.current = rowCount;
      return;
    }
    if (prevRowCountRef.current === rowCount) return;
    prevRowCountRef.current = rowCount;
    if (rowCount === 0) {
      setPreviewModels(null);
      return;
    }
    runPreview();
  }, [rowCount, runPreview]);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleOnSubmit = async (values: LandBuildingFormValues) => {
    const request: SaveHypothesisAnalysisRequest = {
      landBuildingSummary: {
        totalArea: values.summary.totalArea,
        sellingAreaPercent: values.summary.sellingAreaPercent,
        publicUtilityAreaPercent: values.summary.publicUtilityAreaPercent,
        estSalesPeriod: values.summary.estSalesPeriod,
        publicUtilityRatePerSqWa: values.summary.publicUtilityRatePerSqWa,
        landFillingRatePerSqWa: values.summary.landFillingRatePerSqWa,
        contingencyPercent: values.summary.contingencyPercent,
        estConstructionPeriod: values.summary.estConstructionPeriod,
        allocationPermitFee: values.summary.allocationPermitFee,
        landTitleFeePerPlot: values.summary.landTitleFeePerPlot,
        professionalFeePerMonth: values.summary.professionalFeePerMonth,
        adminCostPerMonth: values.summary.adminCostPerMonth,
        sellingAdvPercent: values.summary.sellingAdvPercent,
        projectContingencyPercent: values.summary.projectContingencyPercent,
        transferFeePercent: values.summary.transferFeePercent,
        specificBizTaxPercent: values.summary.specificBizTaxPercent,
        riskPremiumPercent: values.summary.riskPremiumPercent,
        discountRate: values.summary.discountRate,
        remark: values.summary.remark,
      },
      costItems: [
        ...(values.costOfBuildingItems ?? []).map((i, idx) => ({
          id: i.id,
          category: i.category,
          kind: i.kind,
          description: i.description,
          displaySequence: i.displaySequence ?? idx,
          amount: i.amount ?? 0,
          rateAmount: i.rateAmount,
          quantity: i.quantity,
          ratePercent: i.ratePercent,
          modelName: i.modelName,
          area: i.area,
          pricePerSqM: i.pricePerSqM,
          year: i.year,
          annualDepreciationPercent: i.annualDepreciationPercent,
          isBuilding: i.isBuilding ?? true,
          depreciationMethod: i.depreciationMethod ?? 'Gross',
          depreciationPeriods: i.depreciationPeriods ?? [],
        })),
        ...(values.otherCostItems ?? []).map((i, idx) => ({
          id: i.id,
          category: i.category,
          kind: i.kind,
          description: i.description,
          displaySequence: i.displaySequence ?? idx,
          amount: i.amount ?? 0,
          rateAmount: i.rateAmount,
          quantity: i.quantity,
          ratePercent: i.ratePercent,
          modelName: i.modelName,
          isBuilding: false,
          depreciationMethod: 'Gross' as const,
          depreciationPeriods: [],
        })),
      ],
      remark: values.remark,
    };

    try {
      const result = await saveMutation.mutateAsync({ pricingAnalysisId, methodId, request });
      const finalValue = result.landBuildingSummary?.totalAssetValueRounded ?? 0;
      // Allow next savedData change to re-hydrate — picks up server-assigned ids for new rows.
      isInitialized.current = false;
      reset(values); // clear dirty state immediately so UI shows "saved"
      onSaveSuccess(finalValue);
    } catch {
      toast.error('Failed to save');
    }
  };

  const effectiveSummary = previewSummary ?? savedData.landBuildingSummary;
  // Fall back to a client-side aggregate when preview hasn't run yet (e.g. cache hits)
  // so Cost of Building / Summary tab don't flash empty state. Preview will overwrite
  // with server-computed values once it returns.
  const effectiveModels =
    previewModels ?? deriveModelsFromSavedData(savedData);
  const effectiveTotalLandAreaFromTitles =
    previewTotalLandAreaFromTitles ?? savedData.totalLandAreaFromTitles ?? null;

  return (
    <FormProvider methods={methods} schema={LandBuildingFormSchema}>
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
            <UnitDetailsTab
              pricingAnalysisId={pricingAnalysisId}
              methodId={methodId}
              uploads={savedData.uploads}
              rows={savedData.landBuildingRows}
              models={effectiveModels}
              totalLandAreaFromTitles={effectiveTotalLandAreaFromTitles}
            />
          )}

          {activeTab === 'costOfBuilding' && (
            <CostOfBuildingTab
              models={effectiveModels}
            />
          )}

          {activeTab === 'summary' && (
            <LandBuildingSummaryTab
              previewSummary={effectiveSummary}
              models={effectiveModels}
              totalLandAreaFromTitles={effectiveTotalLandAreaFromTitles}
              costItems={previewCostItems ?? savedData.costItems}
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
