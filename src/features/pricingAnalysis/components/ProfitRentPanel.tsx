import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, useController, useWatch } from 'react-hook-form';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { MethodFooterActions } from './MethodFooterActions';
import { ProfitRentFormSchema, profitRentFormDefaults, type ProfitRentFormType } from '../schemas/profitRentForm';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/shared/components';
import { NumberInput, Toggle } from '@/shared/components/inputs';
import { initializeProfitRentForm } from '../adapters/initializeProfitRentForm';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGetProfitRentAnalysis, useSaveProfitRentAnalysis } from '../api';
import { useResetMethod } from '../api';
import { pricingAnalysisKeys } from '../api/queryKeys';
import type { SaveProfitRentAnalysisRequest } from '../types/profitRent';
import { useGetRentalSchedule, useGetLeaseAgreement } from '@/features/appraisal/api/property';
import { typeToDetailEndpoint } from '@/features/appraisal/utils/propertyTypeConfig';
import axios from '@shared/api/axiosInstance';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetAppointment } from '@/features/appraisal/api/appointment';
import toast from 'react-hot-toast';
import { LeaseholdRentalInfoModal } from './LeaseholdRentalInfoModal';
import { BuildingCostTable } from './BuildingCostTable';
import { KpiSummaryStrip, type KpiCard } from './KpiSummaryStrip';
import { ProfitRentChart } from './ProfitRentChart';
import { SensitivityStrip } from './SensitivityStrip';
import { RemarkSection } from './RemarkSection';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import { LeaseTimelineBar } from './LeaseTimelineBar';
import {
  generateProfitRentTable,
  computeProfitRentSchedule,
  type ProfitRentTableResult,
} from '../domain/calculateProfitRent';
import { formatDateOnly, fmt, toNum } from '../domain/formatters';
import { roundToThousand } from '../domain/calculation';

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
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: ProfitRentPanelProps) {
  const appraisalId = useAppraisalId();
  const { data: appointment } = useGetAppointment(appraisalId ?? '');
  const { pricingAnalysisId, methodId } = activeMethod ?? {};
  const queryClient = useQueryClient();
  const [isShowResetDialog, setIsShowResetDialog] = useState(false);
  const [isRentalInfoModalOpen, setIsRentalInfoModalOpen] = useState(false);
  const [tableResult, setTableResult] = useState<ProfitRentTableResult | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const resetMutation = useResetMethod();
  const saveMutation = useSaveProfitRentAnalysis();

  const { data: savedData, isPending: isLoading } = useGetProfitRentAnalysis(
    pricingAnalysisId,
    methodId,
  );

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
    return Number(propertyDetail?.totalLandAreaInSqWa) || 0;
  }, [propertyDetail]);

  // Fetch rental schedule and lease agreement
  const { data: rentalScheduleData } = useGetRentalSchedule(appraisalId ?? '', firstPropertyId);
  const { data: leaseAgreement } = useGetLeaseAgreement(appraisalId ?? '', firstPropertyId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const { fields: growthPeriodFields, append: appendPeriod, remove: removePeriod } = useFieldArray({
    control,
    name: 'growthPeriods' as any,
  });

  // useController for NumberInput fields
  const { field: marketFeeField } = useController({ control, name: 'marketRentalFeePerSqWa' });
  const { field: growthPercentField } = useController({ control, name: 'growthRatePercent' });
  const { field: intervalField } = useController({ control, name: 'growthIntervalYears' });
  const { field: estimateField } = useController({ control, name: 'estimatePriceRounded' });

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
          rows: details.map((d) => ({
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
          finalValueRounded: savedData.analysis.finalValueRounded,
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

  const handleGenerate = useCallback((preserveEstimate = false) => {
    const data = getValuesRef.current();
    const appraisalDateStr = appointment?.appointmentDateTime;
    const contractRows = rentalScheduleData?.rows ?? [];

    const appraisalSchedule = appraisalDateStr
      ? computeProfitRentSchedule(contractRows, appraisalDateStr)
      : [];

    if (appraisalSchedule.length === 0) return;

    // Save current values before regeneration
    const savedEstimate = preserveEstimate ? data.estimatePriceRounded : undefined;
    const savedBuildingRounded = preserveEstimate ? data.appraisalPriceWithBuildingRounded : undefined;

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

    if (preserveEstimate) {
      // Restore saved values after regeneration
      if (savedEstimate != null && savedEstimate !== 0) {
        setValue('estimatePriceRounded', savedEstimate, { shouldDirty: false });
      }
      if (savedBuildingRounded != null && savedBuildingRounded !== 0) {
        setValue('appraisalPriceWithBuildingRounded', savedBuildingRounded, { shouldDirty: false });
      }
    } else {
      setValue('estimatePriceRounded', result.finalValueRounded);
    }
  }, [appointment, rentalScheduleData, landAreaSqWa, setValue]);

  // Recalculate table once rental schedule is available (fixes dates, numberOfMonths, etc.)
  const hasRecalculated = useRef(false);
  useEffect(() => {
    if (hasRecalculated.current) return;
    if (!tableResult || !rentalScheduleData?.rows?.length || !appointment?.appointmentDateTime) return;
    if (tableResult.rows[0]?.contractStart) return;
    hasRecalculated.current = true;
    handleGenerate(true);
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
    name: ['marketRentalFeePerSqWa', 'growthRateType', 'growthRatePercent', 'growthIntervalYears', 'discountRate'],
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

  // Sensitivity: recalculate final value with a different discount rate (C3 fix: no getValues in deps)
  const calcSensitivity = useCallback((rate: number): number | null => {
    const data = getValuesRef.current();
    const appraisalDateStr = appointment?.appointmentDateTime;
    const contractRows = rentalScheduleData?.rows ?? [];
    const appraisalSchedule = appraisalDateStr
      ? computeProfitRentSchedule(contractRows, appraisalDateStr)
      : [];
    if (appraisalSchedule.length === 0) return null;

    const result = generateProfitRentTable({
      appraisalSchedule,
      landAreaSqWa,
      marketRentalFeePerSqWa: data.marketRentalFeePerSqWa ?? 0,
      growthRateType: data.growthRateType ?? 'Frequency',
      growthRatePercent: data.growthRatePercent ?? 0,
      growthIntervalYears: data.growthIntervalYears ?? 1,
      growthPeriods: (data.growthPeriods ?? []) as any,
      discountRate: rate,
    });
    return result.finalValueRounded;
  }, [appointment, rentalScheduleData, landAreaSqWa]);

  const handleOnSubmit = async () => {
    if (!pricingAnalysisId || !methodId) return;

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
        setValue('appraisalPriceWithBuilding', result.appraisalPriceWithBuilding, { shouldDirty: false });
        setValue('appraisalPriceWithBuildingRounded', result.appraisalPriceWithBuildingRounded, { shouldDirty: false });
      }

      // Propagate building-inclusive price when building cost is included
      const appraisalValue =
        data.includeBuildingCost && result.appraisalPriceWithBuildingRounded
          ? result.appraisalPriceWithBuildingRounded
          : data.estimatePriceRounded ?? result.finalValueRounded;

      if (activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue,
        });
      }
      toast.success('Saved!');
    } catch {
      toast.error('Failed to save');
    }
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
      toast.success('Reset successful');
    } catch {
      toast.error('Failed to reset');
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

  // Compute totalBuildingCost preview from depreciation details (same as WQS pattern)
  useEffect(() => {
    if (!isBuildingCostIncluded || !allGroupProperties.length) {
      return;
    }

    let grandTotal = 0;
    for (const building of allGroupProperties) {
      const rawRows: unknown[] = (building.depreciationDetails as unknown[]) ?? [];
      for (const rawRow of rawRows) {
        const row = rawRow as Record<string, unknown>;
        const priceBeforeDepreciation =
          toNum(row['area']) * toNum(row['pricePerSqMBeforeDepreciation']);
        const periods: unknown[] = (row['depreciationPeriods'] as unknown[]) ?? [];
        const priceDepreciation = periods.reduce(
          (acc: number, b: unknown) => acc + toNum((b as Record<string, unknown>).priceDepreciation),
          0,
        );
        grandTotal += priceBeforeDepreciation - priceDepreciation;
      }
    }

    setValue('totalBuildingCost', grandTotal, { shouldDirty: false });
  }, [allGroupProperties, isBuildingCostIncluded, setValue]);

  // Compute derived building cost fields for preview
  const totalBuildingCost = watch('totalBuildingCost') ?? 0;
  const prevBuildingPriceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isBuildingCostIncluded || !isInitialized.current) return;
    const est = Number(estimatePrice) || 0;
    const buildingCost = Number(totalBuildingCost) || 0;
    const sum = est + buildingCost;
    setValue('appraisalPriceWithBuilding', sum, { shouldDirty: false });

    // Auto-update rounded only when the user actively changes inputs (isDirty),
    // not during initial hydration from saved data
    if (!isDirty) {
      // On init: only set if no saved value
      const currentRounded = getValues('appraisalPriceWithBuildingRounded');
      if (currentRounded == null || currentRounded === 0) {
        setValue('appraisalPriceWithBuildingRounded', roundToThousand(sum), { shouldDirty: false });
      }
      prevBuildingPriceRef.current = sum;
      return;
    }

    if (prevBuildingPriceRef.current !== sum) {
      prevBuildingPriceRef.current = sum;
      setValue('appraisalPriceWithBuildingRounded', roundToThousand(sum), { shouldDirty: false });
    }
  }, [isBuildingCostIncluded, estimatePrice, totalBuildingCost, isDirty, getValues, setValue]);

  if (isLoading) {
    return <PanelSkeleton />;
  }

  return (
    <FormProvider methods={methods as any} schema={ProfitRentFormSchema as any}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(handleOnSubmit)(e);
        }}
        className="flex flex-col h-full gap-4"
      >
        {/* Header — matches Leasehold */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
            <Icon name="file-signature" className="size-4" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Profit Rent</h2>
        </div>

        {/* Lease Info Cards — matches Leasehold layout */}
        <div className="rounded-lg border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2.5">
              <Icon name="calendar" className="size-4 text-gray-400 shrink-0" />
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Appraisal Date</div>
                <div className="text-sm font-medium text-gray-900">
                  {appointment?.appointmentDateTime ? formatDateOnly(appointment.appointmentDateTime) : '-'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2.5">
              <Icon name="calendar" className="size-4 text-green-500 shrink-0" />
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Lease Start</div>
                <div className="text-sm font-medium text-gray-900">
                  {leaseAgreement?.leaseStartDate ? formatDateOnly(leaseAgreement.leaseStartDate) : '-'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2.5">
              <Icon name="calendar" className="size-4 text-red-400 shrink-0" />
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Lease End</div>
                <div className="text-sm font-medium text-gray-900">
                  {leaseAgreement?.leaseEndDate ? formatDateOnly(leaseAgreement.leaseEndDate) : '-'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRentalInfoModalOpen(true)}
              className="flex items-center gap-3 rounded-md bg-primary/5 border border-primary/20 px-3 py-2.5 hover:bg-primary/10 transition-colors"
            >
              <Icon name="receipt" className="size-4 text-primary shrink-0" />
              <div className="text-left">
                <div className="text-[11px] text-primary/60 uppercase tracking-wide">View</div>
                <div className="text-sm font-medium text-primary">Rental Information</div>
              </div>
            </button>
          </div>
          <LeaseTimelineBar
            leaseStartDate={leaseAgreement?.leaseStartDate}
            leaseEndDate={leaseAgreement?.leaseEndDate}
            appraisalDate={appointment?.appointmentDateTime}
          />
        </div>

        {/* Market Rental Fee & Land Area & Rates */}
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          {/* Top row: Land Area + Market Fee + Monthly Total + Discount Rate */}
          <div className="grid grid-cols-4 gap-3">
            {/* Land Area — read-only */}
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Land Area</div>
              <div className="flex items-baseline gap-1">
                <Icon name="ruler-combined" className="size-3 text-gray-400 shrink-0 relative top-0.5" />
                <span className="text-sm font-semibold text-gray-900">{fmt(landAreaSqWa)}</span>
                <span className="text-[10px] text-gray-500">Sq. Wa</span>
              </div>
            </div>

            {/* Market Rental Fee — input */}
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5 block">
                Market Rental Fee <span className="text-red-400">*</span>
              </label>
              <div className="flex items-baseline gap-1">
                <div className="w-24">
                  <NumberInput
                    name={marketFeeField.name}
                    ref={marketFeeField.ref}
                    value={marketFeeField.value}
                    onChange={(e) => marketFeeField.onChange(e.target.value)}
                    onBlur={marketFeeField.onBlur}
                    decimalPlaces={2}
                  />
                </div>
                <span className="text-[10px] text-gray-500">Baht/Sq.Wa/Mo</span>
              </div>
            </div>

            {/* Monthly Total — computed */}
            <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2">
              <div className="text-[10px] text-primary/60 uppercase tracking-wide mb-0.5">Monthly Total</div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-primary">
                  {fmt((marketFeeField.value ?? 0) * landAreaSqWa)}
                </span>
                <span className="text-[10px] text-primary/60">Baht/Mo</span>
              </div>
            </div>

            {/* Discounted Rate — input */}
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5 block">
                Discounted Rate
              </label>
              <div className="w-24">
                <NumberInput
                  name="discountRate"
                  value={watch('discountRate')}
                  onChange={(e) => setValue('discountRate', e.target.value ?? 0, { shouldDirty: true })}
                  decimalPlaces={2}
                  rightIcon={<span className="text-xs text-gray-400">%</span>}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Market Rental Fee Increase */}
          <div className="space-y-2">
            <Toggle
              label="Market Rental Fee Increase"
              options={['Frequency', 'Period']}
              checked={growthRateType === 'Period'}
              onChange={(checked) => setValue('growthRateType', checked ? 'Period' : 'Frequency', { shouldDirty: true })}
              size="sm"
            />

            {growthRateType === 'Frequency' ? (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <NumberInput
                    label="Rate"
                    name={growthPercentField.name}
                    ref={growthPercentField.ref}
                    value={growthPercentField.value}
                    onChange={(e) => growthPercentField.onChange(e.target.value)}
                    onBlur={growthPercentField.onBlur}
                    decimalPlaces={2}
                    rightIcon={<span className="text-xs text-gray-400">%</span>}
                  />
                </div>
                <span className="text-sm text-gray-500 pb-2">Every</span>
                <div className="flex-1">
                  <NumberInput
                    label="Interval"
                    name={intervalField.name}
                    ref={intervalField.ref}
                    value={intervalField.value}
                    onChange={(e) => intervalField.onChange(e.target.value)}
                    onBlur={intervalField.onBlur}
                    decimalPlaces={0}
                    rightIcon={<span className="text-xs text-gray-400">Year</span>}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 text-xs text-gray-500 font-medium">
                  <span>From Year</span>
                  <span>To Year</span>
                  <span>Growth Rate (%)</span>
                  <span />
                </div>
                {growthPeriodFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-end">
                    <NumberInput
                      value={watch(`growthPeriods.${index}.fromYear` as any)}
                      onChange={(e) => setValue(`growthPeriods.${index}.fromYear` as any, e.target.value ?? 0, { shouldDirty: true })}
                      decimalPlaces={0}
                    />
                    <NumberInput
                      value={watch(`growthPeriods.${index}.toYear` as any)}
                      onChange={(e) => setValue(`growthPeriods.${index}.toYear` as any, e.target.value ?? 0, { shouldDirty: true })}
                      decimalPlaces={0}
                    />
                    <NumberInput
                      value={watch(`growthPeriods.${index}.growthRatePercent` as any)}
                      onChange={(e) => setValue(`growthPeriods.${index}.growthRatePercent` as any, e.target.value ?? 0, { shouldDirty: true })}
                      decimalPlaces={2}
                      rightIcon={<span className="text-xs text-gray-400">%</span>}
                    />
                    <button
                      type="button"
                      onClick={() => removePeriod(index)}
                      className="flex items-center justify-center text-red-400 hover:text-red-600 pb-1"
                    >
                      <Icon name="xmark" className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => appendPeriod({ fromYear: 0, toYear: 0, growthRatePercent: 0 })}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Icon name="plus" className="size-3" />
                  Add Periods
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KPI Summary */}
        {tableResult && tableResult.rows.length > 0 && (
          <KpiSummaryStrip
            cards={[
              { label: 'Total Market Rental', value: tableResult.totalMarketRentalFee, icon: 'chart-bar', color: 'blue' },
              { label: 'Total Contract Rental', value: tableResult.totalContractRentalFee, icon: 'file-contract', color: 'gray' },
              { label: 'Total Returns', value: tableResult.totalReturnsFromLease, icon: 'arrow-trend-up', color: 'amber' },
              { label: 'Present Value', value: tableResult.totalPresentValue, icon: 'circle-check', color: 'green', primary: true },
            ] satisfies KpiCard[]}
          />
        )}

        {/* Chart */}
        {tableResult && tableResult.rows.length > 0 && (
          <ProfitRentChart result={tableResult} />
        )}

        {/* Sensitivity */}
        {tableResult && tableResult.rows.length > 0 && (
          <SensitivityStrip
            currentRate={discountRateValue}
            calculateFinalValue={calcSensitivity}
          />
        )}

        {/* Calculation Table */}
        {tableResult && tableResult.rows.length > 0 ? (
          <ScrollableTableContainer maxHeight="500px">
            <table className="w-full text-xs border-collapse">
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

        {/* Include building cost section */}
        <div className="border-t border-gray-200 pt-2 space-y-3">
          <Toggle
            label="Include building cost"
            options={['No', 'Yes']}
            size="sm"
            checked={isBuildingCostIncluded}
            onChange={(checked) =>
              setValue('includeBuildingCost', checked, { shouldDirty: true })
            }
          />

          {isBuildingCostIncluded && (
            <>
              <BuildingCostCollapsible buildingCost={allGroupProperties} />
              <div className="border-t border-gray-200" />

              {/* Formula rows */}
              <div className="text-sm divide-y divide-gray-100">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-600">Estimate Price (from PV)</span>
                  <span className="text-xs font-medium text-gray-800 tabular-nums">{fmt(Number(estimatePrice) || 0)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-600">
                    <span className="font-bold mr-1">+</span>
                    Building Cost (after depre.)
                  </span>
                  <span className="text-xs font-medium text-gray-800 tabular-nums">{fmt(Number(watch('totalBuildingCost')) || 0)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-700 font-medium">
                    <span className="font-bold mr-1">=</span>
                    Appraisal Price w/ Building
                  </span>
                  <span className="text-xs font-semibold text-gray-900 tabular-nums">{fmt(Number(watch('appraisalPriceWithBuilding')) || 0)}</span>
                </div>
                {/* Appraisal Price */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-semibold text-gray-900">
                    Appraisal Price
                  </span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const rounded = Number(watch('appraisalPriceWithBuildingRounded')) || 0;
                      const computed = roundToThousand(Number(watch('appraisalPriceWithBuilding')) || 0);
                      const diff = rounded - computed;
                      if (diff === 0) return null;
                      const pct = computed !== 0 ? ((diff / computed) * 100).toFixed(1) : '0.0';
                      const color = diff > 0 ? 'text-green-600' : 'text-red-600';
                      const bgColor = diff > 0 ? 'bg-green-100' : 'bg-red-100';
                      const icon = diff > 0 ? 'arrow-up' : 'arrow-down';
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${color} ${bgColor} shrink-0`}
                        >
                          <Icon name={icon} style="solid" className="size-2.5" />
                          {Math.abs(diff).toLocaleString()} ({diff > 0 ? '+' : ''}{pct}%)
                        </span>
                      );
                    })()}
                    <div className="w-40">
                      <NumberInput
                        name="appraisalPriceWithBuildingRounded"
                        value={watch('appraisalPriceWithBuildingRounded') ?? 0}
                        onChange={(e) =>
                          setValue('appraisalPriceWithBuildingRounded', Number(e.target.value) || 0, {
                            shouldDirty: true,
                          })
                        }
                        decimalPlaces={2}
                        className="!font-bold !text-right !text-sm !text-green-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Estimate Price + Appraisal Price — when no building cost */}
        {!isBuildingCostIncluded && (
          <div className="text-sm divide-y divide-gray-100 border-t border-gray-200">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-gray-600">Estimate Price (from PV)</span>
              <span className="text-xs font-medium text-gray-800 tabular-nums">{fmt(tableResult?.finalValueRounded ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-semibold text-gray-900 shrink-0">
                Appraisal Price
              </span>
              <div className="flex items-center gap-2">
                {(() => {
                  const rounded = Number(estimateField.value) || 0;
                  const computed = tableResult?.finalValueRounded ?? 0;
                  const diff = rounded - computed;
                  if (diff === 0 || computed === 0) return null;
                  const pct = ((diff / computed) * 100).toFixed(1);
                  const color = diff > 0 ? 'text-green-600' : 'text-red-600';
                  const bgColor = diff > 0 ? 'bg-green-100' : 'bg-red-100';
                  const icon = diff > 0 ? 'arrow-up' : 'arrow-down';
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${color} ${bgColor} shrink-0`}
                    >
                      <Icon name={icon} style="solid" className="size-2.5" />
                      {Math.abs(diff).toLocaleString()} ({diff > 0 ? '+' : ''}{pct}%)
                    </span>
                  );
                })()}
                <div className="w-40">
                  <NumberInput
                    name={estimateField.name}
                    ref={estimateField.ref}
                    value={estimateField.value}
                    onChange={(e) => estimateField.onChange(e.target.value)}
                    onBlur={estimateField.onBlur}
                    decimalPlaces={2}
                    className="!font-bold !text-right !text-sm !text-green-700"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes & Assumptions */}
        <RemarkSection setValue={setValue} watch={watch} />

        {/* Footer — matches Leasehold */}
        <MethodFooterActions
          showReset={true}
          isSubmitting={saveMutation.isPending}
          onReset={handleOnReset}
          onCancel={onCancelCalculationMethod}
        />

        {/* Dialogs */}
        <ConfirmDialog
          isOpen={isShowResetDialog}
          onClose={() => setIsShowResetDialog(false)}
          onConfirm={handleOnConfirmReset}
          message="Are you sure you want to reset this method? All calculation data will be cleared."
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
  const colHl = 'bg-blue-50/60';

  // Sticky columns: 0=Year, 1=Start, 2=End (pinned left)
  const stickyBase = [
    'sticky left-0 z-10 min-w-[60px]',
    'sticky left-[60px] z-10 min-w-[100px]',
    'sticky left-[160px] z-10 min-w-[100px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
  ];

  const headBg = 'bg-gray-50';
  const bodyBg = 'bg-white';
  const totalBg = 'bg-gray-100';

  const thCls = (col: number, extra?: string) => {
    const isSticky = col < 3;
    // Sticky-left + sticky-top headers need z-30 (above both axes)
    const base = isSticky
      ? `${stickyBase[col]} sticky top-0 z-30 ${headBg} px-3 py-2 text-gray-600 font-medium border-b border-gray-200`
      : `sticky top-0 z-20 ${headBg} px-3 py-2 text-right text-gray-600 font-medium border-b border-gray-200 ${extra ?? ''}`;
    return `${base} ${hoveredCol === col ? colHl : ''}`;
  };

  const tdCls = (col: number, extra?: string) => {
    const isSticky = col < 3;
    const base = isSticky
      ? `${stickyBase[col]} ${bodyBg} px-3 py-1.5 text-gray-700 border-b border-gray-100`
      : `px-3 py-1.5 text-right text-gray-700 border-b border-gray-100 ${extra ?? ''}`;
    return `${base} ${hoveredCol === col ? colHl : ''}`;
  };

  const totalTdCls = (col: number, extra?: string) => {
    const base = `px-3 py-2 text-right text-gray-800 ${extra ?? ''}`;
    return `${base} ${hoveredCol === col ? colHl : ''}`;
  };

  const cellProps = (col: number) => ({
    onMouseEnter: () => onColHover(col),
    onMouseLeave: () => onColHover(null),
  });

  const headers = [
    { label: 'Year', align: 'text-left' },
    { label: 'Period Start Date', align: 'text-left' },
    { label: 'Period End Date', align: 'text-left' },
    { label: 'Number of Month', minW: 'min-w-[80px]' },
    { label: 'Market Rental Fee (Baht/Sq.Wa/Month)', minW: 'min-w-[130px]' },
    { label: 'Market Rental Fee (Baht/month)', minW: 'min-w-[120px]' },
    { label: 'Market Rental Fee (Baht/year)', minW: 'min-w-[120px]' },
    { label: 'Contract Rental Fee (Baht/year)', minW: 'min-w-[120px]' },
    { label: 'Returns from Lease (Baht)', minW: 'min-w-[120px]' },
    { label: 'Discounted Rate', minW: 'min-w-[100px]' },
    { label: 'Present Value (Baht)', minW: 'min-w-[120px]' },
  ];

  return (
    <>
      <thead>
        <tr className="bg-gray-50">
          {headers.map((h, col) => (
            <th key={col} className={thCls(col, h.minW)} {...cellProps(col)}>
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody onMouseLeave={() => onColHover(null)}>
        {tableResult.rows.map((row) => (
          <tr key={row.year} className="hover:bg-gray-50/50">
            <td className={tdCls(0)} {...cellProps(0)}>{row.year.toFixed(1)}</td>
            <td className={tdCls(1)} {...cellProps(1)}>{row.contractStart ? formatDateOnly(row.contractStart) : '-'}</td>
            <td className={tdCls(2)} {...cellProps(2)}>{row.contractEnd ? formatDateOnly(row.contractEnd) : '-'}</td>
            <td className={tdCls(3)} {...cellProps(3)}>{row.numberOfMonths.toFixed(1)}</td>
            <td className={tdCls(4)} {...cellProps(4)}>
              <div>{fmt(row.marketRentalFeePerSqWa)}</div>
              {row.marketRentalFeeGrowthPercent > 0 && (
                <div className="text-[9px] text-gray-400">+{row.marketRentalFeeGrowthPercent}%</div>
              )}
            </td>
            <td className={tdCls(5)} {...cellProps(5)}>{fmt(row.marketRentalFeePerMonth)}</td>
            <td className={tdCls(6)} {...cellProps(6)}>{fmt(row.marketRentalFeePerYear)}</td>
            <td className={tdCls(7)} {...cellProps(7)}>{fmt(row.contractRentalFeePerYear)}</td>
            <td className={tdCls(8)} {...cellProps(8)}>{fmt(row.returnsFromLease)}</td>
            <td className={tdCls(9)} {...cellProps(9)}>{discountRateValue.toFixed(2)} %</td>
            <td className={tdCls(10)} {...cellProps(10)}>{fmt(row.presentValue)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot className="sticky bottom-0 z-20">
        <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
          <td className={`sticky left-0 z-30 ${totalBg} px-3 py-2 text-gray-800`} colSpan={3}>Total</td>
          <td className={`${totalBg} ${totalTdCls(3)}`} {...cellProps(3)}></td>
          <td className={`${totalBg} ${totalTdCls(4)}`} {...cellProps(4)}></td>
          <td className={`${totalBg} ${totalTdCls(5)}`} {...cellProps(5)}></td>
          <td className={`${totalBg} ${totalTdCls(6)}`} {...cellProps(6)}>{fmt(tableResult.totalMarketRentalFee)}</td>
          <td className={`${totalBg} ${totalTdCls(7)}`} {...cellProps(7)}>{fmt(tableResult.totalContractRentalFee)}</td>
          <td className={`${totalBg} ${totalTdCls(8)}`} {...cellProps(8)}>{fmt(tableResult.totalReturnsFromLease)}</td>
          <td className={`${totalBg} ${totalTdCls(9)}`} {...cellProps(9)}></td>
          <td className={`${totalBg} ${totalTdCls(10)}`} {...cellProps(10)}>{fmt(tableResult.totalPresentValue)}</td>
        </tr>
      </tfoot>
    </>
  );
}

/** 11b: Compact building cost summary with expand/collapse */
function BuildingCostCollapsible({ buildingCost }: { buildingCost: Record<string, unknown>[] }) {
  const [expanded, setExpanded] = useState(false);

  // Compute summary per building
  const summaries = buildingCost.map((building) => {
    const rows: unknown[] = (building.depreciationDetails as unknown[]) ?? [];
    let totalArea = 0;
    let totalBefore = 0;
    let totalAfter = 0;
    for (const rawRow of rows) {
      const row = rawRow as Record<string, unknown>;
      const area = toNum(row['area']);
      const before = area * toNum(row['pricePerSqMBeforeDepreciation']);
      const periods: unknown[] = (row['depreciationPeriods'] as unknown[]) ?? [];
      const depre = periods.reduce(
        (acc: number, b: unknown) => acc + toNum((b as Record<string, unknown>).priceDepreciation),
        0,
      );
      totalArea += area;
      totalBefore += before;
      totalAfter += before - depre;
    }
    return {
      name: (building.propertyName as string) || 'Building',
      itemCount: rows.length,
      totalArea,
      totalBefore,
      totalAfter,
    };
  });

  const grandAfter = summaries.reduce((s, b) => s + b.totalAfter, 0);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Compact summary */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon name="building" className="size-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">
            Building Cost Summary
          </span>
          <span className="text-[10px] text-gray-400">
            ({summaries.reduce((s, b) => s + b.itemCount, 0)} items)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600 tabular-nums">
            After Depre. {grandAfter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <Icon
            name="chevron-down"
            className={`size-3 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Summary table - always visible */}
      {!expanded && (
        <div className="border-t border-gray-100">
          {/* Column headers */}
          <div className="flex items-center justify-between px-4 py-1 text-[10px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
            <span>Property</span>
            <div className="flex gap-6">
              <span className="w-20 text-right">Area</span>
              <span className="w-28 text-right">Before Depre.</span>
              <span className="w-28 text-right">After Depre.</span>
            </div>
          </div>
          {summaries.map((s, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-1.5 text-xs border-b border-gray-50 last:border-b-0">
              <span className="text-gray-600">{s.name}</span>
              <div className="flex gap-6 tabular-nums">
                <span className="text-gray-400 w-20 text-right">{s.totalArea.toLocaleString()} m²</span>
                <span className="text-gray-500 w-28 text-right">{s.totalBefore.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-gray-700 font-medium w-28 text-right">{s.totalAfter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded: full BuildingCostTable */}
      {expanded && (
        <div className="border-t border-gray-200">
          <BuildingCostTable buildingCost={buildingCost as any} />
        </div>
      )}
    </div>
  );
}

/** Full panel skeleton — shown while initial data loads */
function PanelSkeleton() {
  return (
    <div className="flex flex-col h-full gap-4 animate-pulse">
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
        <div key={i} className={`h-9 flex items-center px-3 border-t border-gray-200 ${i >= 1 ? 'bg-green-50' : 'bg-gray-50'}`}>
          <div className="bg-gray-300 rounded h-3 w-40" />
          <div className="ml-auto bg-gray-300 rounded h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
