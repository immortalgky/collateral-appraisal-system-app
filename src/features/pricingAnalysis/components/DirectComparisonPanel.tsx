import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  makeDirectComparisonDto,
  DirectComparisonDto,
  type DirectComparisonType,
} from '../schemas/directComparisonForm';
import { useEffect, useState } from 'react';
import type {
  CalculationType,
  ComparativeFactorType,
  FactorDataType,
  FactorScoreType,
  LinkedComparableType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';
import { useGetComparativeAnalysisTemplateById } from '@features/templateManagement/api/comparativeTemplate';
import { adaptTemplateFromApi } from '@features/pricingAnalysis/adapters/adaptTemplateFromApi';
import toast from 'react-hot-toast';
import { mapDirectComparisonFormToSubmitSchema } from '@features/pricingAnalysis/domain/mapDirectComparisonFormToSubmitSchema.ts';
import { useSaveComparativeAnalysis, useResetMethod } from '@features/pricingAnalysis/api';
import { initializeDirectComparisonForm } from '@features/pricingAnalysis/adapters/initializeDirectComparisonForm.ts';
import { syncDirectComparisonFormSurveys } from '@features/pricingAnalysis/adapters/syncDirectComparisonFormSurveys.ts';
import { restoreDirectComparisonFromSavedData } from '@features/pricingAnalysis/adapters/restoreDirectComparisonFromSavedData.ts';
import { DirectComparisonForm } from '@features/pricingAnalysis/components/DirectComparisonForm.tsx';
import ConfirmDialog from '@shared/components/ConfirmDialog.tsx';
import { useLinkedComparables } from '@features/pricingAnalysis/hooks/useLinkedComparables';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { Button, Icon } from '@/shared/components';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { MethodTopBarPortal } from './MethodTopBarPortal';
import { TemplatePopover } from './TemplatePopover';
import { directComparisonPath } from '../adapters/directComparisonFieldPath';
import { fmt } from '../domain/formatters';

interface DirectComparisonPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  properties: Record<string, unknown>[] | undefined;
  marketSurveys: MarketComparableDetailType[];
  allFactors: FactorDataType[] | undefined;
  templateList: TemplateDtoType[] | undefined;
  linkedComparables: LinkedComparableType[] | undefined;
  savedComparativeFactors?: ComparativeFactorType[];
  savedFactorScores?: FactorScoreType[];
  savedCalculations?: CalculationType[];
  savedComparativeAnalysisTemplateId?: string | null;
  savedFinalValueAdjusted?: number | null;
  savedLandValue?: number | null;
  savedBuildingCost?: number | null;
  savedAppraisalPrice?: number | null;
  savedHasBuildingCost?: boolean | null;
  savedIncludeLandArea?: boolean | null;
  manualSubject?: boolean;
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

export function DirectComparisonPanel({
  activeMethod,
  properties,
  marketSurveys,
  allFactors,
  templateList,
  linkedComparables,
  savedComparativeFactors,
  savedFactorScores,
  savedCalculations,
  savedComparativeAnalysisTemplateId,
  savedFinalValueAdjusted,
  savedLandValue,
  savedBuildingCost,
  savedAppraisalPrice,
  savedHasBuildingCost,
  savedIncludeLandArea,
  manualSubject,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: DirectComparisonPanelProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { methodId, methodType } = activeMethod ?? {};
  const isCostApproach = methodType === 'DC_COST';

  const property: Record<string, unknown> | undefined = isCostApproach
    ? (properties?.find(p => p.propertyType === 'L' || p.propertyType === 'LSL') ?? properties?.[0])
    : properties?.[0];
  const buildingCost =
    properties?.filter(p => p.propertyType === 'B' || p.propertyType === 'LSB') ?? [];

  const methods = useForm<DirectComparisonType>({
    mode: 'onSubmit',
    resolver: zodResolver(makeDirectComparisonDto(t)),
  });

  const {
    control,
    handleSubmit,
    getValues,
    reset,
    setValue,
    formState: { isDirty },
    trigger,
  } = methods;

  const isReadOnly = usePageReadOnly();
  // Stable id so the top-bar Save button (portaled outside this <form> via
  // MethodTopBarPortal) still submits it natively — see WQSPanel.tsx for why. Each
  // panel gets its own id (not a shared constant) so nothing collides if more than
  // one ever mounts at once.
  const formId = 'dc-panel-form';

  // Top-bar value: DC's Indicated Value lives in one of two fields depending on the
  // include-building-cost toggle — same branch the panel's own summary section
  // (DirectComparisonAdjustAppraisalPriceSection.tsx) already uses, so the bar and the
  // summary can never disagree.
  const includeBuildingCostForBar = useWatch({
    control,
    name: directComparisonPath.finalValueHasBuildingCost(),
  });
  const appraisalPriceRoundedForBar = useWatch({
    control,
    name: directComparisonPath.appraisalPriceRounded(),
  });
  const appraisalPriceIncludeBuildingCostRoundedForBar = useWatch({
    control,
    name: directComparisonPath.finalValueAppraisalPriceIncludeBuildingCostRounded(),
  });
  const indicatedValue = includeBuildingCostForBar
    ? appraisalPriceIncludeBuildingCostRoundedForBar
    : appraisalPriceRoundedForBar;

  /** Linked comparables — syncs with server on select/deselect */
  const { comparativeSurveys, syncSelection } = useLinkedComparables({
    pricingAnalysisId: activeMethod?.pricingAnalysisId,
    methodId: methodId,
    marketSurveys,
    linkedComparables,
  });
  const handleOnSelectComparativeMarketSurvey = (surveys: MarketComparableDetailType[]) => {
    syncSelection(surveys);
  };

  const [collateralType, setCollateralType] = useState<string>('');
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<TemplateDetailType | undefined>();
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  const selectedTemplateId = (templateList ?? []).find(
    t => t.templateCode === selectedTemplateCode,
  )?.id;
  const templateDetailQuery = useGetComparativeAnalysisTemplateById(selectedTemplateId);

  const [isShowResetDialog, setIsShowResetDialog] = useState<boolean>(false);

  const saveMutation = useSaveComparativeAnalysis();
  const resetMutation = useResetMethod();

  /** Form handler — skips full Zod validation so we can save factors/scores independently */
  const handleOnSubmit = async () => {
    if (!activeMethod?.pricingAnalysisId || !methodId) {
      toast.error(t('toasts.missingIds'));
      return;
    }

    const value = getValues();

    try {
      // Toggle-aware: with building cost, the user's "Appraisal Price (rounded)" lives in
      // appraisalPriceIncludeBuildingCostRounded; otherwise in appraisalPriceRounded.
      const ap = value.directComparisonAppraisalPrice as any;
      const hbc = !!ap?.hasBuildingValue;
      const appraisalValue =
        (hbc ? ap?.appraisalPriceIncludeBuildingCostRounded : ap?.appraisalPriceRounded) ?? null;

      const request = mapDirectComparisonFormToSubmitSchema({
        DirectComparisonForm: value,
        comparativeAnalysisTemplateId: selectedTemplateId,
      });

      await saveMutation.mutateAsync({
        id: activeMethod.pricingAnalysisId,
        methodId,
        request,
      });
      if (appraisalValue && activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue,
        });
      }
      toast.success(t('toasts.saved'));
      reset(value);
    } catch {
      toast.error(t('toasts.failedSave'));
    }
  };

  const handleOnGenerate = async () => {
    if (!selectedTemplateId || !collateralType) {
      trigger('pricingTemplateCode');
      trigger('collateralType');
      return;
    }

    setIsGenerated(false);

    let template: TemplateDetailType | undefined;
    // Ensure template detail is fetched before initializing
    let templateData = templateDetailQuery.data;
    if (!templateData && selectedTemplateId) {
      const result = await templateDetailQuery.refetch();
      templateData = result.data;
    }
    if (templateData && allFactors) {
      template = adaptTemplateFromApi(templateData, allFactors);
    }
    setPricingTemplate(template);

    // single source of truth: init now (use existing linked comparables)
    initializeDirectComparisonForm({
      collateralType,
      methodId: methodId!,
      methodType: methodType!,
      comparativeSurveys,
      property: property,
      template,
      allFactors,
      reset,
    });

    setValue('generateAt', new Date().toISOString(), { shouldDirty: true });
    setIsGenerated(true);
  };

  const handleOnSelectCollateralType = (collateralType: string) => {
    setCollateralType(collateralType);
    setSelectedTemplateCode('');
    setValue('pricingTemplateCode', null, { shouldDirty: true });
  };

  const handleOnSelectTemplate = (templateCode: string) => {
    setSelectedTemplateCode(templateCode);
  };

  /** reset handler */
  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    if (!activeMethod?.pricingAnalysisId || !methodId) return;
    try {
      await resetMutation.mutateAsync({
        pricingAnalysisId: activeMethod.pricingAnalysisId,
        methodId,
      });
      setIsGenerated(false);
      setPricingTemplate(undefined);
      reset();
      toast.success(t('toasts.resetSuccess'));
    } catch {
      toast.error(t('toasts.failedReset'));
    }
  };

  // Auto-show table when linked comparables already exist from the API
  useEffect(() => {
    if (isGenerated || comparativeSurveys.length === 0) return;
    // A saved reference (e.g. opened from the group References section) has no live
    // subject `property` but does have saved data to restore — never block a restore.
    const hasSavedData = !!(savedComparativeFactors && savedComparativeFactors.length > 0);
    if (!methodId || !methodType || (!manualSubject && !property && !hasSavedData)) return;

    // Restore from saved data if available
    if (savedComparativeFactors && savedComparativeFactors.length > 0) {
      restoreDirectComparisonFromSavedData({
        methodId,
        property: property ?? {},
        comparativeSurveys,
        allFactors,
        linkedComparables,
        savedComparativeFactors,
        savedFactorScores,
        savedCalculations,
        reset,
      });
      // Restore user-overridden Final Value (Baht/area) so the seed rule doesn't reseed
      // it from the grid's recomputed finalValueRounded.
      if (savedFinalValueAdjusted != null && savedFinalValueAdjusted !== 0) {
        setValue('directComparisonFinalValue.finalValueAdjusted' as any, savedFinalValueAdjusted, {
          shouldDirty: true,
        });
      }
      // Restore toggles BEFORE the rounded inputs so we pick the right target path.
      if (savedHasBuildingCost != null) {
        setValue('directComparisonAppraisalPrice.hasBuildingValue' as any, savedHasBuildingCost, {
          shouldDirty: false,
        });
      }
      if (savedIncludeLandArea != null) {
        setValue('directComparisonAppraisalPrice.includeLandArea' as any, savedIncludeLandArea, {
          shouldDirty: false,
        });
      }
      // Restore the user-rounded Appraisal Price into the visible input.
      // With building cost: appraisalPriceIncludeBuildingCostRounded.
      // Without:           appraisalPriceRounded.
      const hbc = savedHasBuildingCost === true;
      if (savedAppraisalPrice != null && savedAppraisalPrice !== 0) {
        const targetPath = hbc
          ? 'directComparisonAppraisalPrice.appraisalPriceIncludeBuildingCostRounded'
          : 'directComparisonAppraisalPrice.appraisalPriceRounded';
        setValue(targetPath as any, savedAppraisalPrice, { shouldDirty: true });
      }
      // With building cost, also restore "Land Price (rounded)" which is bound to appraisalPriceRounded.
      if (hbc && savedLandValue != null && savedLandValue !== 0) {
        setValue('directComparisonAppraisalPrice.appraisalPriceRounded' as any, savedLandValue, {
          shouldDirty: true,
        });
      }
      if (savedBuildingCost != null && savedBuildingCost !== 0) {
        setValue('directComparisonAppraisalPrice.buildingValue' as any, savedBuildingCost, {
          shouldDirty: true,
        });
      }
      // Restore template selection from saved data
      if (savedComparativeAnalysisTemplateId) {
        const savedTemplate = (templateList ?? []).find(
          t => t.id === savedComparativeAnalysisTemplateId,
        );
        if (savedTemplate) {
          if (savedTemplate.propertyType) {
            setCollateralType(savedTemplate.propertyType);
            setValue('collateralType', savedTemplate.propertyType);
          }
          if (savedTemplate.templateCode) {
            setSelectedTemplateCode(savedTemplate.templateCode);
            setValue('pricingTemplateCode', savedTemplate.templateCode);
          }
        }
      }
      setIsGenerated(true);
      return;
    }

    initializeDirectComparisonForm({
      collateralType: '',
      methodId,
      methodType,
      comparativeSurveys,
      property: property,
      template: undefined,
      allFactors,
      reset,
    });
    setIsGenerated(true);
  }, [
    comparativeSurveys,
    isGenerated,
    methodId,
    methodType,
    property,
    reset,
    savedComparativeFactors,
  ]);

  // Restore pricingTemplate when template detail query resolves (e.g. after restore from saved data)
  useEffect(() => {
    if (pricingTemplate) return;
    if (!isGenerated) return;
    if (!templateDetailQuery.data || !allFactors) return;
    const template = adaptTemplateFromApi(templateDetailQuery.data, allFactors);
    setPricingTemplate(template);
  }, [templateDetailQuery.data, allFactors, isGenerated, pricingTemplate]);

  // Re-init form when comparative surveys change (e.g. user selects/deselects from modal)
  useEffect(() => {
    if (!isGenerated) return;
    if (!methodId || !methodType || (!manualSubject && !property)) return;

    // Only re-init when the set of surveys actually changed
    const formSurveyIds = (getValues('comparativeSurveys') ?? [])
      .map((s: { marketId?: string }) => s.marketId)
      .sort()
      .join(',');
    const currentSurveyIds = comparativeSurveys
      .map(s => s.id)
      .sort()
      .join(',');
    if (formSurveyIds === currentSurveyIds) return;

    syncDirectComparisonFormSurveys({
      comparativeSurveys: comparativeSurveys,
      reset: reset,
      getValues: getValues,
    });
  }, [
    comparativeSurveys,
    comparativeSurveys.length,
    getValues,
    methodId,
    methodType,
    property,
    setValue,
  ]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    onCalculationMethodDirty(isDirty);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, onCalculationMethodDirty]);

  return (
    <FormProvider methods={methods} schema={DirectComparisonDto}>
      <MethodTopBarPortal slot="chip">
        {/* Template chip — replaces the old PricingAnalysisTemplateSelector card; same
            fields/handlers, now a popover anchored to the top bar beside the method name. */}
        <TemplatePopover
          valueLabel={selectedTemplateCode}
          onSelectCollateralType={handleOnSelectCollateralType}
          templateOptions={(templateList ?? [])
            .filter(t => t.propertyType === collateralType)
            .map(t => ({ value: t.templateCode, label: t.templateName }))}
          onSelectTemplate={handleOnSelectTemplate}
          onGenerate={handleOnGenerate}
          isReadOnly={isReadOnly}
        />
      </MethodTopBarPortal>
      <MethodTopBarPortal>
        {isGenerated && (
          <>
            <div className="flex flex-col items-end leading-tight shrink-0 px-1">
              <span className="text-[10px] text-gray-400">{t('finalValue.indicatedValue')}</span>
              <span className="text-sm font-semibold text-primary tabular-nums">
                {fmt(Number(indicatedValue) || 0)}
              </span>
            </div>
            {!isReadOnly && (
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
                {!!savedComparativeFactors?.length && (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={handleOnReset}
                    disabled={saveMutation.isPending}
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
          </>
        )}
      </MethodTopBarPortal>
      <form
        id={formId}
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(handleOnSubmit)(e);
        }}
        className="flex flex-col h-full gap-4"
      >
        {isGenerated && (
          <div className="flex-1 min-h-0 overflow-auto">
            <DirectComparisonForm
              {...methods}
              property={property ?? {}}
              buildingCost={buildingCost}
              isCostApproach={isCostApproach}
              marketSurveys={marketSurveys}
              comparativeMarketSurveys={comparativeSurveys}
              template={pricingTemplate}
              allFactors={allFactors ?? []}
              onSelectComparativeMarketSurvey={handleOnSelectComparativeMarketSurvey}
              manualSubject={manualSubject}
            />
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
