import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, useController, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormProvider } from '@/shared/components/form/FormProvider';
import {
  useLeaseholdFormSchema,
  leaseholdFormDefaults,
  type LeaseholdFormType,
} from '../schemas/leaseholdForm';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, Icon } from '@/shared/components';
import { NumberInput } from '@/shared/components/inputs';
import { initializeLeaseholdForm } from '../adapters/initializeLeaseholdForm';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGetLeaseholdAnalysis, useSaveLeaseholdAnalysis } from '../api';
import { useResetMethod } from '../api';
import { pricingAnalysisKeys } from '../api/queryKeys';
import { LeaseholdTable } from './LeaseholdTable';
import { LeaseholdRentalInfoModal } from './LeaseholdRentalInfoModal';
import { LeaseholdChart } from './LeaseholdChart';
import { LeaseholdPartialUsageSection } from './LeaseholdPartialUsageSection';
import {
  SummaryGrid,
  SummaryCard,
  DisplayValueRow,
  IndicatedValueRow,
  SummaryNotesCard,
} from './SummaryValueCard';
import { KpiSummaryStrip, type KpiCard } from './KpiSummaryStrip';
import { DenseProvider, RHFInputCell } from './table/RHFInputCell';
import { MethodTopBarPortal } from './MethodTopBarPortal';
import { MethodTabs } from './MethodTabs';
import {
  MethodWorkArea,
  MethodToolbarToggle,
  MethodRailSectionTitle,
  MethodRailField,
  MethodRailLeaseHeader,
  MethodRailPeriodHeader,
  MethodRailAddRow,
  MethodRailSeg,
} from './MethodWorkArea';
import {
  generateLeaseholdTable,
  computeAppraisalSchedule,
  calculatePartialUsage,
  type LeaseholdTableResult,
  calculateLeaseLandAreaUsage,
} from '../domain/calculateLeasehold';
import type { SaveLeaseholdAnalysisRequest } from '../types/leasehold';
import { useGetRentalSchedule, useGetLeaseAgreement } from '@/features/appraisal/api/property';
import { typeToDetailEndpoint } from '@/features/appraisal/utils/propertyTypeConfig';
import axios from '@shared/api/axiosInstance';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useGetAppointment } from '@/features/appraisal/api/appointment';
import toast from 'react-hot-toast';
import { fmt } from '../domain/formatters';
import DataErrorState from '@/shared/components/DataErrorState';
import { MarketReferenceButton } from './MarketReferenceButton';
import { PricingAnalysisSubjectType } from '../api/references';
import type { MarketComparableDetailType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';

interface LeaseholdPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  firstPropertyId?: string;
  firstPropertyType?: string;
  propertiesMap?: Record<string, Record<string, unknown>>;
  /** Passed through for the market-reference launcher */
  marketSurveys?: MarketComparableDetailType[];
  templateList?: TemplateDtoType[] | undefined;
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

export function LeaseholdPanel({
  activeMethod,
  firstPropertyId,
  firstPropertyType,
  propertiesMap,
  marketSurveys,
  templateList,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: LeaseholdPanelProps) {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('pricingAnalysis');
  // Stable id so the top-bar Save button (portaled outside this <form> via
  // MethodTopBarPortal) still submits it natively — see WQSPanel.tsx for why.
  const formId = 'leasehold-panel-form';
  const appraisalId = useAppraisalId();
  const { data: appointment } = useGetAppointment(appraisalId ?? '');
  const { pricingAnalysisId, methodId } = activeMethod ?? {};
  const queryClient = useQueryClient();
  const [isShowResetDialog, setIsShowResetDialog] = useState(false);
  const [isRentalInfoModalOpen, setIsRentalInfoModalOpen] = useState(false);
  const [tableResult, setTableResult] = useState<LeaseholdTableResult | null>(null);
  const tableResultRef = useRef<LeaseholdTableResult | null>(null);
  const [estimateNetPrice, setEstimateNetPrice] = useState<number | null>(null);
  // mock:1284 `sideL: true, chart: false` — the input rail defaults open, the chart
  // defaults closed; both toggled from the tab toolbar (mock:3504-3505).
  const [showRail, setShowRail] = useState(true);
  const [showChart, setShowChart] = useState(false);

  const resetMutation = useResetMethod();
  const saveMutation = useSaveLeaseholdAnalysis();

  const {
    data: savedData,
    isPending: isLoading,
    isError: isSavedDataError,
    refetch: refetchSavedData,
  } = useGetLeaseholdAnalysis(pricingAnalysisId, methodId);

  // Fetch property detail directly to get totalLandAreaInSqWa and building depreciation
  const detailEndpoint = firstPropertyType ? typeToDetailEndpoint[firstPropertyType] : undefined;

  const {
    data: propertyDetail,
    isError: isPropertyDetailError,
    refetch: refetchPropertyDetail,
  } = useQuery({
    queryKey: ['appraisal', appraisalId, 'property', firstPropertyId, 'detail-lh'],
    queryFn: async () => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${firstPropertyId}/${detailEndpoint}`,
      );
      return data as Record<string, any>;
    },
    enabled: !!appraisalId && !!firstPropertyId && !!detailEndpoint,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const propertyData = useMemo(() => {
    if (!propertyDetail) return null;

    // Collect every building-bearing property in the group:
    //   - the primary property (if its detail carries depreciationDetails)
    //   - any sibling property in propertiesMap that carries depreciationDetails
    // Filtering by presence of depreciationDetails (instead of matching BUILDING_TYPE_CODES
    // by string) matches ProfitRentPanel's pattern and is robust to whether `propertyType`
    // is stored as a short code or a display name.
    const buildings: Record<string, any>[] = [];
    if ((propertyDetail as any).depreciationDetails) {
      buildings.push(propertyDetail as any);
    }
    if (propertiesMap) {
      for (const prop of Object.values(propertiesMap)) {
        const p = prop as any;
        if (p.propertyId !== firstPropertyId && p.depreciationDetails) {
          buildings.push(p);
        }
      }
    }

    const totalBuildingPriceBeforeDepreciation = buildings.reduce(
      (total, b) =>
        total +
        ((b.depreciationDetails ?? []) as any[]).reduce(
          (s: number, item: any) => s + (Number(item?.priceBeforeDepreciation) || 0),
          0,
        ),
      0,
    );

    return {
      // Net area — title area less the deductions the appraiser listed (encroachment, land used
      // by others, public waterway). Pricing values the appraisable area, not the registered one;
      // the deed's own figure stays on the property form and in the book's per-title rows.
      // `!= null` rather than a truthiness check: a fully deducted plot is a real 0, not a blank.
      // The key keeps its "total" name because every consumer below reads it by that name — the
      // server's PropertyGroupData.TotalLandAreaInSqWa is likewise the net figure under a gross name.
      totalLandAreaInSqWa:
        ((propertyDetail as any).netLandAreaInSqWa != null
          ? Number((propertyDetail as any).netLandAreaInSqWa)
          : Number((propertyDetail as any).totalLandAreaInSqWa)) || 0,
      totalBuildingPriceBeforeDepreciation,
    };
  }, [propertyDetail, propertiesMap, firstPropertyId]);

  // Fetch rental schedule and lease agreement for rental income data and lease dates
  const {
    data: rentalScheduleData,
    isError: isRentalScheduleError,
    refetch: refetchRentalSchedule,
  } = useGetRentalSchedule(appraisalId ?? '', firstPropertyId);
  const {
    data: leaseAgreement,
    isError: isLeaseAgreementError,
    refetch: refetchLeaseAgreement,
  } = useGetLeaseAgreement(appraisalId ?? '', firstPropertyId);

  const leaseholdSchema = useLeaseholdFormSchema();
  const methods = useForm<LeaseholdFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(leaseholdSchema),
    defaultValues: leaseholdFormDefaults,
  });

  const {
    handleSubmit,
    formState: { isDirty },
    getValues,
    setValue,
    reset,
    control,
    watch,
  } = methods;

  const isPartialUsage = useWatch({ control, name: 'isPartialUsage' });

  // Rental land area controls
  const raiCtrl = useController({ control, name: 'partialRai' });
  const nganCtrl = useController({ control, name: 'partialNgan' });
  const waCtrl = useController({ control, name: 'partialWa' });
  const totalLeaseLandArea = useMemo(() => {
    return calculateLeaseLandAreaUsage({
      rai: raiCtrl.field.value ?? 0,
      ngan: nganCtrl.field.value ?? 0,
      wa: waCtrl.field.value ?? 0,
    });
  }, [raiCtrl.field.value, nganCtrl.field.value, waCtrl.field.value]);

  // Initialize form once when data loads
  const isInitialized = useRef(false);
  useEffect(() => {
    if (savedData !== undefined && !isInitialized.current) {
      isInitialized.current = true;
      initializeLeaseholdForm(savedData?.analysis, savedData?.remark, reset);

      // Load stored table from backend if available (no Generate click needed)
      if (savedData?.analysis?.calculationDetails?.length) {
        const details = savedData.analysis.calculationDetails;
        const result: LeaseholdTableResult = {
          rows: details.map(d => ({
            year: d.year,
            landValue: d.landValue,
            landGrowthPercent: d.landGrowthPercent,
            buildingValue: d.buildingValue,
            depreciationAmount: d.depreciationAmount,
            depreciationPercent: d.depreciationPercent,
            buildingAfterDepreciation: d.buildingAfterDepreciation,
            totalLandAndBuilding: d.totalLandAndBuilding,
            rentalIncome: d.rentalIncome,
            pvFactor: d.pvFactor,
            netCurrentRentalIncome: d.netCurrentRentalIncome,
          })),
          totalIncomeOverLeaseTerm: savedData.analysis.totalIncomeOverLeaseTerm,
          valueAtLeaseExpiry: savedData.analysis.valueAtLeaseExpiry,
          finalValue: savedData.analysis.finalValue,
          // The API keeps one figure now; the local calc type still names it "rounded".
          finalValueRounded: savedData.analysis.finalValue,
        };
        tableResultRef.current = result;
        setTableResult(result);
      }

      // Restore estimate net price from saved data
      if (savedData?.analysis?.isPartialUsage) {
        setEstimateNetPrice(savedData.analysis.estimateNetPrice ?? null);
      }
    }
  }, [savedData]);

  // Re-run the projection whenever any input that feeds it changes —
  // form fields the user edits, the building-value sum, the land area,
  // the rental schedule, or the appraisal date. `isInitialized.current`
  // still gates the first run until the saved form values are merged in.
  // `handleGenerate` reads form values via getValuesRef, so we only need
  // useWatch as a change-detection signal — no need to thread the values
  // through this effect.
  const watchedCalcInputs = useWatch({
    control,
    name: [
      'landValuePerSqWa',
      'landGrowthRateType',
      'landGrowthRatePercent',
      'landGrowthIntervalYears',
      'landGrowthPeriods',
      'initialBuildingValue',
      'constructionCostIndex',
      'depreciationRate',
      'depreciationIntervalYears',
      'buildingCalcStartYear',
      'discountRate',
      'isPartialUsage',
      'partialRai',
      'partialNgan',
      'partialWa',
    ],
  });

  useEffect(() => {
    if (
      !isInitialized.current ||
      !rentalScheduleData?.rows?.length ||
      !appointment?.appointmentDateTime ||
      !propertyData
    ) {
      return;
    }
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchedCalcInputs,
    propertyData?.totalBuildingPriceBeforeDepreciation,
    propertyData?.totalLandAreaInSqWa,
    rentalScheduleData,
    appointment?.appointmentDateTime,
  ]);

  useEffect(() => {
    onCalculationMethodDirty(isDirty);
  }, [isDirty, onCalculationMethodDirty]);

  // Stable ref for getValues — avoids re-creating callbacks on every render (C3 fix)
  const getValuesRef = useRef(getValues);
  getValuesRef.current = getValues;

  const handleGenerate = useCallback(
    (overrideValues?: LeaseholdFormType) => {
      const data = overrideValues ?? getValuesRef.current();

      // Compute appraisal schedule to get years and rental income per period
      const appraisalDateStr = appointment?.appointmentDateTime;
      const contractRows = rentalScheduleData?.rows ?? [];
      const { rows: appraisalRows } = appraisalDateStr
        ? computeAppraisalSchedule(contractRows, appraisalDateStr)
        : { rows: [] };

      // Don't overwrite existing table if data isn't ready yet
      if (appraisalRows.length === 0) return;

      // Use appraisal schedule years and rental amounts
      const years = appraisalRows.map(r => r.year);
      const rentalIncomePerPeriod = appraisalRows.map(r => r.totalAmount);

      // Land base value = pricePerSqWa × totalLandArea
      const baseLandValue =
        (data.landValuePerSqWa ?? 0) *
        (isPartialUsage ? (totalLeaseLandArea ?? 0) : (propertyData?.totalLandAreaInSqWa ?? 0));

      const result = generateLeaseholdTable({
        years,
        landValueConfig: {
          baseValue: baseLandValue,
          growthType: data.landGrowthRateType ?? 'Frequency',
          growthRatePercent: data.landGrowthRatePercent ?? 0,
          intervalYears: data.landGrowthIntervalYears ?? 1,
          periods: data.landGrowthPeriods ?? [],
        },
        initialBuildingValue:
          propertyData?.totalBuildingPriceBeforeDepreciation ?? data.initialBuildingValue ?? 0,
        constructionCostIndex: data.constructionCostIndex ?? 0,
        depreciationRate: data.depreciationRate ?? 0,
        depreciationIntervalYears: data.depreciationIntervalYears ?? 1,
        buildingCalcStartYear: data.buildingCalcStartYear ?? 0,
        discountRate: data.discountRate ?? 0,
        rentalIncomePerPeriod,
      });

      tableResultRef.current = result;
      setTableResult(result);

      // Auto-update estimate price with new computed value
      const gv = getValuesRef.current;
      const currentPartial = gv('isPartialUsage')
        ? calculatePartialUsage({
            finalValue: result.finalValueRounded,
            rai: (gv('partialRai') as number) ?? 0,
            ngan: (gv('partialNgan') as number) ?? 0,
            wa: (gv('partialWa') as number) ?? 0,
            pricePerSqWa: (gv('pricePerSqWa') as number) ?? 0,
          })
        : null;
      const newEstimate = currentPartial?.estimatePriceRounded ?? result.finalValueRounded;

      setValue('estimatePriceRounded', newEstimate);
    },
    [appointment, rentalScheduleData, propertyData, setValue, totalLeaseLandArea, isPartialUsage],
  );

  // Local state: caches the analysis id obtained by an auto-save on button open,
  // so the WQS button is available even before the user has saved the form.
  const [ensuredId, setEnsuredId] = useState<string | undefined>(undefined);

  // `silent` mode persists (to obtain an analysis id) without the user-facing
  // "saved" toast or onCalculationSave side-effect — used by ensureAnalysisId
  // when opening the in-field market-reference control.
  const persistAnalysis = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (readOnly || !pricingAnalysisId || !methodId) return;

    const data = getValues();
    const request: SaveLeaseholdAnalysisRequest = {
      landValuePerSqWa: data.landValuePerSqWa,
      landGrowthRateType: data.landGrowthRateType,
      landGrowthRatePercent: data.landGrowthRatePercent,
      landGrowthIntervalYears: data.landGrowthIntervalYears,
      constructionCostIndex: data.constructionCostIndex,
      initialBuildingValue:
        propertyData?.totalBuildingPriceBeforeDepreciation ?? data.initialBuildingValue,
      depreciationRate: data.depreciationRate,
      depreciationIntervalYears: data.depreciationIntervalYears,
      buildingCalcStartYear: data.buildingCalcStartYear,
      discountRate: data.discountRate,
      landGrowthPeriods: (data.landGrowthPeriods ?? []).map(p => ({
        fromYear: p.fromYear,
        toYear: p.toYear,
        growthRatePercent: p.growthRatePercent,
      })),
      isPartialUsage: data.isPartialUsage,
      partialRai: data.partialRai,
      partialNgan: data.partialNgan,
      partialWa: data.partialWa,
      pricePerSqWa: data.pricePerSqWa,
      estimatePriceRounded: data.estimatePriceRounded,
      indicatedValue: data.indicatedValue,
      remark: data.remark,
    };

    try {
      const result = await saveMutation.mutateAsync({
        pricingAnalysisId,
        methodId,
        request,
      });

      if (!silent && activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue: data.indicatedValue ?? data.estimatePriceRounded ?? result.finalValueRounded,
        });
      }
      if (!silent) toast.success(t('toasts.saved'));
    } catch {
      // Surface failures even in silent mode so the user isn't left guessing.
      toast.error(t('toasts.saveFailed'));
    }
  };

  const handleOnSubmit = () => persistAnalysis();

  const ensureAnalysisId = async (): Promise<string | undefined> => {
    if (savedData?.analysis?.id) return savedData.analysis.id;
    if (readOnly || !pricingAnalysisId || !methodId) return undefined;
    await persistAnalysis({ silent: true });
    const res = await refetchSavedData();
    return res.data?.analysis?.id;
  };

  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    if (!pricingAnalysisId || !methodId) return;
    try {
      await resetMutation.mutateAsync({ pricingAnalysisId, methodId });
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.leaseholdAnalysis(pricingAnalysisId, methodId),
      });
      isInitialized.current = false;
      tableResultRef.current = null;
      initializeLeaseholdForm(null, null, reset);
      setTableResult(null);
      toast.success(t('toasts.resetSuccess'));
    } catch {
      toast.error(t('toasts.failedReset'));
    }
  };

  // Inline land value controls
  const landGrowthRateType = useWatch({ control, name: 'landGrowthRateType' });
  const { field: landValueField } = useController({ control, name: 'landValuePerSqWa' });
  const { field: landGrowthPercentField } = useController({
    control,
    name: 'landGrowthRatePercent',
  });
  const { field: landIntervalField } = useController({ control, name: 'landGrowthIntervalYears' });

  const {
    fields: landPeriodFields,
    append: appendLandPeriod,
    remove: removeLandPeriod,
  } = useFieldArray({
    control: control as any,
    name: 'landGrowthPeriods',
  });

  // Auto-recalculate when inline table inputs change (C2 fix: stable deps via ref comparison)
  const watchedLandInputs = useWatch({
    control,
    name: [
      'landValuePerSqWa',
      'landGrowthRateType',
      'landGrowthRatePercent',
      'landGrowthIntervalYears',
    ],
  });
  const watchedLandPeriods = useWatch({ control, name: 'landGrowthPeriods' });
  const watchedTableInputs = useWatch({
    control,
    name: [
      'constructionCostIndex',
      'depreciationRate',
      'depreciationIntervalYears',
      'discountRate',
      'buildingCalcStartYear',
    ],
  });
  const watchedPartialUsage = useWatch({
    control,
    name: ['isPartialUsage', 'partialRai', 'partialNgan', 'partialWa'],
  });
  const prevWatchKey = useRef<string | null>(null);
  useEffect(() => {
    const key =
      watchedTableInputs.join(',') +
      '|' +
      watchedLandInputs.join(',') +
      '|' +
      watchedPartialUsage.join(',') +
      '|' +
      JSON.stringify(watchedLandPeriods);
    // Seed the key on first run so we don't fire on mount/cache reload
    if (prevWatchKey.current === null) {
      prevWatchKey.current = key;
      return;
    }
    if (!isDirty) return;
    if (key === prevWatchKey.current) return;
    prevWatchKey.current = key;
    if (tableResult) handleGenerate();
  }, [
    isDirty,
    watchedTableInputs,
    watchedLandInputs,
    watchedLandPeriods,
    watchedPartialUsage,
    tableResult,
    handleGenerate,
  ]);

  const finalValueRounded = tableResult?.finalValueRounded ?? 0;

  // Appraisal Price — the appraiser's override. `estimatePriceRounded` (watched below)
  // is the system-computed figure only; it's freely overwritten by handleGenerate and
  // no longer the override channel, so editing other fields can't clobber this one.
  const { field: indicatedValueField } = useController({ control, name: 'indicatedValue' });
  const estimatePriceRoundedWatched = useWatch({ control, name: 'estimatePriceRounded' });

  if (isLoading) {
    return <PanelSkeleton />;
  }

  if (isSavedDataError || isPropertyDetailError || isRentalScheduleError || isLeaseAgreementError) {
    const handleRetry = () => {
      if (isSavedDataError) refetchSavedData();
      if (isPropertyDetailError) refetchPropertyDetail();
      if (isRentalScheduleError) refetchRentalSchedule();
      if (isLeaseAgreementError) refetchLeaseAgreement();
    };
    return <DataErrorState title={t('toasts.loadLeaseholdFailed')} onRetry={handleRetry} />;
  }

  return (
    <FormProvider methods={methods} schema={leaseholdSchema}>
      <MethodTopBarPortal>
        <div className="flex flex-col items-end leading-tight shrink-0 px-1">
          <span className="text-[10px] text-gray-400">{t('finalValue.indicatedValue')}</span>
          <span className="text-sm font-semibold text-primary tabular-nums">
            {fmt(indicatedValueField.value ?? estimatePriceRoundedWatched ?? finalValueRounded ?? 0)}
          </span>
        </div>
        {!readOnly && (
          <>
            <span className="w-px h-5 bg-gray-200 shrink-0" />
            <Button
              variant="ghost"
              type="button"
              onClick={onCancelCalculationMethod}
              disabled={saveMutation.isPending}
              className="h-[28px]! px-[12px]! py-0! text-[12.5px]! rounded-[7px]!"
            >
              {t('footer.cancel')}
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={handleOnReset}
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
              id: 'table',
              label: t('leasehold.tabs.table'),
              // mock:3502 — the KPI figures live in the tab strip's toolbar, not above
              // the table. See CostBuildingPanel.tsx's identical `tools` usage.
              tools: tableResult ? (
                <KpiSummaryStrip
                  variant="flat"
                  cards={
                    [
                      {
                        label: t('leasehold.totalIncome'),
                        value: tableResult.totalIncomeOverLeaseTerm,
                        secondary: true,
                      },
                      {
                        label: t('leasehold.valueAtExpiry'),
                        value: tableResult.valueAtLeaseExpiry,
                        secondary: true,
                      },
                      {
                        label: t('leasehold.finalValue'),
                        value: tableResult.finalValueRounded,
                        primary: true,
                      },
                    ] satisfies KpiCard[]
                  }
                />
              ) : undefined,
              // mock:3504-3505 — the rail/chart toggles sit after the (absent, for this
              // method) column-nav chips, at the end of the toolbar.
              toolsAfterNav: (
                <>
                  <MethodToolbarToggle
                    label={t('methodTabs.toggleContractInfo')}
                    pressed={showRail}
                    onClick={() => setShowRail(v => !v)}
                  />
                  <MethodToolbarToggle
                    label={t('methodTabs.toggleChart')}
                    pressed={showChart}
                    onClick={() => setShowChart(v => !v)}
                  />
                </>
              ),
              content: (
                <DenseProvider value={true}>
                  <MethodWorkArea
                    showRail={showRail}
                    rail={
                      <>
                        <MethodRailLeaseHeader
                          appraisalDate={appointment?.appointmentDateTime}
                          leaseStartDate={leaseAgreement?.leaseStartDate}
                          leaseEndDate={leaseAgreement?.leaseEndDate}
                          onViewRentalInfo={() => setIsRentalInfoModalOpen(true)}
                        />
                        <MethodRailSectionTitle>{t('leasehold.landSectionTitle')}</MethodRailSectionTitle>
                        <MethodRailField label={t('leasehold.landArea')} unit={t('leasehold.units.sqWa')}>
                          <span className="text-xs font-medium text-gray-700 tabular-nums">
                            {(propertyData?.totalLandAreaInSqWa ?? 0).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </MethodRailField>
                        <MethodRailField label={t('leasehold.partialUsage')}>
                          {/* mock sideL('LH') — a checkbox "ใช่", not a ไม่/ใช่ segmented toggle. */}
                          <Checkbox
                            size="sm"
                            className="[&>span>span]:h-[14px] [&>span>span]:w-[14px] [&>span>span]:border"
                            checked={!!isPartialUsage}
                            onChange={checked => {
                              if (readOnly) return;
                              setValue('isPartialUsage', checked, { shouldDirty: true });
                              if (!checked) {
                                setValue('partialRai', null, { shouldDirty: true });
                                setValue('partialNgan', null, { shouldDirty: true });
                                setValue('partialWa', null, { shouldDirty: true });
                              }
                            }}
                            disabled={readOnly}
                          >
                            {t('methodTabs.partialUsage.yes')}
                          </Checkbox>
                        </MethodRailField>
                        {isPartialUsage && (
                          <>
                            <MethodRailField label={t('leasehold.units.rai')}>
                              <NumberInput
                                dense
                                name="partialRai"
                                value={raiCtrl.field.value}
                                onChange={e => raiCtrl.field.onChange(e.target.value ?? 0)}
                                decimalPlaces={0}
                                disabled={readOnly}
                              />
                            </MethodRailField>
                            <MethodRailField label={t('leasehold.units.ngan')}>
                              <NumberInput
                                dense
                                name="partialNgan"
                                value={nganCtrl.field.value}
                                onChange={e => nganCtrl.field.onChange(e.target.value ?? 0)}
                                decimalPlaces={0}
                                disabled={readOnly}
                              />
                            </MethodRailField>
                            <MethodRailField label={t('leasehold.units.sqWaShort')}>
                              <NumberInput
                                dense
                                name="partialWa"
                                value={waCtrl.field.value}
                                onChange={e => waCtrl.field.onChange(e.target.value ?? 0)}
                                decimalPlaces={2}
                                disabled={readOnly}
                              />
                            </MethodRailField>
                            <MethodRailField label={t('leasehold.totalLeaseLandArea')}>
                              <span className="text-xs font-medium text-gray-700 tabular-nums">
                                {(totalLeaseLandArea ?? 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </MethodRailField>
                          </>
                        )}
                        {/* Back on the standard 128px control column: the WQS chip is now
                            an icon-only 17px button (MarketReferenceButton `compact`), not
                            the 48.8px text pill that needed `stacked` + pr-[60px]! to fit.
                            Reservation = NumberInput's rightIcon wrapper pr-3 (9.75px at
                            this repo's 13px root) + button width (17px) = 26.75px, rounded
                            up to pr-[28px]!. Usable digit width: 128 (column) − 5 (dense
                            px-[5px] left) − 28 (right) − 2 (border) = 93px, vs. 61px under
                            the old reservation that already fit "30,000.00". Same numbers
                            as ProfitRentPanel's market-rent field — keep them in sync. */}
                        <MethodRailField
                          label={t('leasehold.landValue')}
                          required
                          unit={t('methodTabs.units.bahtPerSqWa')}
                        >
                          <NumberInput
                            dense
                            name={landValueField.name}
                            ref={landValueField.ref}
                            value={landValueField.value}
                            onChange={e => landValueField.onChange(e.target.value)}
                            onBlur={landValueField.onBlur}
                            decimalPlaces={2}
                            disabled={readOnly}
                            className={!readOnly ? 'pr-[28px]!' : undefined}
                            rightIcon={(() => {
                              if (readOnly) return undefined;
                              const effectiveId = savedData?.analysis?.id ?? ensuredId;
                              return (
                                <MarketReferenceButton
                                  compact
                                  subjectType={PricingAnalysisSubjectType.LeaseholdLandRef}
                                  anchorId={effectiveId ?? ''}
                                  hostMethodId={methodId}
                                  marketSurveys={marketSurveys ?? []}
                                  templateList={templateList}
                                  subjectProperty={propertyDetail as Record<string, unknown> | undefined}
                                  onApplyValue={v => landValueField.onChange(v)}
                                  onBeforeOpen={
                                    effectiveId
                                      ? undefined
                                      : async () => {
                                          const id = await ensureAnalysisId();
                                          if (id) setEnsuredId(id);
                                          if (!id) throw new Error('no-id');
                                        }
                                  }
                                  className="pointer-events-auto shrink-0"
                                />
                              );
                            })()}
                          />
                        </MethodRailField>
                        <MethodRailField label={t('leasehold.totalLandValue')} unit={t('methodTabs.units.baht')}>
                          <span className="text-gray-800 tabular-nums">
                            {(
                              (landValueField.value ?? 0) *
                              (isPartialUsage
                                ? (totalLeaseLandArea ?? 0)
                                : (propertyData?.totalLandAreaInSqWa ?? 0))
                            ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </MethodRailField>

                        <MethodRailSectionTitle>{t('leasehold.landValueGrowthRate')}</MethodRailSectionTitle>
                        <MethodRailSeg
                          options={[
                            { value: 'Frequency', label: t('leasehold.growthTypes.frequency') },
                            { value: 'Period', label: t('leasehold.growthTypes.period') },
                          ]}
                          value={landGrowthRateType === 'Period' ? 'Period' : 'Frequency'}
                          onChange={v => {
                            if (readOnly) return;
                            setValue('landGrowthRateType', v, { shouldDirty: true });
                          }}
                          disabled={readOnly}
                        />
                        {landGrowthRateType === 'Frequency' ? (
                          <>
                            <MethodRailField label={t('leasehold.rate')} unit={t('leasehold.units.percent')}>
                              <NumberInput
                                dense
                                name={landGrowthPercentField.name}
                                ref={landGrowthPercentField.ref}
                                value={landGrowthPercentField.value}
                                onChange={e => landGrowthPercentField.onChange(e.target.value)}
                                onBlur={landGrowthPercentField.onBlur}
                                decimalPlaces={2}
                                disabled={readOnly}
                              />
                            </MethodRailField>
                            <MethodRailField label={t('leasehold.every')} unit={t('leasehold.units.yr')}>
                              <NumberInput
                                dense
                                name={landIntervalField.name}
                                ref={landIntervalField.ref}
                                value={landIntervalField.value}
                                onChange={e => landIntervalField.onChange(e.target.value)}
                                onBlur={landIntervalField.onBlur}
                                decimalPlaces={0}
                                disabled={readOnly}
                              />
                            </MethodRailField>
                          </>
                        ) : (
                          <div className="space-y-1.5 py-1">
                            <MethodRailPeriodHeader />
                            {landPeriodFields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_20px] gap-1 items-center">
                                <NumberInput
                                  dense
                                  value={watch(`landGrowthPeriods.${index}.fromYear` as any) as number}
                                  onChange={e =>
                                    setValue(
                                      `landGrowthPeriods.${index}.fromYear` as any,
                                      e.target.value ?? 0,
                                      { shouldDirty: true },
                                    )
                                  }
                                  decimalPlaces={0}
                                  disabled={readOnly}
                                />
                                <NumberInput
                                  dense
                                  value={watch(`landGrowthPeriods.${index}.toYear` as any) as number}
                                  onChange={e =>
                                    setValue(`landGrowthPeriods.${index}.toYear` as any, e.target.value ?? 0, {
                                      shouldDirty: true,
                                    })
                                  }
                                  decimalPlaces={0}
                                  disabled={readOnly}
                                />
                                <NumberInput
                                  dense
                                  value={watch(`landGrowthPeriods.${index}.growthRatePercent` as any) as number}
                                  onChange={e =>
                                    setValue(
                                      `landGrowthPeriods.${index}.growthRatePercent` as any,
                                      e.target.value ?? 0,
                                      { shouldDirty: true },
                                    )
                                  }
                                  decimalPlaces={2}
                                  disabled={readOnly}
                                />
                                {!readOnly && (
                                  <button
                                    type="button"
                                    onClick={() => removeLandPeriod(index)}
                                    className="flex items-center justify-center text-red-400 hover:text-red-600"
                                  >
                                    <Icon name="xmark" className="size-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {!readOnly && (
                              <MethodRailAddRow
                                label={t('leasehold.addPeriods')}
                                onClick={() =>
                                  appendLandPeriod({ fromYear: 0, toYear: 0, growthRatePercent: 0 })
                                }
                              />
                            )}
                          </div>
                        )}

                        <MethodRailSectionTitle>{t('leasehold.buildingSectionTitle')}</MethodRailSectionTitle>
                        <MethodRailField label={t('leasehold.constructionCostIndex')}>
                          <RHFInputCell
                            fieldName="constructionCostIndex"
                            inputType="number"
                            number={{ decimalPlaces: 2 }}
                            disabled={readOnly}
                          />
                        </MethodRailField>
                        <MethodRailField label={t('leasehold.buildingCalcStart')}>
                          <RHFInputCell
                            fieldName="buildingCalcStartYear"
                            inputType="number"
                            number={{ decimalPlaces: 0 }}
                            disabled={readOnly}
                          />
                        </MethodRailField>
                        <MethodRailField
                          label={t('leasehold.depreciationRate')}
                          unit={t('leasehold.units.percent')}
                        >
                          <RHFInputCell
                            fieldName="depreciationRate"
                            inputType="number"
                            number={{ decimalPlaces: 2 }}
                            disabled={readOnly}
                          />
                        </MethodRailField>
                        <MethodRailField
                          label={t('leasehold.every')}
                          unit={t('leasehold.units.yr')}
                        >
                          <RHFInputCell
                            fieldName="depreciationIntervalYears"
                            inputType="number"
                            number={{ decimalPlaces: 0 }}
                            disabled={readOnly}
                          />
                        </MethodRailField>

                        <MethodRailSectionTitle>{t('leasehold.discountSectionTitle')}</MethodRailSectionTitle>
                        <MethodRailField
                          label={t('leasehold.discountedRate')}
                          unit={t('leasehold.units.percent')}
                        >
                          <RHFInputCell
                            fieldName="discountRate"
                            inputType="number"
                            number={{ decimalPlaces: 2 }}
                            disabled={readOnly}
                          />
                        </MethodRailField>
                      </>
                    }
                  >
                    {/* Chart — mock:2506-2515 nests it in the `.chart` card, toggled by the
                        "กราฟ" button, shown above the table. Sensitivity strip removed for
                        now (rendered wrong — see PR notes); toggle still reveals the chart. */}
                    {showChart && tableResult && (
                      <div className="flex flex-col gap-4 shrink-0">
                        <LeaseholdChart result={tableResult} />
                      </div>
                    )}

                    {/* Table */}
                    {tableResult ? (
                      <LeaseholdTable
                        result={tableResult}
                        appraisalDate={appointment?.appointmentDateTime}
                        className="flex-1 min-h-0"
                      />
                    ) : isLoading ? (
                      <TableSkeleton />
                    ) : null}
                  </MethodWorkArea>
                </DenseProvider>
              ),
            },
            {
              id: 'summary',
              label: t('leasehold.tabs.summary'),
              content: (
                <>
                  {/* mock:2530 `kv()` — value card + notes card, side by side. */}
                  <SummaryGrid>
                    <SummaryCard title={t('costMachine.summary.title')}>
                      <DisplayValueRow
                        label={t('leasehold.table.totalIncomeOverLeaseTerm')}
                        value={tableResult?.totalIncomeOverLeaseTerm ?? 0}
                      />
                      <DisplayValueRow
                        label={t('leasehold.table.valueAtLeaseExpiry')}
                        value={tableResult?.valueAtLeaseExpiry ?? 0}
                      />
                      <DisplayValueRow
                        label={t('leasehold.table.finalValuePv')}
                        value={tableResult?.finalValue ?? 0}
                      />
                      {/* Partial usage — its three rows (estimate → + uncovered land → = total)
                          render inside this card (mock:2838-2840); the component still owns
                          the calculation and feeds estimatePriceRounded via onEstimateChange. */}
                      {isPartialUsage && (
                        <LeaseholdPartialUsageSection
                          finalValueRounded={finalValueRounded}
                          landValuePerSqWa={getValues('landValuePerSqWa') ?? 0}
                          totalLeaseLandArea={totalLeaseLandArea}
                          totalLandArea={propertyData?.totalLandAreaInSqWa ?? 0}
                          onEstimateChange={(estimateRounded, estimateNet) => {
                            setValue('estimatePriceRounded', estimateRounded);
                            setEstimateNetPrice(estimateNet);
                          }}
                        />
                      )}
                      <IndicatedValueRow
                        label={
                          <span className="font-semibold text-[#0f766e]">
                            {t('costMachine.summary.indicatedValueLabel')}{' '}
                            {/* The *SubLabel key is the English gloss, deliberately empty in
                                en/zh so it does not repeat the label it sits next to. */}
                            <span className="text-[10.5px] text-gray-400 font-normal">
                              {t('finalValue.indicatedValueSubLabel')}
                            </span>
                          </span>
                        }
                        // Raw (pre-rounding) upstream — the partial-usage net price when that
                        // section is active, else the raw PV sum. Same source the old badge
                        // above this row read via `roundToThousand(estimateNetPrice ?? finalValueRounded)`.
                        computedValue={estimateNetPrice ?? tableResult?.finalValue ?? 0}
                        value={
                          indicatedValueField.value ?? estimatePriceRoundedWatched ?? finalValueRounded ?? 0
                        }
                        onChange={v => indicatedValueField.onChange(v)}
                        disabled={readOnly}
                      />
                    </SummaryCard>
                    <SummaryNotesCard
                      value={watch('remark') ?? ''}
                      onChange={v => setValue('remark', v || null, { shouldDirty: true })}
                      disabled={readOnly}
                    />
                  </SummaryGrid>
                </>
              ),
            },
          ]}
        />

        {/* Dialogs */}
        <ConfirmDialog
          isOpen={isShowResetDialog}
          onClose={() => setIsShowResetDialog(false)}
          onConfirm={handleOnConfirmReset}
          message={t('confirm.resetMethod')}
        />

        <LeaseholdRentalInfoModal
          isOpen={isRentalInfoModalOpen}
          onClose={() => setIsRentalInfoModalOpen(false)}
          contractSchedule={rentalScheduleData?.rows ?? []}
          appraisalDate={appointment?.appointmentDateTime ?? undefined}
        />
      </form>
    </FormProvider>
  );
}

/** Full panel skeleton — shown while initial data loads */
function PanelSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-lg bg-gray-200" />
        <div className="bg-gray-200 rounded h-5 w-32" />
      </div>

      {/* Info cards */}
      <div className="rounded-lg border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-md bg-gray-100 px-3 py-2.5 h-14">
              <div className="bg-gray-200 rounded h-2.5 w-16 mb-2" />
              <div className="bg-gray-200 rounded h-3.5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Land Value & Growth Config */}
      <div className="rounded-lg border border-gray-200 p-5 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md bg-gray-100 px-4 py-3 h-16">
              <div className="bg-gray-200 rounded h-2.5 w-20 mb-2" />
              <div className="bg-gray-200 rounded h-5 w-28" />
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200" />
        <div className="space-y-3">
          <div className="bg-gray-200 rounded h-3.5 w-40" />
          <div className="flex gap-2">
            <div className="bg-gray-200 rounded-full h-7 w-20" />
            <div className="bg-gray-200 rounded-full h-7 w-16" />
          </div>
        </div>
        <div className="border-t border-gray-200" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-md bg-gray-100 px-3 py-2 h-14">
              <div className="bg-gray-200 rounded h-2.5 w-20 mb-2" />
              <div className="bg-gray-200 rounded h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <TableSkeleton />

      {/* Estimate Price */}
      <div className="border-t border-gray-200 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="bg-gray-200 rounded h-3 w-32" />
          <div className="bg-gray-200 rounded h-3 w-24" />
        </div>
        <div className="flex items-center justify-between">
          <div className="bg-gray-200 rounded h-4 w-28" />
          <div className="bg-gray-100 rounded h-9 w-40" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton loader for the leasehold table */
function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-0 border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-100 h-9 flex items-center px-3">
        <div className="bg-gray-300 rounded h-3 w-16" />
        <div className="flex gap-6 ml-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-300 rounded h-3 w-12" />
          ))}
        </div>
      </div>
      {/* Rows */}
      {Array.from({ length: 8 }).map((_, row) => (
        <div key={row} className="h-8 flex items-center px-3 border-t border-gray-100">
          <div className="bg-gray-200 rounded h-3 w-32" />
          <div className="flex gap-6 ml-auto">
            {Array.from({ length: 5 }).map((_, col) => (
              <div key={col} className="bg-gray-200 rounded h-3 w-16" />
            ))}
          </div>
        </div>
      ))}
      {/* Footer */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={`h-9 flex items-center px-3 border-t border-gray-200 ${i >= 2 ? 'bg-green-50' : 'bg-gray-50'}`}
        >
          <div className="bg-gray-300 rounded h-3 w-40" />
          <div className="ml-auto bg-gray-300 rounded h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
