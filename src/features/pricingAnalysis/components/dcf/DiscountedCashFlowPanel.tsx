import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { DCFForm, type DCFFormType } from '../../schemas/dcfForm';
import { useEffect, useRef, useState } from 'react';
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
import { useGetPricingTemplates, useGetPricingTemplateByCode, useSaveIncomeAnalysis, useGetIncomeAnalysis, usePreviewIncomeAnalysis } from '../../api';
import { mapDCFFormToSaveRequest } from '../../mappers/formToSaveRequest';
import { mapIncomeAnalysisToDCFForm } from '../../mappers/analysisToForm';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { DiscountedCashFlowSummaryAssumption } from './DiscountedCashFlowSummaryAssumption';

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
  const saveMutation = useSaveIncomeAnalysis();
  const previewMutation = usePreviewIncomeAnalysis();

  // Watch the full section tree + scalar rate fields to trigger preview on any edit.
  const watchedSections = useWatch({ control: methods.control, name: 'sections' });
  const watchedCapitalizeRate = useWatch({ control: methods.control, name: 'capitalizeRate' });
  const watchedDiscountedRate = useWatch({ control: methods.control, name: 'discountedRate' });
  const watchedTotalNumberOfYears = useWatch({ control: methods.control, name: 'totalNumberOfYears' });
  const watchedTotalNumberOfDayInYear = useWatch({ control: methods.control, name: 'totalNumberOfDayInYear' });

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
    if (!activeMethod?.pricingAnalysisId || !activeMethod?.methodId) return;

    const currentValues = methods.getValues();
    // Guard: need at least templateCode to build a valid request.
    if (!currentValues.templateCode) return;

    let request: ReturnType<typeof mapDCFFormToSaveRequest>;
    try {
      request = mapDCFFormToSaveRequest(currentValues);
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
        request,
      },
      {
        onSuccess: (response) => {
          // Discard if a newer preview has already been fired, or if the user
          // switched to a different Income method while this request was in-flight.
          if (requestId !== latestPreviewRequestIdRef.current) return;
          if (requestMethodId !== activeMethod?.methodId) return;
          // keepDirtyValues preserves both the dirty flag AND the live typed value,
          // so mid-flight keystrokes are never overwritten by the stale server payload.
          reset(mapIncomeAnalysisToDCFForm(response), {
            keepDirtyValues: true,
            keepTouched: true,
            keepErrors: true,
          });
        },
        onError: (err) => {
          setSaveError(err instanceof Error ? `Preview failed: ${err.message}` : 'Preview failed');
        },
      },
    );
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
    if (!activeMethod?.pricingAnalysisId || !activeMethod?.methodId) return;
    setSaveError(null);
    try {
      const request = mapDCFFormToSaveRequest(values);
      const result = await saveMutation.mutateAsync({
        pricingAnalysisId: activeMethod.pricingAnalysisId,
        methodId: activeMethod.methodId,
        request,
      });
      reset(mapIncomeAnalysisToDCFForm(result));
      if (activeMethod.approachType && activeMethod.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue: result.finalValueRounded ?? 0,
        });
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
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
            {previewMutation.isPending && (
              <span className="text-xs text-gray-400 px-1">Computing…</span>
            )}
            <DiscountedCashFlowTable
              totalNumberOfYears={getValues('totalNumberOfYears')}
              properties={properties ?? []}
              isReadOnly={isReadOnly}
            />

            <DiscountedCashFlowSummaryAssumption
              properties={properties ?? []}
              getValues={getValues}
              showAssumptionSummary={showAssumptionSummary}
              onShowAssumptionSummary={() => setShowAssumptionSummary(!showAssumptionSummary)}
            />

            <DiscountedCashFlowHighestBestUsed isReadOnly={isReadOnly} />

            {saveError && (
              <p className="text-sm text-red-600 px-1">{saveError}</p>
            )}

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
