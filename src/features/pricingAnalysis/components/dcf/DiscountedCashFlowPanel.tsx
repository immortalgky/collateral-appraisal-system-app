import { zodResolver } from '@hookform/resolvers/zod';
import {
  useForm,
  useWatch,
  type UseFormGetFieldState,
  type UseFormSetValue,
} from 'react-hook-form';
import { DCFForm, type DCFFormType } from '../../schemas/dcfForm';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { DiscountedCashFlowTable } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import { PricingAnalysisTemplateSelector } from '@features/pricingAnalysis/components/PricingAnalysisTemplateSelector.tsx';
import { COLLATERAL_TYPE } from '@features/pricingAnalysis/data/constants.ts';
import { MethodFooterActions } from '@features/pricingAnalysis/components/MethodFooterActions.tsx';
import ConfirmDialog from '@shared/components/ConfirmDialog.tsx';
import { DiscountedCashFlowHighestBestUsed } from './DiscountedCashFlowHighestBestUsed';
import { usePageReadOnly } from '@shared/contexts/PageReadOnlyContext.tsx';
import { initializeDiscountedCashFlowForm } from '../../adapters/initializeDiscountedCashFlowForm';
import { pricingTemplateDtoToDcfTemplate } from '../../adapters/pricingTemplateDtoToDcfTemplate';
import {
  useGetPricingTemplates,
  useGetPricingTemplateByCode,
  useSaveIncomeAnalysis,
  useGetIncomeAnalysis,
  usePreviewIncomeAnalysis,
} from '../../api';
import { mapDCFFormToSaveRequest } from '../../mappers/formToSaveRequest';
import { mapIncomeAnalysisToDCFForm } from '../../mappers/analysisToForm';
import { useDebounce } from '@/shared/hooks/useDebounce';
import {
  DiscountedCashFlowSummaryAssumption,
  ViewAssumptionSummaryButton,
} from './DiscountedCashFlowSummaryAssumption';
import { KpiDashboard } from '../viz/KpiDashboard';
import { CashflowTimelineChart } from '../viz/CashflowTimelineChart';
import { SensitivityStrip } from '../SensitivityStrip';
import { useIncomeScenarioResults } from '../../domain/useIncomeScenarioResults';
import toast from 'react-hot-toast';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';

