import { zodResolver } from '@hookform/resolvers/zod';
import { useGroupBuildingCostMethod } from './BuildingCostLink';
import { useController, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { MethodTopBarPortal } from './MethodTopBarPortal';
import { MethodTabs } from './MethodTabs';
import {
  profitRentFormDefaults,
  ProfitRentFormSchema,
  type ProfitRentFormType,
} from '../schemas/profitRentForm';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, Icon } from '@/shared/components';
import { NumberInput } from '@/shared/components/inputs';
import { initializeProfitRentForm } from '../adapters/initializeProfitRentForm';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGetProfitRentAnalysis, useResetMethod, useSaveProfitRentAnalysis } from '../api';
import { pricingAnalysisKeys } from '../api/queryKeys';
import type { SaveProfitRentAnalysisRequest } from '../types/profitRent';
import { useGetLeaseAgreement, useGetRentalSchedule } from '@/features/appraisal/api/property';
import { typeToDetailEndpoint } from '@/features/appraisal/utils/propertyTypeConfig';
import axios from '@shared/api/axiosInstance';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useGetAppointment } from '@/features/appraisal/api/appointment';
import toast from 'react-hot-toast';
import { LeaseholdRentalInfoModal } from './LeaseholdRentalInfoModal';
import { type KpiCard, KpiSummaryStrip } from './KpiSummaryStrip';
import { ProfitRentChart } from './ProfitRentChart';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import { KvRow } from './KvRow';
import {
  SummaryGrid,
  SummaryCard,
  DisplayValueRow,
  IndicatedValueRow,
  SummaryNotesCard,
} from './SummaryValueCard';
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
  computeProfitRentSchedule,
  generateProfitRentTable,
  type ProfitRentTableResult,
} from '../domain/calculateProfitRent';
import { fmt, formatDateOnly, toNum } from '../domain/formatters';
import { buildingFinalCostValue, roundToThousand } from '../domain/calculation';
import DataErrorState from '@/shared/components/DataErrorState';
import { MarketReferenceButton } from './MarketReferenceButton';
import { PricingAnalysisSubjectType } from '../api/references';
import type { MarketComparableDetailType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';

interface ProfitRentPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  propertiesMap?: Record<string, Record<string, unknown>>;
  firstPropertyId?: string;
  firstPropertyType?: string;
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

export function ProfitRentPanel({
  activeMethod,
  propertiesMap,
  firstPropertyId,
  firstPropertyType,
  marketSurveys,
  templateList,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: ProfitRentPanelProps) {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('pricingAnalysis');
  // Stable id so the top-bar Save button (portaled outside this <form> via
  // MethodTopBarPortal) still submits it natively — see LeaseholdPanel.tsx for why.
  const formId = 'profit-rent-panel-form';
  const appraisalId = useAppraisalId();
  const { data: appointment } = useGetAppointment(appraisalId ?? '');
  const { pricingAnalysisId, methodId } = activeMethod ?? {};
  const queryClient = useQueryClient();
  const [isShowResetDialog, setIsShowResetDialog] = useState(false);
  const [isRentalInfoModalOpen, setIsRentalInfoModalOpen] = useState(false);
  const [tableResult, setTableResult] = useState<ProfitRentTableResult | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  // mock:1284 `sideL: true, chart: false` — the input rail defaults open, the chart
  // defaults closed; both toggled from the tab toolbar (mock:3504-3505).
  const [showRail, setShowRail] = useState(true);
  const [showChart, setShowChart] = useState(false);
  // Local state: caches the analysis id obtained by an auto-save on button open,
  // so the WQS button is available even before the user has saved the form.
  const [ensuredId, setEnsuredId] = useState<string | undefined>(undefined);

  const resetMutation = useResetMethod();
  const saveMutation = useSaveProfitRentAnalysis();

  const {
    data: savedData,
    isPending: isLoading,
    isError: isSavedDataError,
    refetch: refetchSavedData,
  } = useGetProfitRentAnalysis(pricingAnalysisId, methodId);

  // Fetch property detail for land area
  const detailEndpoint = firstPropertyType ? typeToDetailEndpoint[firstPropertyType] : undefined;
  const { data: propertyDetail } = useQuery({
    queryKey: ['appraisal', appraisalId, 'property', firstPropertyId, 'detail-pr'],
    queryFn: async () => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${firstPropertyId}/${detailEndpoint}`,
      );
      return data as Record<string, any>;
    },
    enabled: !!appraisalId && !!firstPropertyId && !!detailEndpoint,
    staleTime: Infinity,
  });

  const landAreaSqWa = useMemo(() => {
    // Net area — title area less the deductions the appraiser listed (encroachment, land used by
    // others, public waterway). Pricing values the appraisable area, not the registered one; the
    // deed's own figure stays on the property form and in the book's per-title rows.
    // `!= null` rather than a truthiness check: a fully deducted plot is a real 0, not a blank.
    return (
      (propertyDetail?.netLandAreaInSqWa != null
        ? Number(propertyDetail.netLandAreaInSqWa)
        : Number(propertyDetail?.totalLandAreaInSqWa)) || 0
    );
  }, [propertyDetail]);

  // Fetch rental schedule and lease agreement
  const { data: rentalScheduleData } = useGetRentalSchedule(appraisalId ?? '', firstPropertyId);
  const { data: leaseAgreement } = useGetLeaseAgreement(appraisalId ?? '', firstPropertyId);

  const methods = useForm<ProfitRentFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(ProfitRentFormSchema) as any,
    defaultValues: profitRentFormDefaults,
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

  const growthRateType = watch('growthRateType');

  const {
    fields: growthPeriodFields,
    append: appendPeriod,
    remove: removePeriod,
  } = useFieldArray({
    control,
    name: 'growthPeriods' as any,
  });

  // useController for NumberInput fields
  const { field: marketFeeField } = useController({ control, name: 'marketRentalFeePerSqWa' });
  const { field: growthPercentField } = useController({ control, name: 'growthRatePercent' });
  const { field: intervalField } = useController({ control, name: 'growthIntervalYears' });
  // Appraisal Price — the appraiser's override. `estimatePriceRounded` and
  // `appraisalPriceWithBuildingRounded` are system-computed only; they're freely
  // overwritten by handleGenerate/the building-cost effect below, so editing other
  // fields can no longer clobber this one.
  const { field: indicatedValueField } = useController({ control, name: 'indicatedValue' });

  // Initialize form on data load
  const isInitialized = useRef(false);
  const tableResultRef = useRef<ProfitRentTableResult | null>(null);
  useEffect(() => {
    if (savedData !== undefined && !isInitialized.current) {
      isInitialized.current = true;
      initializeProfitRentForm(savedData?.analysis, savedData?.remark, reset);

      if (savedData?.analysis?.calculationDetails?.length) {
        const details = savedData.analysis.calculationDetails;
        const result: ProfitRentTableResult = {
          rows: details.map(d => ({
            year: d.year,
            numberOfMonths: d.numberOfMonths,
            contractStart: '',
            contractEnd: '',
            marketRentalFeePerSqWa: d.marketRentalFeePerSqWa,
            marketRentalFeeGrowthPercent: d.marketRentalFeeGrowthPercent,
            marketRentalFeePerMonth: d.marketRentalFeePerMonth,
            marketRentalFeePerYear: d.marketRentalFeePerYear,
            contractRentalFeePerYear: d.contractRentalFeePerYear,
            returnsFromLease: d.returnsFromLease,
            pvFactor: d.pvFactor,
            presentValue: d.presentValue,
          })),
          totalMarketRentalFee: savedData.analysis.totalMarketRentalFee,
          totalContractRentalFee: savedData.analysis.totalContractRentalFee,
          totalReturnsFromLease: savedData.analysis.totalReturnsFromLease,
          totalPresentValue: savedData.analysis.totalPresentValue,
          // The API keeps one figure now; the local calc type still names it "rounded".
          finalValueRounded: savedData.analysis.finalValue,
        };
        tableResultRef.current = result;
        setTableResult(result);
      }
    }
  }, [savedData, reset]);

  useEffect(() => {
    onCalculationMethodDirty(isDirty);
  }, [isDirty, onCalculationMethodDirty]);

  // Stable ref for getValues — avoids re-creating callbacks on every render
  const getValuesRef = useRef(getValues);
  getValuesRef.current = getValues;

  const handleGenerate = useCallback(() => {
    const data = getValuesRef.current();
    const appraisalDateStr = appointment?.appointmentDateTime;
    const contractRows = rentalScheduleData?.rows ?? [];

    const appraisalSchedule = appraisalDateStr
      ? computeProfitRentSchedule(contractRows, appraisalDateStr)
      : [];

    if (appraisalSchedule.length === 0) return;

    const result = generateProfitRentTable({
      appraisalSchedule,
      landAreaSqWa,
      marketRentalFeePerSqWa: data.marketRentalFeePerSqWa ?? 0,
      growthRateType: data.growthRateType ?? 'Frequency',
      growthRatePercent: data.growthRatePercent ?? 0,
      growthIntervalYears: data.growthIntervalYears ?? 1,
      growthPeriods: (data.growthPeriods ?? []) as any,
      discountRate: data.discountRate ?? 0,
    });

    setTableResult(result);
    tableResultRef.current = result;
    setValue('estimatePriceRounded', result.finalValueRounded);
  }, [appointment, rentalScheduleData, landAreaSqWa, setValue]);

  // Recalculate table once rental schedule is available (fixes dates, numberOfMonths, etc.)
  const hasRecalculated = useRef(false);
  useEffect(() => {
    if (hasRecalculated.current) return;
    if (!tableResult || !rentalScheduleData?.rows?.length || !appointment?.appointmentDateTime)
      return;
    if (tableResult.rows[0]?.contractStart) return;
    hasRecalculated.current = true;
    handleGenerate();
  }, [tableResult, rentalScheduleData, appointment, handleGenerate]);

  // Auto-generate on first visit when no saved data but all dependencies are ready
  const hasAutoGenerated = useRef(false);
  useEffect(() => {
    if (
      !hasAutoGenerated.current &&
      isInitialized.current &&
      !tableResultRef.current &&
      rentalScheduleData?.rows?.length &&
      appointment?.appointmentDateTime &&
      landAreaSqWa > 0
    ) {
      hasAutoGenerated.current = true;
      handleGenerate();
    }
  }, [rentalScheduleData, appointment, landAreaSqWa, tableResult, handleGenerate, setValue]);

  // Auto-recalculate when inline inputs change
  const watchedInputs = useWatch({
    control,
    name: [
      'marketRentalFeePerSqWa',
      'growthRateType',
      'growthRatePercent',
      'growthIntervalYears',
      'discountRate',
    ],
  });
  const watchedGrowthPeriods = useWatch({ control, name: 'growthPeriods' });
  const prevWatchKey = useRef<string | null>(null);
  useEffect(() => {
    const key = watchedInputs.join(',') + '|' + JSON.stringify(watchedGrowthPeriods);
    if (prevWatchKey.current === null) {
      prevWatchKey.current = key;
      return;
    }
    if (!isDirty) return;
    if (key === prevWatchKey.current) return;
    prevWatchKey.current = key;
    if (tableResult) handleGenerate();
  }, [isDirty, watchedInputs, watchedGrowthPeriods, tableResult, handleGenerate]);

  // `silent` mode persists (to obtain an analysis id) without the user-facing
  // "saved" toast or onCalculationSave side-effect — used by ensureAnalysisId
  // when opening the in-field market-reference control.
  const persistAnalysis = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (readOnly || !pricingAnalysisId || !methodId) return;

    const data = getValues();
    const request: SaveProfitRentAnalysisRequest = {
      marketRentalFeePerSqWa: data.marketRentalFeePerSqWa,
      growthRateType: data.growthRateType as 'Frequency' | 'Period',
      growthRatePercent: data.growthRatePercent,
      growthIntervalYears: data.growthIntervalYears,
      discountRate: data.discountRate,
      includeBuildingCost: data.includeBuildingCost,
      growthPeriods: ((data.growthPeriods ?? []) as any[]).map((p: any) => ({
        fromYear: p.fromYear,
        toYear: p.toYear,
        growthRatePercent: p.growthRatePercent,
      })),
      estimatePriceRounded: data.estimatePriceRounded,
      indicatedValue: data.indicatedValue,
      remark: data.remark,
      appraisalPriceWithBuildingRounded: data.includeBuildingCost
        ? data.appraisalPriceWithBuildingRounded
        : null,
    };

    try {
      const result = await saveMutation.mutateAsync({
        pricingAnalysisId,
        methodId,
        request,
      });

      // Hydrate form with backend-computed building cost values
      if (result.totalBuildingCost != null) {
        setValue('totalBuildingCost', result.totalBuildingCost, { shouldDirty: false });
        setValue('appraisalPriceWithBuilding', result.appraisalPriceWithBuilding, {
          shouldDirty: false,
        });
        setValue('appraisalPriceWithBuildingRounded', result.appraisalPriceWithBuildingRounded, {
          shouldDirty: false,
        });
      }

      // The appraiser's override always wins; otherwise propagate the building-inclusive
      // price when building cost is included, else the plain PV estimate.
      const computedValue =
        data.includeBuildingCost && result.appraisalPriceWithBuildingRounded
          ? result.appraisalPriceWithBuildingRounded
          : (data.estimatePriceRounded ?? result.finalValueRounded);
      const appraisalValue = data.indicatedValue ?? computedValue;

      if (!silent && activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue,
        });
      }
      if (!silent) toast.success(t('toasts.saved'));

      isInitialized.current = false;
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.profitRentAnalysis(pricingAnalysisId, methodId),
      });
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
      setTableResult(null);
      tableResultRef.current = null;
      isInitialized.current = false;
      hasAutoGenerated.current = false;
      prevWatchKey.current = null;
      reset(profitRentFormDefaults);
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.profitRentAnalysis(pricingAnalysisId, methodId),
      });
      toast.success(t('toasts.resetSuccess'));
    } catch {
      toast.error(t('toasts.failedReset'));
    }
  };

  const discountRateValue = watch('discountRate') ?? 0;
  const isBuildingCostIncluded = watch('includeBuildingCost');
  const estimatePrice = watch('estimatePriceRounded');

  // Collect building properties for BuildingCostTable:
  // 1. The primary property (LS/LB) if it has depreciationDetails (already fetched)
  // 2. Any separate building properties (B/LSB) from the group's propertiesMap
  const allGroupProperties = useMemo(() => {
    const items: Record<string, unknown>[] = [];

    // Primary property (already fetched for land area)
    if (propertyDetail?.depreciationDetails) {
      items.push(propertyDetail);
    }

    // Additional properties from the group (separate B/LSB)
    if (propertiesMap) {
      for (const prop of Object.values(propertiesMap)) {
        if (prop.propertyId !== firstPropertyId && prop.depreciationDetails) {
          items.push(prop);
        }
      }
    }

    return items;
  }, [propertyDetail, propertiesMap, firstPropertyId]);

  // The group's building value — the rule BuildingCostLink documents for WQS/SAG/DC and
  // the mock's `o.bld = bcTotOv ?? Σ per-building`: the Building Cost method's SAVED value
  // wins (the appraiser may have keyed it, e.g. 23,000,000 over a 22,785,000 roll-up), else
  // the per-building roll-up Σ(FinalCostValueOverride ?? roundToThousand(after)). This used to
  // be the raw after-depreciation sum, which matched neither. SaveProfitRentAnalysis applies
  // the same rule, so screen and stored value agree.
  const { methodValue: bcMethodValue } = useGroupBuildingCostMethod();
  const buildingRollUp = allGroupProperties.reduce((sum, b) => sum + buildingFinalCostValue(b), 0);
  const buildingValue = bcMethodValue ?? buildingRollUp;
  useEffect(() => {
    if (!isBuildingCostIncluded || !allGroupProperties.length) return;
    setValue('totalBuildingCost', buildingValue, { shouldDirty: false });
  }, [allGroupProperties.length, isBuildingCostIncluded, buildingValue, setValue]);

  // Compute derived building cost fields for preview. Both fields here are
  // system-computed only (the appraiser's override lives in `indicatedValue`), so
  // it's safe to keep them in sync on every change without a dirty-tracking guard.
  const totalBuildingCost = watch('totalBuildingCost') ?? 0;
  useEffect(() => {
    if (!isBuildingCostIncluded || !isInitialized.current) return;
    const est = Number(estimatePrice) || 0;
    const buildingCost = Number(totalBuildingCost) || 0;
    const sum = est + buildingCost;
    setValue('appraisalPriceWithBuilding', sum, { shouldDirty: false });
    setValue('appraisalPriceWithBuildingRounded', roundToThousand(sum), { shouldDirty: false });
  }, [isBuildingCostIncluded, estimatePrice, totalBuildingCost, setValue]);

  if (isLoading) {
    return <PanelSkeleton />;
  }

  if (isSavedDataError) {
    return (
      <DataErrorState title={t('profitRent.loadError')} onRetry={refetchSavedData} />
    );
  }

  return (
    <FormProvider methods={methods as any} schema={ProfitRentFormSchema as any}>
      <MethodTopBarPortal>
        <div className="flex flex-col items-end leading-tight shrink-0 px-1">
          <span className="text-[10px] text-gray-400">{t('finalValue.indicatedValue')}</span>
          <span className="text-sm font-semibold text-primary tabular-nums">
            {fmt(
              indicatedValueField.value ??
                (isBuildingCostIncluded
                  ? watch('appraisalPriceWithBuildingRounded')
                  : estimatePrice) ??
                tableResult?.finalValueRounded ??
                0,
            )}
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
        <div className="flex-1 min-h-0">
          <MethodTabs
            tabs={[
              {
                id: 'table',
                label: t('profitRent.tabs.table'),
                // mock:2444/2709 — the KPI strip belongs in the tab strip's right-hand
                // toolbar, not above the table. Same shape as CostBuildingPanel.tsx:331-377.
                tools: (
                  <KpiSummaryStrip
                    variant="flat"
                    cards={
                      [
                        {
                          label: t('profitRent.kpi.totalMarketRental'),
                          value: tableResult?.totalMarketRentalFee ?? null,
                          secondary: true,
                        },
                        {
                          label: t('profitRent.kpi.totalContractRental'),
                          value: tableResult?.totalContractRentalFee ?? null,
                          secondary: true,
                        },
                        {
                          label: t('profitRent.kpi.totalReturns'),
                          value: tableResult?.totalReturnsFromLease ?? null,
                          secondary: true,
                        },
                        {
                          // The method's own result — never secondary, per
                          // CostBuildingPanel.tsx's split (its own doc comment
                          // 313-333 and KpiSummaryStrip.tsx:27).
                          label: t('profitRent.kpi.presentValue'),
                          value: tableResult?.totalPresentValue ?? null,
                          primary: true,
                        },
                      ] satisfies KpiCard[]
                    }
                  />
                ),
                // mock:3504-3505 — the rail/chart toggles sit after the column-nav chips
                // (portaled in via MethodTabsNavSlotCtx from the table's
                // ScrollableTableContainer below), at the end of the toolbar.
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
                        <MethodRailSectionTitle>{t('profitRent.rentSectionTitle')}</MethodRailSectionTitle>
                        <MethodRailField label={t('profitRent.landArea')} unit={t('profitRent.unitSqWa')}>
                          <span className="text-xs font-medium text-gray-700 tabular-nums">
                            {fmt(landAreaSqWa)}
                          </span>
                        </MethodRailField>
                        {/* Back on the standard 128px control column: the WQS chip is now
                            an icon-only 17px button (MarketReferenceButton `compact`), not
                            the 48.8px text pill that needed `stacked` + pr-[60px]! to fit.
                            Reservation = NumberInput's rightIcon wrapper pr-3 (9.75px at
                            this repo's 13px root) + button width (17px) = 26.75px, rounded
                            up to pr-[28px]!. Usable digit width: 128 (column) − 5 (dense
                            px-[5px] left) − 28 (right) − 2 (border) = 93px, vs. 61px under
                            the old reservation that already fit "30,000.00". Same numbers
                            as LeaseholdPanel's land-value field — keep them in sync. */}
                        <MethodRailField
                          label={t('profitRent.marketRentalFee')}
                          required
                          unit={t('methodTabs.units.bahtPerSqWaMonth')}
                        >
                          <NumberInput
                            dense
                            name={marketFeeField.name}
                            ref={marketFeeField.ref}
                            value={marketFeeField.value}
                            onChange={e => marketFeeField.onChange(e.target.value)}
                            onBlur={marketFeeField.onBlur}
                            decimalPlaces={2}
                            maxIntegerDigits={15}
                            required={true}
                            disabled={readOnly}
                            className={!readOnly ? 'pr-[28px]!' : undefined}
                            rightIcon={(() => {
                              if (readOnly) return undefined;
                              const effectiveId = savedData?.analysis?.id ?? ensuredId;
                              return (
                                <MarketReferenceButton
                                  compact
                                  subjectType={PricingAnalysisSubjectType.ProfitRentRef}
                                  anchorId={effectiveId ?? ''}
                                  hostMethodId={methodId}
                                  marketSurveys={marketSurveys ?? []}
                                  templateList={templateList}
                                  onApplyValue={v => marketFeeField.onChange(v)}
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
                        <MethodRailField
                          label={t('profitRent.monthlyTotal')}
                          unit={t('methodTabs.units.bahtPerMonth')}
                        >
                          <span className="text-gray-800 tabular-nums">
                            {fmt((marketFeeField.value ?? 0) * landAreaSqWa)}
                          </span>
                        </MethodRailField>
                        <MethodRailField label={t('profitRent.discountedRate')} unit="%">
                          <NumberInput
                            dense
                            name="discountRate"
                            value={watch('discountRate')}
                            onChange={e =>
                              setValue('discountRate', e.target.value ?? 0, { shouldDirty: true })
                            }
                            decimalPlaces={2}
                            maxIntegerDigits={3}
                            disabled={readOnly}
                          />
                        </MethodRailField>

                        <MethodRailSectionTitle>
                          {t('profitRent.marketRentalFeeIncrease')}
                        </MethodRailSectionTitle>
                        <MethodRailSeg
                          options={[
                            { value: 'Frequency', label: t('methodTabs.growthTypes.frequency') },
                            { value: 'Period', label: t('methodTabs.growthTypes.period') },
                          ]}
                          value={growthRateType === 'Period' ? 'Period' : 'Frequency'}
                          onChange={v => {
                            if (readOnly) return;
                            setValue('growthRateType', v, { shouldDirty: true });
                          }}
                          disabled={readOnly}
                        />
                        {growthRateType === 'Frequency' ? (
                          <>
                            <MethodRailField label={t('profitRent.rate')} unit="%">
                              <NumberInput
                                dense
                                name={growthPercentField.name}
                                ref={growthPercentField.ref}
                                value={growthPercentField.value}
                                onChange={e => growthPercentField.onChange(e.target.value)}
                                onBlur={growthPercentField.onBlur}
                                decimalPlaces={2}
                                maxIntegerDigits={3}
                                disabled={readOnly}
                              />
                            </MethodRailField>
                            <MethodRailField label={t('profitRent.every')} unit={t('profitRent.unitYear')}>
                              <NumberInput
                                dense
                                name={intervalField.name}
                                ref={intervalField.ref}
                                value={intervalField.value}
                                onChange={e => intervalField.onChange(e.target.value)}
                                onBlur={intervalField.onBlur}
                                decimalPlaces={0}
                                maxIntegerDigits={3}
                                disabled={readOnly}
                              />
                            </MethodRailField>
                          </>
                        ) : (
                          <div className="space-y-1.5 py-1">
                            <MethodRailPeriodHeader />
                            {growthPeriodFields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_20px] gap-1 items-center">
                                <NumberInput
                                  dense
                                  value={watch(`growthPeriods.${index}.fromYear` as any)}
                                  onChange={e =>
                                    setValue(`growthPeriods.${index}.fromYear` as any, e.target.value ?? 0, {
                                      shouldDirty: true,
                                    })
                                  }
                                  maxIntegerDigits={3}
                                  decimalPlaces={0}
                                  disabled={readOnly}
                                />
                                <NumberInput
                                  dense
                                  value={watch(`growthPeriods.${index}.toYear` as any)}
                                  onChange={e =>
                                    setValue(`growthPeriods.${index}.toYear` as any, e.target.value ?? 0, {
                                      shouldDirty: true,
                                    })
                                  }
                                  decimalPlaces={0}
                                  maxIntegerDigits={3}
                                  disabled={readOnly}
                                />
                                <NumberInput
                                  dense
                                  value={watch(`growthPeriods.${index}.growthRatePercent` as any)}
                                  onChange={e =>
                                    setValue(
                                      `growthPeriods.${index}.growthRatePercent` as any,
                                      e.target.value ?? 0,
                                      { shouldDirty: true },
                                    )
                                  }
                                  maxIntegerDigits={3}
                                  decimalPlaces={2}
                                  disabled={readOnly}
                                />
                                {!readOnly && (
                                  <button
                                    type="button"
                                    onClick={() => removePeriod(index)}
                                    className="flex items-center justify-center text-red-400 hover:text-red-600"
                                  >
                                    <Icon name="xmark" className="size-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {!readOnly && (
                              <MethodRailAddRow
                                label={t('profitRent.addPeriods')}
                                onClick={() => appendPeriod({ fromYear: 0, toYear: 0, growthRatePercent: 0 })}
                              />
                            )}
                          </div>
                        )}
                      </>
                    }
                  >
                    {/* Chart — mock:2506-2515 nests it in the `.chart` card, toggled by the
                        "กราฟ" button, shown above the table. Sensitivity strip removed for
                        now (rendered wrong — see PR notes); toggle still reveals the chart. */}
                    {showChart && tableResult && tableResult.rows.length > 0 && (
                      <div className="flex flex-col gap-4 shrink-0">
                        <ProfitRentChart result={tableResult} />
                      </div>
                    )}

                    {/* Calculation Table */}
                    {tableResult && tableResult.rows.length > 0 ? (
                      // No year pager: mock METHODS.PR carries no `nav` (only DCF and LH do).
                      <ScrollableTableContainer
                        edgeShadow
                        stickyWidth={60}
                        className="flex-1 min-h-0"
                      >
                        {/* rounded-none — DaisyUI's `.table` carries its own border-radius; this
                            matches the mock's calc-tab tables (measured 0px everywhere). */}
                        <table className="table min-w-max w-full text-[12px] leading-[25px] tabular-nums rounded-none">
                          <ProfitRentTable
                            tableResult={tableResult}
                            discountRateValue={discountRateValue}
                            hoveredCol={hoveredCol}
                            onColHover={setHoveredCol}
                          />
                        </table>
                      </ScrollableTableContainer>
                    ) : isLoading ? (
                      <TableSkeleton />
                    ) : null}
                  </MethodWorkArea>
                ),
              },
              {
                id: 'summary',
                label: t('profitRent.tabs.summary'),
                content: (
                  <>
                    {/* mock:2530 `kv()` — value card + notes card, side by side. */}
                    <SummaryGrid>
                      <SummaryCard title={t('costMachine.summary.title')}>
                        <DisplayValueRow
                          label={
                            <>
                              {t('profitRent.estimatePriceFromPv')}{' '}
                              <span className="text-gray-400 text-[10.5px]">(PV)</span>
                            </>
                          }
                          value={tableResult?.totalPresentValue ?? 0}
                        />
                        {/* mock:1610-style — checkbox lives in the label cell, its checked
                            state is read back in the value cell instead of the old
                            No/Yes toggle floating above the card. */}
                        <KvRow
                          label={
                            <Checkbox
                              className="[&>span>span]:h-[14px] [&>span>span]:w-[14px] [&>span>span]:border"
                              size="sm"
                              checked={!!isBuildingCostIncluded}
                              onChange={checked => {
                                if (readOnly) return;
                                setValue('includeBuildingCost', checked, { shouldDirty: true });
                              }}
                              disabled={readOnly}
                            >
                              {t('profitRent.includeBuildingCost')}
                            </Checkbox>
                          }
                          value={
                            <span className="text-gray-600">
                              {t(isBuildingCostIncluded ? 'profitRent.included' : 'profitRent.notIncluded')}
                            </span>
                          }
                        />
                        {/* mock:2846-2847 — the building part and the combined figure, so the
                            step from PV to the indicated value is visible. */}
                        {isBuildingCostIncluded && (
                          <>
                            <DisplayValueRow
                              label={
                                <span className="pl-3">
                                  {t('methodTabs.buildingSummary.afterRow', { n: allGroupProperties.length })}
                                </span>
                              }
                              value={buildingValue}
                            />
                            <DisplayValueRow
                              label={t('methodTabs.buildingSummary.withBuilding')}
                              value={Number(watch('appraisalPriceWithBuilding')) || 0}
                            />
                          </>
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
                          // Raw (pre-rounding) upstream: the land+building sum while the
                          // checkbox is ticked, else the raw PV total — same pair the two
                          // deleted diff-badges above each compared their own rounded value
                          // against (`roundToThousand(appraisalPriceWithBuilding)` /
                          // `tableResult.finalValueRounded`, itself `roundToThousand(totalPresentValue)`).
                          computedValue={
                            isBuildingCostIncluded
                              ? Number(watch('appraisalPriceWithBuilding')) || 0
                              : (tableResult?.totalPresentValue ?? 0)
                          }
                          value={
                            indicatedValueField.value ??
                            (isBuildingCostIncluded
                              ? watch('appraisalPriceWithBuildingRounded')
                              : estimatePrice) ??
                            tableResult?.finalValueRounded ??
                            0
                          }
                          onChange={v => indicatedValueField.onChange(v)}
                          disabled={readOnly}
                        />
                      </SummaryCard>
                      {/* mock:2852 — a third card in the same grid (value left, this right,
                          notes below), not a full-width block above it. */}
                      {isBuildingCostIncluded && (
                        <BuildingCostSummaryCard buildingCost={allGroupProperties} />
                      )}
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
        </div>

        {/* Dialogs */}
        <ConfirmDialog
          isOpen={isShowResetDialog}
          onClose={() => setIsShowResetDialog(false)}
          onConfirm={handleOnConfirmReset}
          message={t('profitRent.resetConfirmMessage')}
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

/** Extracted table with column hover highlight */
function ProfitRentTable({
  tableResult,
  discountRateValue,
  hoveredCol,
  onColHover,
}: {
  tableResult: ProfitRentTableResult;
  discountRateValue: number;
  hoveredCol: number | null;
  onColHover: (col: number | null) => void;
}) {
  const { t } = useTranslation('pricingAnalysis');
  const colHl = 'bg-blue-50/60';

  // Sticky columns: only col 0 (Year) is pinned left — mock:2444 (`data-sticky="64"`,
  // one column wide) pins just the year, not Start/End alongside it. It alone carries
  // the scrolled-edge shadow, since it's the only frozen column now.
  const stickyBase = 'sticky left-0 z-10 w-[60px] min-w-[60px] pa-sticky-edge';
  // Start/End (cols 1-2) are dates, not numbers — they keep left alignment even after
  // losing their pin, same as Year; every other column stays right-aligned.
  const leftAlignCols = new Set([0, 1, 2]);

  const headBg = 'bg-gray-50';
  const bodyBg = 'bg-white';
  const totalBg = 'bg-gray-100';
  // Soft, directional divider between every column — see the recipe note on
  // ComparativeFactorTable/WQSScoringSection; never a bare border-[…].
  const divider = 'border-r border-r-[#eef2f2]';

  const thCls = (col: number, extra?: string) => {
    const isSticky = col === 0;
    const alignCls = leftAlignCols.has(col) ? '' : 'text-right';
    // Sticky-left + sticky-top headers need z-30 (above both axes)
    const base = isSticky
      ? `${stickyBase} sticky top-0 z-30 ${headBg} px-[8px] py-0 h-[36px] text-gray-600 font-medium border-b border-gray-200 ${divider}`
      : `sticky top-0 z-20 ${headBg} px-[8px] py-0 h-[36px] ${alignCls} text-gray-600 font-medium border-b border-gray-200 ${divider} ${extra ?? ''}`;
    return `${base} ${hoveredCol === col ? colHl : ''}`;
  };

  const tdCls = (col: number, extra?: string) => {
    const isSticky = col === 0;
    const alignCls = leftAlignCols.has(col) ? '' : 'text-right';
    const base = isSticky
      ? `${stickyBase} ${bodyBg} px-[8px] py-0 h-[26px] text-gray-700 border-b border-gray-100 ${divider}`
      : `px-[8px] py-0 h-[26px] ${alignCls} text-gray-700 border-b border-gray-100 ${divider} ${extra ?? ''}`;
    return `${base} ${hoveredCol === col ? colHl : ''}`;
  };

  const totalTdCls = (col: number, extra?: string) => {
    const base = `px-[8px] py-0 h-[26px] text-right text-gray-800 ${divider} ${extra ?? ''}`;
    return `${base} ${hoveredCol === col ? colHl : ''}`;
  };

  const cellProps = (col: number) => ({
    onMouseEnter: () => onColHover(col),
    onMouseLeave: () => onColHover(null),
  });

  // `sub` — the unit, rendered as a second line under the label (mock:2443 `th2`).
  // Only the rate/amount columns carry one; Year/Start/End/Months/Discount rate
  // stay single-line.
  const headers = [
    { label: t('profitRent.tableHeaders.year'), align: 'text-left' },
    { label: t('profitRent.tableHeaders.periodStart'), align: 'text-left' },
    { label: t('profitRent.tableHeaders.periodEnd'), align: 'text-left' },
    { label: t('profitRent.tableHeaders.numberOfMonth'), minW: 'min-w-[80px]' },
    {
      label: t('profitRent.tableHeaders.marketRentalFeePerSqWaMonth'),
      sub: t('profitRent.unitBahtPerSqWaPerMonth'),
      minW: 'min-w-[130px]',
    },
    {
      label: t('profitRent.tableHeaders.marketRentalFeePerMonth'),
      sub: t('profitRent.unitBahtPerMonth'),
      minW: 'min-w-[120px]',
    },
    {
      label: t('profitRent.tableHeaders.marketRentalFeePerYear'),
      sub: t('profitRent.unitBahtPerYear'),
      minW: 'min-w-[120px]',
    },
    {
      label: t('profitRent.tableHeaders.contractRentalFeePerYear'),
      sub: t('profitRent.unitBahtPerYear'),
      minW: 'min-w-[120px]',
    },
    {
      label: t('profitRent.tableHeaders.returnsFromLease'),
      sub: t('profitRent.unitBaht'),
      minW: 'min-w-[120px]',
    },
    { label: t('profitRent.tableHeaders.discountedRate'), minW: 'min-w-[100px]' },
    {
      label: t('profitRent.tableHeaders.presentValue'),
      sub: t('profitRent.unitBaht'),
      minW: 'min-w-[120px]',
    },
  ];

  return (
    <>
      <thead>
        <tr className="bg-gray-50 h-[36px]">
          {headers.map((h, col) => (
            <th
              key={col}
              data-nav-col={col !== 0 ? true : undefined}
              className={thCls(col, h.minW)}
              {...cellProps(col)}
            >
              {h.label}
              {h.sub && (
                <span className="block text-[10px] text-gray-400 font-normal leading-[12px]">
                  {h.sub}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody onMouseLeave={() => onColHover(null)}>
        {tableResult.rows.map(row => (
          <tr key={row.year} className="hover:bg-gray-50/50">
            <td className={tdCls(0)} {...cellProps(0)}>
              {row.year.toFixed(1)}
            </td>
            <td className={tdCls(1)} {...cellProps(1)}>
              {row.contractStart ? formatDateOnly(row.contractStart) : '-'}
            </td>
            <td className={tdCls(2)} {...cellProps(2)}>
              {row.contractEnd ? formatDateOnly(row.contractEnd) : '-'}
            </td>
            <td className={tdCls(3, headers[3].minW)} {...cellProps(3)}>
              {row.numberOfMonths.toFixed(1)}
            </td>
            <td className={tdCls(4, headers[4].minW)} {...cellProps(4)}>
              <div>{fmt(row.marketRentalFeePerSqWa)}</div>
              {row.marketRentalFeeGrowthPercent > 0 && (
                <div className="text-[9px] text-gray-400">+{row.marketRentalFeeGrowthPercent}%</div>
              )}
            </td>
            <td className={tdCls(5, headers[5].minW)} {...cellProps(5)}>
              {fmt(row.marketRentalFeePerMonth)}
            </td>
            <td className={tdCls(6, headers[6].minW)} {...cellProps(6)}>
              {fmt(row.marketRentalFeePerYear)}
            </td>
            <td className={tdCls(7, headers[7].minW)} {...cellProps(7)}>
              {fmt(row.contractRentalFeePerYear)}
            </td>
            <td className={tdCls(8, headers[8].minW)} {...cellProps(8)}>
              {fmt(row.returnsFromLease)}
            </td>
            <td className={tdCls(9, headers[9].minW)} {...cellProps(9)}>
              {discountRateValue.toFixed(2)} %
            </td>
            <td className={tdCls(10, headers[10].minW)} {...cellProps(10)}>
              {fmt(row.presentValue)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot className="sticky bottom-0 z-20">
        <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300 h-[26px]">
          <td
            className={`sticky left-0 z-30 ${totalBg} px-[8px] py-0 h-[26px] text-gray-800 pa-sticky-edge`}
          >
            {t('profitRent.total')}
          </td>
          {/* Start/End/Months/MarketFee-per-sqwa/MarketFee-per-month — one spanned empty
              cell, matching mock:2448's `<td colspan="5">`, now that only Year is pinned. */}
          <td className={totalBg} colSpan={5}></td>
          <td className={`${totalBg} ${totalTdCls(6, headers[6].minW)}`} {...cellProps(6)}>
            {fmt(tableResult.totalMarketRentalFee)}
          </td>
          <td className={`${totalBg} ${totalTdCls(7, headers[7].minW)}`} {...cellProps(7)}>
            {fmt(tableResult.totalContractRentalFee)}
          </td>
          <td className={`${totalBg} ${totalTdCls(8, headers[8].minW)}`} {...cellProps(8)}>
            {fmt(tableResult.totalReturnsFromLease)}
          </td>
          <td className={`${totalBg} ${totalTdCls(9, headers[9].minW)}`} {...cellProps(9)}></td>
          <td className={`${totalBg} ${totalTdCls(10, headers[10].minW)}`} {...cellProps(10)}>
            {fmt(tableResult.totalPresentValue)}
          </td>
        </tr>
      </tfoot>
    </>
  );
}

/** 11b: Compact building cost summary with expand/collapse */
/**
 * mock:2852 `.bcsum` — the building-cost card on the summary tab: N buildings, the total
 * after depreciation in the heading, one row per building, and a read-only note (the figures
 * are Building Cost's; nothing here edits them). Per-building value is buildingFinalCostValue,
 * the same rule as BuildingCostSql and the Building Cost screen.
 */
function BuildingCostSummaryCard({ buildingCost }: { buildingCost: Record<string, unknown>[] }) {
  const { t } = useTranslation('pricingAnalysis');
  const rows = buildingCost.map(building => {
    let area = 0;
    let before = 0;
    for (const raw of (building.depreciationDetails as unknown[]) ?? []) {
      const r = raw as Record<string, unknown>;
      area += toNum(r['area']);
      before += toNum(r['area']) * toNum(r['pricePerSqMBeforeDepreciation']);
    }
    return {
      name: (building.propertyName as string) || '—',
      area,
      before,
      after: buildingFinalCostValue(building),
    };
  });
  const totalAfter = rows.reduce((sum, r) => sum + r.after, 0);
  const cell = 'px-[12px] h-[26px] leading-[25px] border-b border-[#e3e9e8] whitespace-nowrap';
  return (
    <SummaryCard
      title={t('methodTabs.buildingSummary.head', { n: rows.length, total: fmt(totalAfter) })}
    >
      <table className="w-full border-separate border-spacing-0 text-[12px] tabular-nums">
        <thead>
          <tr className="text-[#55636f]">
            <th className={`${cell} text-left font-medium`}>{t('methodTabs.buildingSummary.property')}</th>
            <th className={`${cell} text-right font-medium`}>{t('methodTabs.buildingSummary.area')}</th>
            <th className={`${cell} text-right font-medium`}>{t('methodTabs.buildingSummary.before')}</th>
            <th className={`${cell} text-right font-medium`}>{t('methodTabs.buildingSummary.after')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className={`${cell} max-w-[160px] overflow-hidden text-ellipsis`} title={r.name}>
                {r.name}
              </td>
              <td className={`${cell} text-right`}>{fmt(r.area)}</td>
              <td className={`${cell} text-right`}>{fmt(r.before)}</td>
              <td className={`${cell} text-right`}>{fmt(r.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="m-0 px-[12px] py-[6px] text-[11px] text-gray-400">
        {t('methodTabs.buildingSummary.readOnlyNote')}
      </p>
    </SummaryCard>
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

      {/* Market Rental Fee section */}
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
          <div className="flex gap-3 items-end">
            <div className="bg-gray-100 rounded h-9 w-24" />
            <div className="bg-gray-200 rounded h-3 w-10" />
            <div className="bg-gray-100 rounded h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Discount Rate + Generate */}
      <div className="flex items-end justify-between">
        <div className="bg-gray-100 rounded h-14 w-40" />
        <div className="bg-gray-200 rounded h-8 w-24" />
      </div>

      {/* Table skeleton */}
      <TableSkeleton />

      {/* Estimate Price */}
      <div className="rounded-lg border border-gray-200 p-4 flex items-center justify-between">
        <div className="bg-gray-200 rounded h-4 w-36" />
        <div className="bg-gray-100 rounded h-9 w-64" />
      </div>
    </div>
  );
}

/** Skeleton loader for the table */
function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-0 border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-100 h-9 flex items-center px-3">
        <div className="bg-gray-300 rounded h-3 w-16" />
        <div className="flex gap-6 ml-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-300 rounded h-3 w-12" />
          ))}
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, row) => (
        <div key={row} className="h-8 flex items-center px-3 border-t border-gray-100">
          <div className="bg-gray-200 rounded h-3 w-32" />
          <div className="flex gap-6 ml-auto">
            {Array.from({ length: 6 }).map((_, col) => (
              <div key={col} className="bg-gray-200 rounded h-3 w-16" />
            ))}
          </div>
        </div>
      ))}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`h-9 flex items-center px-3 border-t border-gray-200 ${i >= 1 ? 'bg-green-50' : 'bg-gray-50'}`}
        >
          <div className="bg-gray-300 rounded h-3 w-40" />
          <div className="ml-auto bg-gray-300 rounded h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
