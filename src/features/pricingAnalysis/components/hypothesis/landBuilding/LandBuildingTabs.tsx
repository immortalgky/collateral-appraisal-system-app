import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Icon } from '@/shared/components';
import { useTranslation } from 'react-i18next';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { MethodTopBarPortal } from '../../MethodTopBarPortal';
import { MethodTabs } from '../../MethodTabs';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { fmt } from '../../../domain/formatters';
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
import { LandBuildingSummaryTab, useLbSections } from './LandBuildingSummaryTab';
import { LedgerJumpBar } from '../_shared/summaryAtoms';
import { KpiSummaryStrip, type KpiCard } from '../../KpiSummaryStrip';
import { MethodToolbarToggle } from '../../MethodWorkArea';
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

  // Construction cost: only the typed-over total is known without the server (the per-house
  // building value is resolved by preview a moment later).
  for (const m of savedData.modelBuildingMappings ?? []) {
    const agg = grouped.get(m.modelName.trim().toLowerCase());
    if (!agg) continue;
    agg.buildingPropertyId = m.appraisalPropertyId;
    agg.totalCost = m.totalCost;
    agg.totalValueAfterDepreciationAllUnits = m.totalCost ?? 0;
  }

  for (const agg of grouped.values()) {
    agg.avgLandAreaSqWa = agg.unitCount > 0 ? agg.totalLandAreaSqWa / agg.unitCount : 0;
  }

  // devCostRatioPercent: requires C38 (total project dev cost) — sourced from saved summary.
  const totalDevCost = savedData.landBuildingSummary?.totalProjectDevCost ?? 0;
  if (totalDevCost > 0) {
    for (const agg of grouped.values()) {
      agg.devCostRatioPercent = (agg.totalValueAfterDepreciationAllUnits * 100) / totalDevCost;
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
  // CostOfBuilding rows are no longer edited or sent: the cost comes from the mapped building,
  // and leaving them out of the payload lets the save drop them (see the one-time data script
  // 20260921180000_DataFix_HypothesisCostOfBuildingToModelTotalCost.sql).
  const otherItems = savedData.costItems.filter(i => i.category !== 'CostOfBuilding');

  return {
    indicatedValue: savedData.indicatedValue ?? null,
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
    modelBuildingMappings: (savedData.modelBuildingMappings ?? []).map(m => ({
      modelName: m.modelName,
      appraisalPropertyId: m.appraisalPropertyId ?? null,
      totalCost: m.totalCost ?? null,
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
  /** The group's properties — source of the Cost of Building tab's building list. */
  properties?: Record<string, unknown>[];
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
  properties,
}: LandBuildingTabsProps) {
  const { t } = useTranslation('pricingAnalysis');
  const readOnly = usePageReadOnly();
  // Stable id so the top-bar Save button (portaled outside this <form> via
  // MethodTopBarPortal) still submits it natively — see LeaseholdPanel.tsx for why.
  const formId = 'hypothesis-land-building-form';
  const [previewSummary, setPreviewSummary] = useState<LandBuildingSummaryDto | null>(null);
  const [showChart, setShowChart] = useState(false);
  const sections = useLbSections();
  const [previewModels, setPreviewModels] = useState<Record<
    string,
    LandBuildingModelAggregate
  > | null>(null);
  const [previewTotalLandAreaFromTitles, setPreviewTotalLandAreaFromTitles] = useState<
    number | null
  >(null);
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

  const watchedFields = watch([
    'summary',
    'modelBuildingMappings',
    'otherCostItems',
    'indicatedValue',
  ]);
  const prevWatchKey = useRef<string | null>(null);

  // Stable refs so the debounce timer survives re-renders:
  //   runPreviewRef — always holds the latest runPreview without being a dep
  //   debounceTimerRef — stores the timer id so a new re-render (different watchedFields
  //     reference but same JSON value) can't cancel it via useEffect cleanup
  const runPreviewRef = useRef<() => void>(() => {});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      modelBuildingMappings: values.modelBuildingMappings,
      // Only feeds the per-sq.wa figure (C82), which must describe the typed-over value.
      indicatedValue: values.indicatedValue,
    };

    previewMutation.mutate(
      { pricingAnalysisId, methodId, request },
      {
        onSuccess: result => {
          if (result.landBuildingSummary) setPreviewSummary(result.landBuildingSummary);
          if (result.models) setPreviewModels(result.models);
          if (result.totalLandAreaFromTitles !== undefined)
            setPreviewTotalLandAreaFromTitles(result.totalLandAreaFromTitles ?? null);
          if (result.costItems !== undefined) setPreviewCostItems(result.costItems ?? null);
        },
      },
    );
  }, [pricingAnalysisId, methodId, previewMutation, getValues]);
  runPreviewRef.current = runPreview;

  // Watch inputs and debounce preview calls
  useEffect(() => {
    const key = JSON.stringify(watchedFields);
    if (prevWatchKey.current === null) {
      prevWatchKey.current = key;
      return;
    }
    if (key === prevWatchKey.current) return;
    prevWatchKey.current = key;

    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      runPreviewRef.current();
    }, 400);
  }, [watchedFields]);
  useEffect(
    () => () => {
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    },
    [],
  );

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
      indicatedValue: values.indicatedValue,
      modelBuildingMappings: values.modelBuildingMappings,
    };

    try {
      const result = await saveMutation.mutateAsync({ pricingAnalysisId, methodId, request });
      const finalValue =
        values.indicatedValue ?? result.landBuildingSummary?.totalAssetValueRounded ?? 0;
      // Reset from the values just submitted — NOT from the `savedData` prop, which is
      // still the pre-save snapshot at this point (the parent's query hasn't refetched
      // yet). Resetting from stale `savedData` was wiping out Cost of Building rows the
      // user had just entered. Server-computed summary fields (totals/ratios) live in
      // `previewSummary`, not the RHF form, so overlay the authoritative save result there.
      reset(values);
      if (result.landBuildingSummary) setPreviewSummary(result.landBuildingSummary);
      onSaveSuccess(finalValue);
    } catch {
      toast.error(t('hypothesis.toasts.saveFailed'));
    }
  };

  const effectiveSummary = previewSummary ?? savedData.landBuildingSummary;
  // Fall back to a client-side aggregate when preview hasn't run yet (e.g. cache hits)
  // so Cost of Building / Summary tab don't flash empty state. Preview will overwrite
  // with server-computed values once it returns.
  const effectiveModels = previewModels ?? deriveModelsFromSavedData(savedData);
  const effectiveTotalLandAreaFromTitles =
    previewTotalLandAreaFromTitles ?? savedData.totalLandAreaFromTitles ?? null;

  const indicatedValueWatched = watch('indicatedValue');

  // mock v94 `kpis` — the units and cost tabs carry these in their toolbar.
  const modelValues = effectiveModels ? Object.values(effectiveModels) : [];
  const kpiStrip = modelValues.length ? (
    <KpiSummaryStrip
      variant="flat"
      cards={
        [
          {
            label: t('upload.aggTotalLandAreaFromTitle'),
            value: effectiveTotalLandAreaFromTitles ?? effectiveSummary?.totalArea ?? null,
            secondary: true,
          },
          {
            label: t('upload.aggTotalSellingArea'),
            value: modelValues.reduce((s, m) => s + (m.totalLandAreaSqWa ?? 0), 0),
            secondary: true,
          },
          {
            label: t('upload.aggTotalUnits'),
            value: modelValues.reduce((s, m) => s + (m.unitCount ?? 0), 0),
          },
          {
            label: t('upload.aggTotalRevenue'),
            value: modelValues.reduce((s, m) => s + (m.totalSellingPrice ?? 0), 0),
          },
          {
            label: t('hypothesis.ledger.lb.finalValue'),
            value: effectiveSummary?.finalPropertyValue ?? null,
            primary: true,
          },
        ] satisfies KpiCard[]
      }
    />
  ) : undefined;

  return (
    <FormProvider methods={methods} schema={LandBuildingFormSchema}>
      <MethodTopBarPortal>
        <div className="flex flex-col items-end leading-tight shrink-0 px-1">
          <span className="text-[10px] text-gray-400">{t('finalValue.indicatedValue')}</span>
          <span className="text-sm font-semibold text-primary tabular-nums">
            {fmt(indicatedValueWatched ?? effectiveSummary?.totalAssetValueRounded ?? 0)}
          </span>
        </div>
        {!readOnly && (
          <>
            <span className="w-px h-5 bg-gray-200 shrink-0" />
            <Button
              variant="ghost"
              type="button"
              onClick={onCancel}
              disabled={saveMutation.isPending}
              className="h-[28px]! px-[12px]! py-0! text-[12.5px]! rounded-[7px]!"
            >
              {t('footer.cancel')}
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={onReset}
              disabled={saveMutation.isPending}
              title={t('footer.reset')}
              aria-label={t('footer.reset')}
              className="h-[28px]! w-[28px]! px-0! py-0! rounded-[7px]! text-red-500 hover:text-red-600"
            >
              <Icon name="arrow-rotate-left" style="solid" className="size-[13px]" />
            </Button>
            <Button
              type="submit"
              form={formId}
              isLoading={saveMutation.isPending}
              disabled={saveMutation.isPending}
              className="h-[28px]! px-[12px]! py-0! text-[12.5px]! rounded-[7px]!"
            >
              {!saveMutation.isPending && (
                <Icon style="solid" name="check" className="size-[13px] mr-[6px]" />
              )}
              {t('footer.save')}
            </Button>
          </>
        )}
      </MethodTopBarPortal>
      <form
        id={formId}
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(handleOnSubmit)(e);
        }}
        className="flex flex-col h-full min-h-0 gap-4"
      >
        <MethodTabs
          tabs={[
            {
              id: 'unitDetails',
              label: t('hypothesis.tabs.unitDetails'),
              tools: kpiStrip,
              content: (
                <UnitDetailsTab
                  pricingAnalysisId={pricingAnalysisId}
                  methodId={methodId}
                  uploads={savedData.uploads}
                  rows={savedData.landBuildingRows}
                  models={effectiveModels}
                />
              ),
            },
            {
              id: 'costOfBuilding',
              label: t('hypothesis.tabs.costOfBuilding'),
              tools: kpiStrip,
              content: <CostOfBuildingTab models={effectiveModels} properties={properties} />,
            },
            {
              id: 'summary',
              label: t('hypothesis.tabs.summary'),
              tools: <LedgerJumpBar sections={sections} />,
              toolsAfterNav: (
                <MethodToolbarToggle
                  label={t('hypothesis.ledger.chart')}
                  pressed={showChart}
                  onClick={() => setShowChart(v => !v)}
                />
              ),
              content: (
                <LandBuildingSummaryTab
                  showChart={showChart}
                  previewSummary={effectiveSummary}
                  models={effectiveModels}
                  totalLandAreaFromTitles={effectiveTotalLandAreaFromTitles}
                  costItems={previewCostItems ?? savedData.costItems}
                  isCalculating={previewMutation.isPending}
                />
              ),
            },
          ]}
        />
      </form>
    </FormProvider>
  );
}