interface DiscountedCashFlowPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  properties: Record<string, unknown>[] | undefined;
  templateList: unknown;
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}
export function DiscountedCashFlowPanel({
  activeMethod,
  properties,
  onCalculationSave,
  onCalculationMethodDirty: _onCalculationMethodDirty,
  onCancelCalculationMethod,
}: DiscountedCashFlowPanelProps) {
  const isReadOnly = usePageReadOnly();
  const methods = useForm<DCFFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(DCFForm),
    // shouldUnregister: true,
  });

  const { reset, getValues, setValue, handleSubmit, formState } = methods;

  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('');
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAssumptionSummary, setShowAssumptionSummary] = useState(false);

  const { data: pricingTemplates = [] } = useGetPricingTemplates(true);
  const { data: templateDto } = useGetPricingTemplateByCode(selectedTemplateCode || undefined);

  const appraisalId = useAppraisalId() ?? '';
  const propertyId =
    ((properties ?? []).find(p => ['LS', 'LSL', 'LSB'].includes(p.propertyType))
      ?.propertyId as string) ??
    properties?.[0].propertyId ??
    '';

  const saveMutation = useSaveIncomeAnalysis();
  const previewMutation = usePreviewIncomeAnalysis();

  // Watch the full section tree + scalar rate fields to trigger preview on any edit.
  const watchedSections = useWatch({ control: methods.control, name: 'sections' });
  const watchedCapitalizeRate = useWatch({ control: methods.control, name: 'capitalizeRate' });
  const watchedDiscountedRate = useWatch({ control: methods.control, name: 'discountedRate' });
  const watchedTotalNumberOfYears = useWatch({
    control: methods.control,
    name: 'totalNumberOfYears',
  });
  const watchedTotalNumberOfDayInYear = useWatch({
    control: methods.control,
    name: 'totalNumberOfDayInYear',
  });

  // Debounce the full watched state so preview fires ~400ms after the last edit.
  const debouncedSections = useDebounce(watchedSections, 400);
  const debouncedCapitalizeRate = useDebounce(watchedCapitalizeRate, 400);
  const debouncedDiscountedRate = useDebounce(watchedDiscountedRate, 400);
  const debouncedTotalNumberOfYears = useDebounce(watchedTotalNumberOfYears, 400);
  const debouncedTotalNumberOfDayInYear = useDebounce(watchedTotalNumberOfDayInYear, 400);

  // Tracks the most recent preview request id. Stale responses (user edited
  // again before the prior request returned) are discarded via this ref.
  const latestPreviewRequestIdRef = useRef(0);
  // Content hash of the last payload we sent — used to suppress the loop where
  // response.reset() updates watched fields → new refs → debounce → useEffect →
  // same payload fires again. Content unchanged = skip.
  const lastSentPayloadHashRef = useRef<string | null>(null);

  const lastStructuralChangeRef = useRef(false);

  // Triggered by the management hook on add/remove
  const firePreview = useCallback(
    (values: DCFFormType, opts?: { force?: boolean }) => {
      if (!isGenerated) return;
      if (
        !activeMethod?.pricingAnalysisId ||
        !activeMethod?.methodId ||
        !appraisalId ||
        !propertyId
      )
        return;

      // Guard: need at least templateCode to build a valid request.
      if (!values.templateCode) return;

      // Skip preview while an "Add assumption" modal is open: the pending row is
      // appended with assumptionType=null and only gets a real type after the
      // modal saves. Check the raw form state because the mapper coerces null
      // to '' and keeps rows with methodType set.
      const hasPendingNewAssumption = (values.sections ?? []).some(
        (s: { categories?: { assumptions?: { assumptionType?: unknown }[] }[] }) =>
          (s.categories ?? []).some(c =>
            (c.assumptions ?? []).some(a => a.assumptionType == null || a.assumptionType === ''),
          ),
      );
      if (hasPendingNewAssumption) return;

      let request: ReturnType<typeof mapDCFFormToSaveRequest>;
      try {
        request = mapDCFFormToSaveRequest(values);
      } catch {
        return;
      }

      // Skip if the payload content is identical to the last one we sent —
      // prevents the response-triggered reset loop. Exclude computed fields
      // from the hash since those get overwritten by the server response and
      // shouldn't count as "user edits worth re-previewing".
      const payloadHash = JSON.stringify({
        templateCode: request.templateCode,
        totalNumberOfYears: request.totalNumberOfYears,
        totalNumberOfDayInYear: request.totalNumberOfDayInYear,
        capitalizeRate: request.capitalizeRate,
        discountedRate: request.discountedRate,
        sections: request.sections.map(s => ({
          sectionType: s.sectionType,
          identifier: s.identifier,
          clientId: s.clientId,
          categories: s.categories.map(c => ({
            categoryType: c.categoryType,
            identifier: c.identifier,
            clientId: c.clientId,
            assumptions: c.assumptions.map(a => ({
              assumptionType: a.assumptionType,
              identifier: a.identifier,
              clientId: a.clientId,
              methodTypeCode: a.methodTypeCode,
              detail: a.detail,
            })),
          })),
        })),
      });
      if (payloadHash === lastSentPayloadHashRef.current) return;
      lastSentPayloadHashRef.current = payloadHash;

      // Increment and capture the request id so we can discard stale responses.
      const requestId = ++latestPreviewRequestIdRef.current;
      // Snapshot the method at fire-time; bail if the user switched methods before the response arrives.
      const requestMethodId = activeMethod.methodId;

      previewMutation.mutate(
        {
          pricingAnalysisId: activeMethod.pricingAnalysisId,
          methodId: activeMethod.methodId,
          appraisalId: appraisalId,
          propertyId: propertyId,
          request,
        },
        {
          onSuccess: response => {
            // Discard if a newer preview has already been fired, or if the user
            // switched to a different Income method while this request was in-flight.
            if (requestId !== latestPreviewRequestIdRef.current) return;
            if (requestMethodId !== activeMethod?.methodId) return;
            // keepDirtyValues preserves both the dirty flag AND the live typed value,
            // so mid-flight keystrokes are never overwritten by the stale server payload.
            // reset(mapIncomeAnalysisToDCFForm(response), {
            //   keepDirtyValues: false,
            //   keepTouched: true,
            //   keepErrors: true,
            // });
            applyServerComputedFields(
              setValue,
              methods.getFieldState,
              mapIncomeAnalysisToDCFForm(response),
            );
          },
          onError: err => {
            setSaveError(
              err instanceof Error ? `Preview failed: ${err.message}` : 'Preview failed',
            );
          },
        },
      );
    },
    [
      isGenerated,
      activeMethod?.pricingAnalysisId,
      activeMethod?.methodId,
      activeMethod?.approachType,
      activeMethod?.methodType,
      appraisalId,
      propertyId,
      previewMutation,
      setValue,
    ],
  );

  const requestImmediatePreview = useCallback(() => {
    lastStructuralChangeRef.current = true;
    // Bypass the debounce by reading current values now
    void firePreview(methods.getValues());
  }, [firePreview, methods]);

  const handleOnGenerate = async () => {
    if (!templateDto) return;
    const dcfTemplate = pricingTemplateDtoToDcfTemplate(templateDto);
    initializeDiscountedCashFlowForm(dcfTemplate, reset);
    setIsGenerated(true);
  };

  const handleOnSelectTemplate = (templateCode: string) => {
    setSelectedTemplateCode(templateCode);
    setValue('templateCode', templateCode);
  };

  const incomeAnalysisQuery = useGetIncomeAnalysis(
    activeMethod?.pricingAnalysisId,
    activeMethod?.methodId,
  );

  // Restore saved analysis on mount. The ref ensures we only apply the initial
  // server value once — subsequent cache invalidations (after Save) feed through
  // handleOnSubmit's reset() instead, preventing double-fire on the saved data.
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (incomeAnalysisQuery.isSuccess && incomeAnalysisQuery.data) {
      reset(mapIncomeAnalysisToDCFForm(incomeAnalysisQuery.data));
      setIsGenerated(true);
      hasRestoredRef.current = true;
    }
  }, [incomeAnalysisQuery.isSuccess, incomeAnalysisQuery.data, reset]);

  // Fire preview whenever debounced watched fields change, but only after Generate/restore.
  useEffect(() => {
    if (!isGenerated) return;
    firePreview(methods.getValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isGenerated,
    debouncedSections,
    debouncedCapitalizeRate,
    debouncedDiscountedRate,
    debouncedTotalNumberOfYears,
    debouncedTotalNumberOfDayInYear,
  ]);

  // While fetching, suppress the picker so it never flashes before restore.
  const isLoading = !isGenerated && !incomeAnalysisQuery.isSuccess;

  // reset handler
  const [isShowResetDialog, setIsShowResetDialog] = useState<boolean>(false);
  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    // ...
    setIsGenerated(false);
  };

  const handleOnSubmit = handleSubmit(async (values: DCFFormType) => {
    if (!activeMethod?.pricingAnalysisId || !activeMethod?.methodId || !appraisalId || !propertyId)
      return;
    setSaveError(null);
    try {
      const request = mapDCFFormToSaveRequest(values);
      const result = await saveMutation.mutateAsync({
        pricingAnalysisId: activeMethod.pricingAnalysisId,
        methodId: activeMethod.methodId,
        appraisalId,
        propertyId,
        request,
      });
      reset(mapIncomeAnalysisToDCFForm(result));
      if (activeMethod.approachType && activeMethod.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue: result.appraisalPriceRounded ?? result.finalValueRounded ?? 0,
        });
      }
      toast.success('Saved!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setSaveError(message);
      toast.error(`Failed to save: ${message}`);
    }
  });

  return (
    <FormProvider methods={methods} schema={DCFForm}>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleOnSubmit(e);
        }}
      >
        {incomeAnalysisQuery.isLoading && (
          <div className="py-6 text-sm text-gray-500">Loading…</div>
        )}

        <PricingAnalysisTemplateSelector
          icon={'chart-line-up'}
          methodName={'Income'}
          onGenerate={handleOnGenerate}
          collateralType={{
            onSelectCollateralType: () => null,
            value: '',
            options: COLLATERAL_TYPE,
          }}
          template={{
            fieldName: 'templateCode',
            onSelectTemplate: handleOnSelectTemplate,
            value: selectedTemplateCode,
            options: [...pricingTemplates]
              .sort((a, b) => a.displaySeq - b.displaySeq)
              .map(t => ({ value: t.code, label: t.name })),
          }}
        />

        {!isLoading && (
          <div className="flex flex-col gap-4 mt-4">
            {isGenerated && <DCFVisualizationSection />}

            <div className="flex justify-end">
              <ViewAssumptionSummaryButton onClick={() => setShowAssumptionSummary(true)} />
            </div>
            <div className="relative">
              <div
                className={
                  previewMutation.isPending
                    ? 'opacity-50 pointer-events-none transition-opacity duration-200'
                    : 'transition-opacity duration-200'
                }
                aria-busy={previewMutation.isPending}
              >
                <DiscountedCashFlowTable
                  totalNumberOfYears={getValues('totalNumberOfYears')}
                  properties={properties ?? []}
                  isReadOnly={isReadOnly}
                  onStructuralChange={requestImmediatePreview}
                />
              </div>
              {previewMutation.isPending && (
                <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-md">
                  <span className="size-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  Calculating…
                </div>
              )}
            </div>

            <DiscountedCashFlowSummaryAssumption
              properties={properties ?? []}
              getValues={getValues}
              showAssumptionSummary={showAssumptionSummary}
              onShowAssumptionSummary={() => setShowAssumptionSummary(!showAssumptionSummary)}
            />
            <DiscountedCashFlowHighestBestUsed isReadOnly={isReadOnly} />

            {saveError && <p className="text-sm text-red-600 px-1">{saveError}</p>}

            {/* footer save, reset, cancel */}
            <MethodFooterActions
              onCancel={onCancelCalculationMethod}
              onReset={handleOnReset}
              showReset={isShowResetDialog}
              isSubmitting={formState.isSubmitting || saveMutation.isPending}
            />
          </div>
        )}

        <ConfirmDialog
          isOpen={isShowResetDialog}
          onClose={() => setIsShowResetDialog(false)}
          onConfirm={handleOnConfirmReset}
          message="Are you sure you want to reset this method? All calculation data will be cleared."
        />
      </form>
    </FormProvider>
  );
}

