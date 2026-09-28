import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, Icon } from '@/shared/components';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { MethodTopBarPortal } from '../../MethodTopBarPortal';
import { MethodTabs } from '../../MethodTabs';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { fmt } from '../../../domain/formatters';
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
import { CondominiumSummaryTab, useCondoSections } from './CondominiumSummaryTab';
import { LedgerJumpBar } from '../_shared/summaryAtoms';
import { KpiSummaryStrip, type KpiCard } from '../../KpiSummaryStrip';
import { MethodToolbarToggle } from '../../MethodWorkArea';
import type { UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage, isAxiosError } from '@/shared/utils/errorUtils';

function mapSavedToFormValues(savedData: GetHypothesisAnalysisResult): CondominiumFormValues {
  const s = savedData.condominiumSummary;
  return {
    indicatedValue: savedData.indicatedValue ?? null,
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
  const { t } = useTranslation('pricingAnalysis');
  const readOnly = usePageReadOnly();
  // Stable id so the top-bar Save button (portaled outside this <form> via
  // MethodTopBarPortal) still submits it natively — see LeaseholdPanel.tsx for why.
  const formId = 'hypothesis-condominium-form';
  const [previewSummary, setPreviewSummary] = useState<CondominiumSummaryDto | null>(null);
  const [showChart, setShowChart] = useState(false);
  const sections = useCondoSections();
  const [previewTotalLandAreaFromTitles, setPreviewTotalLandAreaFromTitles] = useState<
    number | null
  >(null);

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

  const watchedFields = watch(['summary', 'indicatedValue']);
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
      // Only feeds the per-sq.m figure (E59), which must describe the typed-over value.
      indicatedValue: values.indicatedValue,
    };

    previewMutation.mutate(
      { pricingAnalysisId, methodId, request },
      {
        onSuccess: result => {
          if (result.condominiumSummary) setPreviewSummary(result.condominiumSummary);
          if (result.totalLandAreaFromTitles !== undefined)
            setPreviewTotalLandAreaFromTitles(result.totalLandAreaFromTitles ?? null);
        },
      },
    );
  }, [pricingAnalysisId, methodId, previewMutation, getValues]);
  runPreviewRef.current = runPreview;

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
      indicatedValue: values.indicatedValue,
    };

    try {
      const result = await saveMutation.mutateAsync({ pricingAnalysisId, methodId, request });
      const finalValue =
        values.indicatedValue ?? result.condominiumSummary?.totalAssetValueRounded ?? 0;
      reset(
        mapSavedToFormValues({
          ...savedData,
          condominiumSummary: result.condominiumSummary ?? savedData.condominiumSummary,
          indicatedValue: values.indicatedValue,
        }),
      );
      onSaveSuccess(finalValue);
    } catch (error) {
      // Surface the backend's actual reason (ProblemDetails.detail) instead of a blanket
      // "Failed to save" — e.g. an out-of-range Indoor Sales Area % from a too-small
      // Total Building Area now returns a clear 400 message.
      toast.error(isAxiosError(error) ? getErrorMessage(error) : t('hypothesis.toasts.saveFailed'));
    }
  };

  const effectiveSummary = previewSummary ?? savedData.condominiumSummary;
  const effectiveTotalLandAreaFromTitles =
    previewTotalLandAreaFromTitles ?? savedData.totalLandAreaFromTitles ?? null;

  const indicatedValueWatched = watch('indicatedValue');

  return (
    <FormProvider methods={methods} schema={CondominiumFormSchema}>
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
              // mock v94 `kpis` — the unit tab carries these in its toolbar.
              tools: savedData.condominiumRows.length ? (
                <KpiSummaryStrip
                  variant="flat"
                  cards={
                    [
                      {
                        label: t('upload.aggTotalLandAreaFromTitle'),
                        value:
                          effectiveTotalLandAreaFromTitles ??
                          effectiveSummary?.areaTitleDeed ??
                          null,
                        secondary: true,
                      },
                      {
                        label: t('upload.aggIndoorSalesArea'),
                        value: effectiveSummary?.indoorSalesArea ?? null,
                        secondary: true,
                      },
                      { label: t('upload.aggTotalUnits'), value: savedData.condominiumRows.length },
                      {
                        label: t('upload.aggTotalSellingPrice'),
                        value: savedData.condominiumRows.reduce(
                          (s, r) => s + (r.sellingPrice ?? 0),
                          0,
                        ),
                      },
                      {
                        label: t('hypothesis.ledger.condo.finalRemainingValue'),
                        value: effectiveSummary?.finalRemainingValue ?? null,
                        primary: true,
                      },
                    ] satisfies KpiCard[]
                  }
                />
              ) : undefined,
              content: (
                <CondoUnitDetailsTab
                  pricingAnalysisId={pricingAnalysisId}
                  methodId={methodId}
                  uploads={savedData.uploads}
                  rows={savedData.condominiumRows}
                />
              ),
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
                <CondominiumSummaryTab
                  previewSummary={effectiveSummary}
                  totalLandAreaFromTitles={effectiveTotalLandAreaFromTitles}
                  isCalculating={previewMutation.isPending}
                  showChart={showChart}
                />
              ),
            },
          ]}
        />
      </form>
    </FormProvider>
  );
}
