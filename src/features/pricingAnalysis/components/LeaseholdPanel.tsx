import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, useController, useFieldArray } from 'react-hook-form';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { MethodFooterActions } from './MethodFooterActions';
import { LeaseholdFormSchema, leaseholdFormDefaults, type LeaseholdFormType } from '../schemas/leaseholdForm';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/shared/components';
import { NumberInput, Toggle } from '@/shared/components/inputs';
import { initializeLeaseholdForm } from '../adapters/initializeLeaseholdForm';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGetLeaseholdAnalysis, useSaveLeaseholdAnalysis } from '../api';
import { useResetMethod } from '../api';
import { pricingAnalysisKeys } from '../api/queryKeys';
import { LeaseholdTable } from './LeaseholdTable';
import { LeaseholdRentalInfoModal } from './LeaseholdRentalInfoModal';
import { LeaseTimelineBar } from './LeaseTimelineBar';
import { LeaseholdChart } from './LeaseholdChart';
import { SensitivityStrip } from './SensitivityStrip';
import { RemarkSection } from './RemarkSection';
import { LeaseholdPartialUsageSection } from './LeaseholdPartialUsageSection';
import { KpiSummaryStrip, type KpiCard } from './KpiSummaryStrip';
import { RHFInputCell } from './table/RHFInputCell';
import { generateLeaseholdTable, computeAppraisalSchedule, calculatePartialUsage, type LeaseholdTableResult } from '../domain/calculateLeasehold';
import type { SaveLeaseholdAnalysisRequest } from '../types/leasehold';
import { roundToThousand } from '../domain/calculation';
import { useGetRentalSchedule, useGetLeaseAgreement } from '@/features/appraisal/api/property';
import { typeToDetailEndpoint } from '@/features/appraisal/utils/propertyTypeConfig';
import axios from '@shared/api/axiosInstance';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetAppointment } from '@/features/appraisal/api/appointment';
import toast from 'react-hot-toast';
import { formatDateOnly } from '../domain/formatters';

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
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: LeaseholdPanelProps) {
  const appraisalId = useAppraisalId();
  const { data: appointment } = useGetAppointment(appraisalId ?? '');
  const { pricingAnalysisId, methodId } = activeMethod ?? {};
  const queryClient = useQueryClient();
  const [isShowResetDialog, setIsShowResetDialog] = useState(false);
  const [isRentalInfoModalOpen, setIsRentalInfoModalOpen] = useState(false);
  const [tableResult, setTableResult] = useState<LeaseholdTableResult | null>(null);
  const tableResultRef = useRef<LeaseholdTableResult | null>(null);
  const [estimateNetPrice, setEstimateNetPrice] = useState<number | null>(null);

  const resetMutation = useResetMethod();
  const saveMutation = useSaveLeaseholdAnalysis();

  const { data: savedData, isPending: isLoading } = useGetLeaseholdAnalysis(
    pricingAnalysisId,
    methodId,
  );

  // Fetch property detail directly to get totalLandAreaInSqWa and building depreciation
  const detailEndpoint = firstPropertyType ? typeToDetailEndpoint[firstPropertyType] : undefined;

  const { data: propertyDetail } = useQuery({
    queryKey: ['appraisal', appraisalId, 'property', firstPropertyId, 'detail-lh'],
    queryFn: async () => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${firstPropertyId}/${detailEndpoint}`,
      );
      return data as Record<string, any>;
    },
    enabled: !!appraisalId && !!firstPropertyId && !!detailEndpoint,
    staleTime: Infinity,
  });

  const propertyData = useMemo(() => {
    if (!propertyDetail) return null;
    const d = propertyDetail;
    const depDetails = (d.depreciationDetails ?? []) as any[];
    const totalBuildingPriceBeforeDepreciation = depDetails.reduce(
      (sum: number, item: any) => sum + (Number(item?.priceBeforeDepreciation) || 0),
      0,
    );
    return {
      totalLandAreaInSqWa: Number(d.totalLandAreaInSqWa) || 0,
      totalBuildingPriceBeforeDepreciation,
    };
  }, [propertyDetail]);

  // Fetch rental schedule and lease agreement for rental income data and lease dates
  const { data: rentalScheduleData } = useGetRentalSchedule(appraisalId ?? '', firstPropertyId);
  const { data: leaseAgreement } = useGetLeaseAgreement(appraisalId ?? '', firstPropertyId);

  const methods = useForm<LeaseholdFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(LeaseholdFormSchema),
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
          rows: details.map((d) => ({
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
          finalValueRounded: savedData.analysis.finalValueRounded,
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

  // Auto-generate on first visit when no saved data but all dependencies are ready
  const hasAutoGenerated = useRef(false);
  useEffect(() => {
    if (
      !hasAutoGenerated.current &&
      isInitialized.current &&
      !tableResultRef.current &&
      rentalScheduleData?.rows?.length &&
      appointment?.appointmentDateTime &&
      propertyData
    ) {
      hasAutoGenerated.current = true;
      handleGenerate();
    }
  }, [rentalScheduleData, appointment, propertyData, tableResult]);

  useEffect(() => {
    onCalculationMethodDirty(isDirty);
  }, [isDirty, onCalculationMethodDirty]);

  // Stable ref for getValues — avoids re-creating callbacks on every render (C3 fix)
  const getValuesRef = useRef(getValues);
  getValuesRef.current = getValues;

  const handleGenerate = useCallback((overrideValues?: LeaseholdFormType) => {
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
    const years = appraisalRows.map((r) => r.year);
    const rentalIncomePerPeriod = appraisalRows.map((r) => r.totalAmount);

    // Land base value = pricePerSqWa × totalLandArea
    const baseLandValue = (data.landValuePerSqWa ?? 0) * (propertyData?.totalLandAreaInSqWa ?? 0);

    const result = generateLeaseholdTable({
      years,
      landValueConfig: {
        baseValue: baseLandValue,
        growthType: data.landGrowthRateType ?? 'Frequency',
        growthRatePercent: data.landGrowthRatePercent ?? 0,
        intervalYears: data.landGrowthIntervalYears ?? 1,
        periods: data.landGrowthPeriods ?? [],
      },
      initialBuildingValue: propertyData?.totalBuildingPriceBeforeDepreciation ?? (data.initialBuildingValue ?? 0),
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
  }, [appointment, rentalScheduleData, propertyData, setValue]);

  // Sensitivity: recalculate final value with a different discount rate (C3 fix: no getValues in deps)
  const calcSensitivity = useCallback((rate: number): number | null => {
    const data = getValuesRef.current();
    const appraisalDateStr = appointment?.appointmentDateTime;
    const contractRows = rentalScheduleData?.rows ?? [];
    const { rows: appraisalRows } = appraisalDateStr
      ? computeAppraisalSchedule(contractRows, appraisalDateStr)
      : { rows: [] };
    if (appraisalRows.length === 0) return null;

    const years = appraisalRows.map((r) => r.year);
    const rentalIncomePerPeriod = appraisalRows.map((r) => r.totalAmount);
    const baseLandValue = (data.landValuePerSqWa ?? 0) * (propertyData?.totalLandAreaInSqWa ?? 0);

    const result = generateLeaseholdTable({
      years,
      landValueConfig: {
        baseValue: baseLandValue,
        growthType: data.landGrowthRateType ?? 'Frequency',
        growthRatePercent: data.landGrowthRatePercent ?? 0,
        intervalYears: data.landGrowthIntervalYears ?? 1,
        periods: data.landGrowthPeriods ?? [],
      },
      initialBuildingValue: propertyData?.totalBuildingPriceBeforeDepreciation ?? (data.initialBuildingValue ?? 0),
      constructionCostIndex: data.constructionCostIndex ?? 0,
      depreciationRate: data.depreciationRate ?? 0,
      depreciationIntervalYears: data.depreciationIntervalYears ?? 1,
      buildingCalcStartYear: data.buildingCalcStartYear ?? 0,
      discountRate: rate,
      rentalIncomePerPeriod,
    });
    return result.finalValueRounded;
  }, [appointment, rentalScheduleData, propertyData]);

  const handleOnSubmit = async () => {
    if (!pricingAnalysisId || !methodId) return;

    const data = getValues();
    const request: SaveLeaseholdAnalysisRequest = {
      landValuePerSqWa: data.landValuePerSqWa,
      landGrowthRateType: data.landGrowthRateType,
      landGrowthRatePercent: data.landGrowthRatePercent,
      landGrowthIntervalYears: data.landGrowthIntervalYears,
      constructionCostIndex: data.constructionCostIndex,
      initialBuildingValue: propertyData?.totalBuildingPriceBeforeDepreciation ?? data.initialBuildingValue,
      depreciationRate: data.depreciationRate,
      depreciationIntervalYears: data.depreciationIntervalYears,
      buildingCalcStartYear: data.buildingCalcStartYear,
      discountRate: data.discountRate,
      landGrowthPeriods: (data.landGrowthPeriods ?? []).map((p) => ({
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
      remark: data.remark,
    };

    try {
      const result = await saveMutation.mutateAsync({
        pricingAnalysisId,
        methodId,
        request,
      });

      if (activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue: data.estimatePriceRounded ?? result.finalValueRounded,
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
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.leaseholdAnalysis(pricingAnalysisId, methodId),
      });
      isInitialized.current = false;
      hasAutoGenerated.current = false;
      tableResultRef.current = null;
      initializeLeaseholdForm(null, null, reset);
      setTableResult(null);
      toast.success('Method reset successfully');
    } catch {
      toast.error('Failed to reset method');
    }
  };

  // Inline land value controls
  const landGrowthRateType = useWatch({ control, name: 'landGrowthRateType' });
  const { field: landValueField } = useController({ control, name: 'landValuePerSqWa' });
  const { field: landGrowthPercentField } = useController({ control, name: 'landGrowthRatePercent' });
  const { field: landIntervalField } = useController({ control, name: 'landGrowthIntervalYears' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { fields: landPeriodFields, append: appendLandPeriod, remove: removeLandPeriod } = useFieldArray({
    control: control as any,
    name: 'landGrowthPeriods',
  });

  // Auto-recalculate when inline table inputs change (C2 fix: stable deps via ref comparison)
  const watchedLandInputs = useWatch({
    control,
    name: ['landValuePerSqWa', 'landGrowthRateType', 'landGrowthRatePercent', 'landGrowthIntervalYears'],
  });
  const watchedLandPeriods = useWatch({ control, name: 'landGrowthPeriods' });
  const watchedTableInputs = useWatch({
    control,
    name: ['constructionCostIndex', 'depreciationRate', 'depreciationIntervalYears', 'discountRate', 'buildingCalcStartYear'],
  });
  const prevWatchKey = useRef<string | null>(null);
  useEffect(() => {
    const key = watchedTableInputs.join(',') + '|' + watchedLandInputs.join(',') + '|' + JSON.stringify(watchedLandPeriods);
    // Seed the key on first run so we don't fire on mount/cache reload
    if (prevWatchKey.current === null) {
      prevWatchKey.current = key;
      return;
    }
    if (!isDirty) return;
    if (key === prevWatchKey.current) return;
    prevWatchKey.current = key;
    if (tableResult) handleGenerate();
  }, [isDirty, watchedTableInputs, watchedLandInputs, watchedLandPeriods, tableResult, handleGenerate]);

  const finalValueRounded = tableResult?.finalValueRounded ?? 0;

  // Estimate Price (Rounded) — auto-fills from computed, user can override
  const { field: estimateField } = useController({ control, name: 'estimatePriceRounded' });

  if (isLoading) {
    return <PanelSkeleton />;
  }

  return (
    <FormProvider methods={methods} schema={LeaseholdFormSchema}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(handleOnSubmit)(e);
        }}
        className="flex flex-col h-full gap-4"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
            <Icon name="file-contract" className="size-4" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Leasehold Analysis</h2>
        </div>

        {/* Lease Info */}
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

        {/* Land Value & Growth Config — inline (replaces modal) */}
        <div className="rounded-lg border border-gray-200 p-5 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md bg-gray-50 px-4 py-3">
              <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Land Area</div>
              <div className="flex items-baseline gap-1.5">
                <Icon name="ruler-combined" className="size-3.5 text-gray-400 shrink-0 relative top-0.5" />
                <span className="text-lg font-semibold text-gray-900">
                  {(propertyData?.totalLandAreaInSqWa ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-gray-500">Sq. Wa</span>
              </div>
            </div>
            <div className="rounded-md bg-gray-50 px-4 py-3">
              <label className="text-[11px] text-gray-400 uppercase tracking-wide mb-1 block">
                Land Value <span className="text-red-400">*</span>
              </label>
              <div className="flex items-baseline gap-1.5">
                <div className="w-28">
                  <NumberInput
                    name={landValueField.name}
                    ref={landValueField.ref}
                    value={landValueField.value}
                    onChange={(e) => landValueField.onChange(e.target.value)}
                    onBlur={landValueField.onBlur}
                    decimalPlaces={2}
                  />
                </div>
                <span className="text-xs text-gray-500">Baht/Sq.Wa</span>
              </div>
            </div>
            <div className="rounded-md bg-primary/5 border border-primary/10 px-4 py-3">
              <div className="text-[11px] text-primary/60 uppercase tracking-wide mb-1">Total Land Value</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-semibold text-primary">
                  {((landValueField.value ?? 0) * (propertyData?.totalLandAreaInSqWa ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-primary/60">Baht</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* Growth Rate Config */}
          <div className="space-y-3">
            <Toggle
              label="Land Value Growth Rate"
              options={['Frequency', 'Period']}
              checked={landGrowthRateType === 'Period'}
              onChange={(checked) => setValue('landGrowthRateType', checked ? 'Period' : 'Frequency', { shouldDirty: true })}
              size="sm"
            />

            {landGrowthRateType === 'Frequency' ? (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <NumberInput
                    label="Rate"
                    name={landGrowthPercentField.name}
                    ref={landGrowthPercentField.ref}
                    value={landGrowthPercentField.value}
                    onChange={(e) => landGrowthPercentField.onChange(e.target.value)}
                    onBlur={landGrowthPercentField.onBlur}
                    decimalPlaces={2}
                    rightIcon={<span className="text-xs text-gray-400">%</span>}
                  />
                </div>
                <span className="text-sm text-gray-500 pb-2">Every</span>
                <div className="flex-1">
                  <NumberInput
                    label="Interval"
                    name={landIntervalField.name}
                    ref={landIntervalField.ref}
                    value={landIntervalField.value}
                    onChange={(e) => landIntervalField.onChange(e.target.value)}
                    onBlur={landIntervalField.onBlur}
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
                {landPeriodFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-end">
                    <NumberInput
                      value={watch(`landGrowthPeriods.${index}.fromYear` as any) as number}
                      onChange={(e) => setValue(`landGrowthPeriods.${index}.fromYear` as any, e.target.value ?? 0, { shouldDirty: true })}
                      decimalPlaces={0}
                    />
                    <NumberInput
                      value={watch(`landGrowthPeriods.${index}.toYear` as any) as number}
                      onChange={(e) => setValue(`landGrowthPeriods.${index}.toYear` as any, e.target.value ?? 0, { shouldDirty: true })}
                      decimalPlaces={0}
                    />
                    <NumberInput
                      value={watch(`landGrowthPeriods.${index}.growthRatePercent` as any) as number}
                      onChange={(e) => setValue(`landGrowthPeriods.${index}.growthRatePercent` as any, e.target.value ?? 0, { shouldDirty: true })}
                      decimalPlaces={2}
                      rightIcon={<span className="text-xs text-gray-400">%</span>}
                    />
                    <button
                      type="button"
                      onClick={() => removeLandPeriod(index)}
                      className="flex items-center justify-center text-red-400 hover:text-red-600 pb-1"
                    >
                      <Icon name="xmark" className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => appendLandPeriod({ fromYear: 0, toYear: 0, growthRatePercent: 0 })}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Icon name="plus" className="size-3" />
                  Add Periods
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200" />

          {/* Building & Depreciation & Discount Rate */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5 block">
                Construction Cost Index
              </label>
              <div className="flex items-center gap-1">
                <div className="w-20">
                  <RHFInputCell fieldName="constructionCostIndex" inputType="number" number={{ decimalPlaces: 2 }} />
                </div>
                <span className="text-[10px] text-gray-400">%</span>
              </div>
            </div>
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5 block">
                Building Calc Start
              </label>
              <div className="flex items-center gap-1">
                <div className="w-14">
                  <RHFInputCell fieldName="buildingCalcStartYear" inputType="number" number={{ decimalPlaces: 0 }} />
                </div>
                <span className="text-[10px] text-gray-400">year(s)</span>
              </div>
            </div>
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5 block">
                Depreciation Rate
              </label>
              <div className="flex items-center gap-1">
                <div className="w-16">
                  <RHFInputCell fieldName="depreciationRate" inputType="number" number={{ decimalPlaces: 2 }} />
                </div>
                <span className="text-[10px] text-gray-400">% every</span>
                <div className="w-10">
                  <RHFInputCell fieldName="depreciationIntervalYears" inputType="number" number={{ decimalPlaces: 0 }} />
                </div>
                <span className="text-[10px] text-gray-400">yr</span>
              </div>
            </div>
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5 block">
                Discounted Rate
              </label>
              <div className="flex items-center gap-1">
                <div className="w-20">
                  <RHFInputCell fieldName="discountRate" inputType="number" number={{ decimalPlaces: 2 }} />
                </div>
                <span className="text-[10px] text-gray-400">%</span>
              </div>
            </div>
          </div>
        </div>
        {/* KPI Summary */}
        {tableResult && (
          <KpiSummaryStrip
            cards={[
              { label: 'Total Income', value: tableResult.totalIncomeOverLeaseTerm, icon: 'coins', color: 'blue' },
              { label: 'Value at Expiry', value: tableResult.valueAtLeaseExpiry, icon: 'building', color: 'gray' },
              { label: 'Final Value', value: tableResult.finalValueRounded, icon: 'circle-check', color: 'green', primary: true },
              {
                label: 'Effective Yield',
                value: tableResult.finalValueRounded
                  ? (tableResult.totalIncomeOverLeaseTerm / tableResult.finalValueRounded) * 100
                  : null,
                icon: 'chart-line',
                color: 'amber',
                suffix: '%',
              },
            ] satisfies KpiCard[]}
          />
        )}

        {/* Chart */}
        {tableResult && <LeaseholdChart result={tableResult} />}

        {/* Sensitivity */}
        {tableResult && (
          <SensitivityStrip
            currentRate={getValues('discountRate') ?? 0}
            calculateFinalValue={calcSensitivity}
          />
        )}

        {/* Table */}
        {tableResult ? (
          <LeaseholdTable result={tableResult} />
        ) : isLoading ? (
          <TableSkeleton />
        ) : null}

        {/* Partial Usage */}
        <LeaseholdPartialUsageSection
          finalValueRounded={finalValueRounded}
          landValuePerSqWa={getValues('landValuePerSqWa') ?? 0}
          onEstimateChange={(estimateRounded, estimateNet) => {
            setValue('estimatePriceRounded', estimateRounded);
            setEstimateNetPrice(estimateNet);
          }}
        />

        {/* Estimate Price */}
        <div className="text-sm divide-y divide-gray-100 border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-gray-600">Estimate Price (from PV)</span>
            <span className="text-xs font-medium text-gray-800 tabular-nums">
              {finalValueRounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {watch('isPartialUsage') && estimateNetPrice != null && (
            <>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-600">
                  <span className="font-bold mr-1">+</span>
                  Partial Land Price
                </span>
                <span className="text-xs font-medium text-gray-800 tabular-nums">
                  {((estimateNetPrice ?? finalValueRounded) - finalValueRounded).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-700 font-medium">
                  <span className="font-bold mr-1">=</span>
                  Appraisal Price w/ Partial Land
                </span>
                <span className="text-xs font-semibold text-gray-900 tabular-nums">
                  {(estimateNetPrice ?? finalValueRounded).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-semibold text-gray-900 shrink-0">Appraisal Price</span>
            <div className="flex items-center gap-2">
              {(() => {
                const rounded = Number(estimateField.value) || 0;
                const computed = roundToThousand(estimateNetPrice ?? finalValueRounded);
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
                  onChange={(e) => {
                    estimateField.onChange(e.target.value);
                  }}
                  onBlur={estimateField.onBlur}
                  decimalPlaces={2}
                  className="!font-bold !text-right !text-sm !text-green-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Assumptions */}
        <RemarkSection setValue={setValue} watch={watch} />

        {/* Footer */}
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
        <div key={i} className={`h-9 flex items-center px-3 border-t border-gray-200 ${i >= 2 ? 'bg-green-50' : 'bg-gray-50'}`}>
          <div className="bg-gray-300 rounded h-3 w-40" />
          <div className="ml-auto bg-gray-300 rounded h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