// Inner component — must be rendered inside FormProvider so useFormContext works.
function DCFVisualizationSection() {
  const { cashflowData, primaryKpi, secondaryKpis, discountRate, capitalizeRate } =
    useIncomeScenarioResults();

  return (
    <div className="flex flex-col gap-4">
      <KpiDashboard primary={primaryKpi} secondary={secondaryKpis} />

      {cashflowData.length > 0 && (
        <CashflowTimelineChart
          data={cashflowData}
          discountRate={discountRate / 100}
          capitalizeRate={capitalizeRate / 100}
        />
      )}

      <SensitivityStrip
        currentRate={discountRate}
        calculateFinalValue={rate => {
          // Recompute the DCF PV at the candidate discount rate using the
          // per-year cashflows the backend produced for the current scenario:
          //   PV(r) = Σ_{i=0..N-2} (grossRevenue[i] + terminalRevenue[i]) / (1+r)^(i+1)
          // The terminal value depends on capRate (not discount rate), so it's
          // carried in cashflowData[i].terminalRevenue at the appropriate year.
          // Direct-cap scenarios (length < 2) are not discount-rate sensitive.
          const years = cashflowData.length;
          if (years < 2) return null;
          const r = rate / 100;
          if (r < 0) return null;
          let pv = 0;
          for (let i = 0; i < years - 1; i++) {
            const gr = cashflowData[i]?.noi ?? 0;
            const term = cashflowData[i]?.terminalRevenue ?? 0;
            pv += (gr + term) / Math.pow(1 + r, i + 1);
          }
          return pv;
        }}
      />
    </div>
  );
}

