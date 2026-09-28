import { zodResolver } from '@hookform/resolvers/zod';
import {
  useForm,
  useWatch,
  type UseFormGetFieldState,
  type UseFormSetValue,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { DCFForm, type DCFFormType } from '../../schemas/dcfForm';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { DiscountedCashFlowTable } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import clsx from 'clsx';
import { Button, Icon } from '@/shared/components';
import { TemplatePopover } from '../TemplatePopover';
import { MethodTopBarPortal } from '../MethodTopBarPortal';
import { MethodTabs } from '../MethodTabs';
import {
  MethodWorkArea,
  MethodToolbarToggle,
  MethodRailSectionTitle,
  MethodRailField,
} from '../MethodWorkArea';
import { DenseProvider, RHFInputCell } from '../table/RHFInputCell';
import { KpiSummaryStrip, type KpiCard } from '../KpiSummaryStrip';
import { fmt } from '../../domain/formatters';
import { dcfAssumptionLabel } from '../../domain/dcf/dcfNameLabel';
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
  useResetMethod,
} from '../../api';
import { useQueryClient } from '@tanstack/react-query';
import { pricingAnalysisKeys } from '../../api/queryKeys';
import { mapDCFFormToSaveRequest } from '../../mappers/formToSaveRequest';
import { mapIncomeAnalysisToDCFForm } from '../../mappers/analysisToForm';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { DiscountedCashFlowAssumptionSheet } from './DiscountedCashFlowAssumptionSheet';
import { CashflowTimelineChart } from '../viz/CashflowTimelineChart';
import { useIncomeScenarioResults } from '../../domain/useIncomeScenarioResults';
import toast from 'react-hot-toast';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetAppraisalById } from '@/features/appraisal/api/appraisal';
import { findLeaseProperty, isLeasePropertyType } from '../../utils/leaseProperty';
import DataErrorState from '@/shared/components/DataErrorState';

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
  /** Passed through for the market-reference launcher on the HBU land price field */
  marketSurveys?: import('@/features/pricingAnalysis/schemas').MarketComparableDetailType[];
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
  /** HBU: the group's land from its title deeds, sq.wa (0 = none recorded). */
  groupLandSqWa?: number;
}
export function DiscountedCashFlowPanel({
  activeMethod,
  properties,
  marketSurveys,
  templateList: _templateList,
  onCalculationSave,
  onCalculationMethodDirty: _onCalculationMethodDirty,
  onCancelCalculationMethod,
  groupLandSqWa = 0,
}: DiscountedCashFlowPanelProps) {
  const isReadOnly = usePageReadOnly();
  const { t } = useTranslation('pricingAnalysis');
  const methods = useForm<DCFFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(DCFForm),
    // shouldUnregister: true,
  });

  const { reset, getValues, setValue, handleSubmit, formState, trigger } = methods;

  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('');
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Stable id so the portaled top-bar Save still submits this <form> — see WQSPanel.tsx.
  const formId = 'dcf-panel-form';
  // mock:1284-style defaults: assumptions rail open, chart closed.
  const [showRail, setShowRail] = useState(true);
  const [showChart, setShowChart] = useState(false);

  const {
    data: pricingTemplates = [],
    isError: isPricingTemplatesError,
    refetch: refetchPricingTemplates,
  } = useGetPricingTemplates(true);
  const {
    data: templateDto,
    isError: isTemplateDtoError,
    refetch: refetchTemplateDto,
  } = useGetPricingTemplateByCode(selectedTemplateCode || undefined);

  const appraisalId = useAppraisalId() ?? '';
  const appraisalQuery = useGetAppraisalById(appraisalId || undefined);
  const propertyId =
    (findLeaseProperty(properties)?.propertyId as string) ?? properties?.[0]?.propertyId ?? '';

  const saveMutation = useSaveIncomeAnalysis();
  const previewMutation = usePreviewIncomeAnalysis();
  const resetMutation = useResetMethod();
  const queryClient = useQueryClient();

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
  const watchedTemplateCode = useWatch({ control: methods.control, name: 'templateCode' });
  const watchedAppraisalPriceRounded = useWatch({
    control: methods.control,
    name: 'appraisalPriceRounded',
  });
  // The computed method value (HBU-aware: income, or income + split land) — derived into
  // the form by DiscountedCashFlowHighestBestUsed's rules.
  const watchedAppraisalPrice = useWatch({ control: methods.control, name: 'appraisalPrice' });

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
    (values: DCFFormType) => {
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
    if (!selectedTemplateCode) {
      trigger('templateCode');
      return;
    }

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

  const [isShowResetDialog, setIsShowResetDialog] = useState<boolean>(false);
  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    if (!activeMethod?.pricingAnalysisId || !activeMethod?.methodId) return;
    try {
      await resetMutation.mutateAsync(
        {
          pricingAnalysisId: activeMethod.pricingAnalysisId,
          methodId: activeMethod.methodId,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: pricingAnalysisKeys.incomeAnalysis(
                activeMethod.pricingAnalysisId!,
                activeMethod.methodId!,
              ),
            });
          },
        },
      );
      setIsGenerated(false);
      setSelectedTemplateCode('');
      reset();
      toast.success(t('toasts.resetSuccess'));
    } catch {
      toast.error(t('toasts.failedReset'));
    }
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
          // edited ?? computed — `values.appraisalPrice` is the computed method value
          // (it includes the HBU split land, which finalValueRounded does not).
          appraisalValue:
            result.indicatedValue ?? values.appraisalPrice ?? result.finalValueRounded ?? 0,
        });
      }
      toast.success(t('toasts.saved'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('toasts.saveFailed');
      setSaveError(message);
      toast.error(`${t('toasts.saveFailed')}: ${message}`);
    }
  });

  /**
   * Ensures the income analysis exists (saved) and returns its id.
   * If already saved, returns immediately. Otherwise performs a silent save
   * so the room-income reference button can use the id as anchorId.
   * Used as `onBeforeOpen` on the room MarketReferenceButton.
   */
  const ensureIncomeAnalysisId = useCallback(async (): Promise<string | undefined> => {
    if (incomeAnalysisQuery.data?.id) return incomeAnalysisQuery.data.id;
    if (
      !activeMethod?.pricingAnalysisId ||
      !activeMethod?.methodId ||
      !appraisalId ||
      !propertyId
    ) {
      toast.error(t('toasts.missingIds'));
      return undefined;
    }
    try {
      const values = methods.getValues();
      const request = mapDCFFormToSaveRequest(values);
      const result = await saveMutation.mutateAsync({
        pricingAnalysisId: activeMethod.pricingAnalysisId,
        methodId: activeMethod.methodId,
        appraisalId,
        propertyId,
        request,
      });
      reset(mapIncomeAnalysisToDCFForm(result));
      return result.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('toasts.saveFailed');
      toast.error(`${t('toasts.saveFailed')}: ${message}`);
      return undefined;
    }
  }, [
    incomeAnalysisQuery.data?.id,
    activeMethod?.pricingAnalysisId,
    activeMethod?.methodId,
    appraisalId,
    propertyId,
    methods,
    saveMutation,
    reset,
    t,
  ]);

  if (isPricingTemplatesError || isTemplateDtoError) {
    const handleRetry = () => {
      if (isPricingTemplatesError) refetchPricingTemplates();
      if (isTemplateDtoError) refetchTemplateDto();
    };
    return <DataErrorState title={t('errors.loadFailed')} onRetry={handleRetry} />;
  }

  const templateOptions = [...pricingTemplates]
    .sort((a, b) => a.displaySeq - b.displaySeq)
    .map(tpl => ({ value: tpl.code, label: tpl.name }));
  const activeTemplateCode = selectedTemplateCode || watchedTemplateCode;
  const templateLabel =
    templateOptions.find(o => o.value === activeTemplateCode)?.label ?? activeTemplateCode ?? '';
  const isSubmitting = formState.isSubmitting || saveMutation.isPending;
  // Year 1 = the year after the appraisal date (user rule, 2026-09-21). `appraisalDate` is
  // ValuationDate with the appointment only as fallback (vw_AppraisalDetail), never the
  // appointment first.
  const appraisalDate = appraisalQuery.data?.appraisalDate;
  const firstYearBE = appraisalDate ? new Date(appraisalDate).getFullYear() + 543 + 1 : null;

  // mock dcfSide(): the rail's room block edits the first income assumption whose method
  // is room/area based (01/02/04/06) — those four share the occupancy + growth field names.
  const roomAssumption = (() => {
    const sections = (watchedSections ?? []) as DCFFormType['sections'];
    for (const [si, sec] of sections.entries()) {
      if (sec.sectionType !== 'income') continue;
      for (const [ci, cat] of (sec.categories ?? []).entries()) {
        for (const [ai, asm] of (cat.assumptions ?? []).entries()) {
          const code = asm.method?.methodType;
          if (!code || !['01', '02', '04', '06'].includes(code)) continue;
          const detail = (asm.method?.detail ?? {}) as {
            avgDailyRate?: number[];
            avgRentalRate?: number[];
          };
          return {
            path: `sections.${si}.categories.${ci}.assumptions.${ai}.method.detail`,
            label: dcfAssumptionLabel(t, asm.assumptionType ?? '', asm.assumptionName ?? ''),
            adrFirstYear:
              (detail.avgDailyRate ?? detail.avgRentalRate ?? []).find(v => Number(v) > 0) ?? 0,
          };
        }
      }
    }
    return null;
  })();

  return (
    <FormProvider methods={methods} schema={DCFForm}>
      <MethodTopBarPortal slot="chip">
        <TemplatePopover
          valueLabel={templateLabel}
          templateFieldName="templateCode"
          templateOptions={templateOptions}
          onSelectTemplate={handleOnSelectTemplate}
          onGenerate={handleOnGenerate}
          isReadOnly={isReadOnly}
        />
      </MethodTopBarPortal>
      <MethodTopBarPortal>
        <div className="flex flex-col items-end leading-tight shrink-0 px-1">
          <span className="text-[10px] text-gray-400">{t('finalValue.indicatedValue')}</span>
          <span className="text-sm font-semibold text-primary tabular-nums">
            {fmt(watchedAppraisalPriceRounded ?? watchedAppraisalPrice ?? 0)}
          </span>
        </div>
        {!isReadOnly && (
          <>
            <span className="w-px h-5 bg-gray-200 shrink-0" />
            <Button
              variant="ghost"
              type="button"
              onClick={onCancelCalculationMethod}
              disabled={isSubmitting}
              className="h-[28px]! px-[12px]! py-0! text-[12.5px]! rounded-[7px]!"
            >
              {t('footer.cancel')}
            </Button>
            {!!incomeAnalysisQuery.data && (
              <Button
                variant="ghost"
                type="button"
                onClick={handleOnReset}
                disabled={isSubmitting}
                title={t('footer.reset')}
                aria-label={t('footer.reset')}
                className="h-[28px]! w-[28px]! px-0! py-0! rounded-[7px]! text-red-500 hover:text-red-600 shrink-0"
              >
                <Icon name="arrow-rotate-left" style="solid" className="size-[13px]" />
              </Button>
            )}
            <Button
              type="submit"
              form={formId}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="h-[28px]! px-[12px]! py-0! text-[12.5px]! rounded-[7px]!"
            >
              {!isSubmitting && (
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
          // HBU split must fit in the group's land (the API enforces the same rule).
          // Checked before handleSubmit, not inside it: the valid-callback never runs while
          // any other field fails schema validation, so the guard would silently not fire.
          const values = getValues();
          const splitWa = Number(values.highestBestUsed?.totalWa) || 0;
          if (!values.isHighestBestUsed && groupLandSqWa > 0 && splitWa > groupLandSqWa) {
            toast.error(t('methodTabs.dcf.hbu.splitExceeds', { max: fmt(groupLandSqWa) }));
            return;
          }
          handleOnSubmit(e);
        }}
        className="flex flex-col h-full min-h-0 gap-4"
      >
        {incomeAnalysisQuery.isLoading && (
          <div className="py-6 text-sm text-gray-500">{t('empty.noData')}</div>
        )}

        {!isLoading && isGenerated && (
          <MethodTabs
            tabs={[
              {
                id: 'calc',
                label: t('methodTabs.dcf.tabs.calc'),
                // mock:3512-3518 — KPI strip → year pager (portaled in by the table's
                // ScrollableTableContainer) → สมมติฐาน → กราฟ.
                tools: <DCFKpiStrip />,
                toolsAfterNav: (
                  <>
                    <MethodToolbarToggle
                      label={t('methodTabs.toggleAssumptions')}
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
                      compact
                      showRail={showRail}
                      rail={
                        <>
                          {/* Same RHF fieldNames the table and the Edit Assumption modal bind —
                              one value, several inputs, no copy. The modal snapshots these values
                              when it opens and its overlay blocks this rail while open, so the two
                              surfaces can't diverge. */}
                          <MethodRailSectionTitle>
                            {t('methodTabs.dcf.rail.coreTitle')}
                          </MethodRailSectionTitle>
                          <MethodRailField
                            label={t('methodTabs.dcf.rail.years')}
                            unit={t('dcf.common.years')}
                          >
                            <RHFInputCell
                              fieldName="totalNumberOfYears"
                              inputType="number"
                              disabled={isReadOnly}
                              number={{
                                decimalPlaces: 0,
                                maxIntegerDigits: 2,
                                maxValue: 99,
                                allowNegative: false,
                              }}
                            />
                          </MethodRailField>
                          <MethodRailField
                            label={t('methodTabs.dcf.rail.daysPerYear')}
                            unit={t('dcf.common.days')}
                          >
                            <RHFInputCell
                              fieldName="totalNumberOfDayInYear"
                              inputType="number"
                              disabled={isReadOnly}
                              number={{
                                decimalPlaces: 0,
                                maxIntegerDigits: 3,
                                maxValue: 370,
                                allowNegative: false,
                              }}
                            />
                          </MethodRailField>
                          <MethodRailSectionTitle>
                            {t('methodTabs.dcf.rail.valueTitle')}
                          </MethodRailSectionTitle>
                          <MethodRailField label={t('methodTabs.dcf.rail.discountRate')} unit="%">
                            <RHFInputCell
                              fieldName="discountedRate"
                              inputType="number"
                              disabled={isReadOnly}
                              number={{ decimalPlaces: 2 }}
                            />
                          </MethodRailField>
                          <MethodRailField label={t('methodTabs.dcf.rail.capRate')} unit="%">
                            <RHFInputCell
                              fieldName="capitalizeRate"
                              inputType="number"
                              disabled={isReadOnly}
                              number={{ decimalPlaces: 2 }}
                            />
                          </MethodRailField>
                          {roomAssumption && (
                            <>
                              <MethodRailSectionTitle>
                                {roomAssumption.label}
                              </MethodRailSectionTitle>
                              <MethodRailField
                                label={t('methodTabs.dcf.railRoom.occupancyFirstYear')}
                                unit="%"
                              >
                                <RHFInputCell
                                  fieldName={`${roomAssumption.path}.occupancyRateFirstYearPct`}
                                  inputType="number"
                                  disabled={isReadOnly}
                                  number={{
                                    decimalPlaces: 2,
                                    maxIntegerDigits: 3,
                                    maxValue: 100,
                                    allowNegative: false,
                                  }}
                                />
                              </MethodRailField>
                              <MethodRailField
                                label={t('methodTabs.dcf.railRoom.occupancyIncrease')}
                                unit="%"
                              >
                                <RHFInputCell
                                  fieldName={`${roomAssumption.path}.occupancyRatePct`}
                                  inputType="number"
                                  disabled={isReadOnly}
                                  number={{
                                    decimalPlaces: 2,
                                    maxIntegerDigits: 3,
                                    maxValue: 100,
                                    allowNegative: false,
                                  }}
                                />
                              </MethodRailField>
                              <MethodRailField
                                label={t('methodTabs.dcf.railRoom.every')}
                                unit={t('dcf.common.years')}
                              >
                                <RHFInputCell
                                  fieldName={`${roomAssumption.path}.occupancyRateYrs`}
                                  inputType="number"
                                  disabled={isReadOnly}
                                  number={{
                                    decimalPlaces: 0,
                                    maxIntegerDigits: 3,
                                    maxValue: 100,
                                    allowNegative: false,
                                  }}
                                />
                              </MethodRailField>
                              <MethodRailField
                                label={t('methodTabs.dcf.railRoom.roomRateIncrease')}
                                unit="%"
                              >
                                <RHFInputCell
                                  fieldName={`${roomAssumption.path}.increaseRatePct`}
                                  inputType="number"
                                  disabled={isReadOnly}
                                  number={{
                                    decimalPlaces: 2,
                                    maxIntegerDigits: 3,
                                    allowNegative: false,
                                  }}
                                />
                              </MethodRailField>
                              <MethodRailField
                                label={t('methodTabs.dcf.railRoom.every')}
                                unit={t('dcf.common.years')}
                              >
                                <RHFInputCell
                                  fieldName={`${roomAssumption.path}.increaseRateYrs`}
                                  inputType="number"
                                  disabled={isReadOnly}
                                  number={{
                                    decimalPlaces: 0,
                                    maxIntegerDigits: 3,
                                    allowNegative: false,
                                  }}
                                />
                              </MethodRailField>
                              <MethodRailField
                                label={t('methodTabs.dcf.railRoom.adrFirstYear')}
                                unit={t('methodTabs.dcf.railRoom.baht')}
                              >
                                <span className="text-xs font-medium text-gray-700 tabular-nums">
                                  {fmt(roomAssumption.adrFirstYear)}
                                </span>
                              </MethodRailField>
                            </>
                          )}
                          <p className="mt-2 text-[11px] text-gray-400">
                            {t('methodTabs.dcf.rail.note')}
                          </p>
                        </>
                      }
                    >
                      {showChart && <DCFChart />}
                      <div
                        className={clsx(
                          'flex flex-col flex-1 min-h-0 transition-opacity duration-200',
                          previewMutation.isPending && 'opacity-50 pointer-events-none',
                        )}
                        aria-busy={previewMutation.isPending}
                      >
                        <DiscountedCashFlowTable
                          totalNumberOfYears={getValues('totalNumberOfYears')}
                          firstYearBE={firstYearBE}
                          properties={properties ?? []}
                          isReadOnly={isReadOnly}
                          onStructuralChange={requestImmediatePreview}
                          incomeAnalysisId={incomeAnalysisQuery.data?.id}
                          hostMethodId={activeMethod?.methodId}
                          marketSurveys={marketSurveys}
                          ensureIncomeAnalysisId={ensureIncomeAnalysisId}
                        />
                      </div>
                      {saveError && <p className="text-sm text-red-600 px-1">{saveError}</p>}
                    </MethodWorkArea>
                  </DenseProvider>
                ),
              },
              {
                // HANDOFF 18a — replaces the old "ดูสรุปสมมติฐาน" button + modal.
                id: 'asm',
                label: t('methodTabs.dcf.tabs.asm'),
                content: (
                  <DiscountedCashFlowAssumptionSheet
                    properties={properties ?? []}
                    isReadOnly={isReadOnly}
                    onStructuralChange={requestImmediatePreview}
                    incomeAnalysisId={incomeAnalysisQuery.data?.id}
                    hostMethodId={activeMethod?.methodId}
                    marketSurveys={marketSurveys}
                    ensureIncomeAnalysisId={ensureIncomeAnalysisId}
                  />
                ),
              },
              {
                id: 'hbu',
                label: t('methodTabs.dcf.tabs.hbu'),
                content: (
                  <DiscountedCashFlowHighestBestUsed
                    isReadOnly={isReadOnly}
                    incomeAnalysisId={incomeAnalysisQuery.data?.id}
                    hostMethodId={activeMethod?.methodId}
                    pricingAnalysisId={activeMethod?.pricingAnalysisId}
                    marketSurveys={marketSurveys}
                    subjectProperty={
                      (properties ?? []).find(p => isLeasePropertyType(p.propertyType)) ??
                      properties?.[0]
                    }
                    ensureIncomeAnalysisId={ensureIncomeAnalysisId}
                    groupLandSqWa={groupLandSqWa}
                  />
                ),
              },
            ]}
          />
        )}

        {previewMutation.isPending && (
          <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-md">
            <span className="size-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            Calculating…
          </div>
        )}

        <ConfirmDialog
          isOpen={isShowResetDialog}
          onClose={() => setIsShowResetDialog(false)}
          onConfirm={handleOnConfirmReset}
          message={t('confirm.resetMethod')}
        />
      </form>
    </FormProvider>
  );
}

// Inner components — must render inside FormProvider so useFormContext works.

/** mock:2708 kpis — the flat toolbar strip on the calc tab (not the old KpiDashboard cards). */
function DCFKpiStrip() {
  const { t } = useTranslation('pricingAnalysis');
  const { cashflowData, totalPv } = useIncomeScenarioResults();
  if (cashflowData.length === 0) return null;
  const terminalValue =
    [...cashflowData].reverse().find(d => d.terminalRevenue != null)?.terminalRevenue ?? null;
  return (
    <KpiSummaryStrip
      variant="flat"
      cards={
        [
          {
            label: t('methodTabs.dcf.kpi.noiYear1'),
            value: cashflowData[0]?.noi ?? null,
          },
          { label: t('methodTabs.dcf.kpi.terminalValue'), value: terminalValue },
          { label: t('methodTabs.dcf.kpi.sumPv'), value: totalPv, primary: true },
        ] satisfies KpiCard[]
      }
    />
  );
}

/** Chart behind the "กราฟ" toggle, above the table (mock:2680 `chart`). */
function DCFChart() {
  const { cashflowData, discountRate, capitalizeRate } = useIncomeScenarioResults();
  if (cashflowData.length === 0) return null;
  return (
    <div className="shrink-0">
      <CashflowTimelineChart
        data={cashflowData}
        discountRate={discountRate / 100}
        capitalizeRate={capitalizeRate / 100}
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