function applyServerComputedFields(
  setValue: UseFormSetValue<DCFFormType>,
  getFieldState: UseFormGetFieldState<DCFFormType>,
  serverForm: DCFFormType,
) {
  // 1. Always overwrite — these are pure server-derived totals
  setValue('finalValue', serverForm.finalValue ?? 0, { shouldDirty: false });
  setValue('finalValueRounded', serverForm.finalValueRounded ?? 0, { shouldDirty: false });

  serverForm.sections.forEach((s, sIdx) => {
    setValue(`sections.${sIdx}.totalSectionValues`, s.totalSectionValues, {
      shouldDirty: false,
    });

    if (s.sectionType === 'summaryDCF' || s.sectionType === 'summaryDirect') {
      Object.entries(s).forEach(([k, v]) => {
        if (Array.isArray(v) && k !== 'totalSectionValues' && k !== 'categories') {
          setValue(`sections.${sIdx}.${k}` as any, v, { shouldDirty: false });
        }
      });
    }

    s.categories?.forEach((c, cIdx) => {
      setValue(`sections.${sIdx}.categories.${cIdx}.totalCategoryValues`, c.totalCategoryValues, {
        shouldDirty: false,
      });

      c.assumptions?.forEach((a, aIdx) => {
        const path = `sections.${sIdx}.categories.${cIdx}.assumptions.${aIdx}` as const;

        // Server-only — always overwrite
        setValue(`${path}.totalAssumptionValues`, a.totalAssumptionValues, { shouldDirty: false });
        setValue(`${path}.method.totalMethodValues`, a.method?.totalMethodValues ?? [], {
          shouldDirty: false,
        });

        // 2. Server-suggested-but-user-overridable — write only if not dirty
        const detail = a.method?.detail as { occupancy?: unknown[] } | undefined;
        if (detail?.occupancy && Array.isArray(detail.occupancy)) {
          detail.occupancy.forEach((cellValue, yearIdx) => {
            const occPath = `${path}.method.detail.occupancy.${yearIdx}` as const;
            if (!getFieldState(occPath as any).isDirty) {
              setValue(occPath as any, cellValue, { shouldDirty: false });
            }
          });
        }
      });
    });
  });
}
