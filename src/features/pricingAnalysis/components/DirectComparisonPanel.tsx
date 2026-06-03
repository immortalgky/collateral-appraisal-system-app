import { useForm, type SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { DirectComparisonDto, type DirectComparisonType } from '../schemas/directComparisonForm';
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
import { flattenRHFErrors } from '@features/pricingAnalysis/domain/flattenRHFErrors.ts';
import { mapDirectComparisonFormToSubmitSchema } from '@features/pricingAnalysis/domain/mapDirectComparisonFormToSubmitSchema.ts';
import { useSaveComparativeAnalysis, useResetMethod } from '@features/pricingAnalysis/api';
import { initializeDirectComparisonForm } from '@features/pricingAnalysis/adapters/initializeDirectComparisonForm.ts';
import { syncDirectComparisonFormSurveys } from '@features/pricingAnalysis/adapters/syncDirectComparisonFormSurveys.ts';
import { restoreDirectComparisonFromSavedData } from '@features/pricingAnalysis/adapters/restoreDirectComparisonFromSavedData.ts';
import { PricingAnalysisTemplateSelector } from '@features/pricingAnalysis/components/PricingAnalysisTemplateSelector.tsx';
import { COLLATERAL_TYPE } from '@features/pricingAnalysis/data/constants';
import { DirectComparisonForm } from '@features/pricingAnalysis/components/DirectComparisonForm.tsx';
import { MethodFooterActions } from '@features/pricingAnalysis/components/MethodFooterActions.tsx';
import ConfirmDialog from '@shared/components/ConfirmDialog.tsx';
import { useLinkedComparables } from '@features/pricingAnalysis/hooks/useLinkedComparables';
import { FormProvider } from '@/shared/components/form/FormProvider';

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
    ? properties?.find(p => p.propertyType === 'L')
    : properties?.[0];
  const buildingCost = properties?.filter(p => p.propertyType === 'B') ?? [];

  const methods = useForm<DirectComparisonType>({
    mode: 'onSubmit',
    resolver: zodResolver(DirectComparisonDto),
  });

  const {
    handleSubmit,
    getValues,
    reset,
    setValue,
    formState: { isDirty },
    trigger,
  } = methods;

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
      const hbc = !!ap?.hasBuildingCost;
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

    setValue('generatedAt', new Date().toISOString(), { shouldDirty: true });
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
    if (!methodId || !methodType || (!manualSubject && !property)) return;

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
        setValue('directComparisonAppraisalPrice.hasBuildingCost' as any, savedHasBuildingCost, {
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
        setValue('directComparisonAppraisalPrice.buildingCost' as any, savedBuildingCost, {
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
      .map(s => s.marketId)
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
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(handleOnSubmit)(e);
        }}
        className="flex flex-col h-full gap-4"
      >
        <PricingAnalysisTemplateSelector
          icon="house-building"
          methodName={t('directComparison.methodName')}
          onGenerate={handleOnGenerate}
          collateralType={{
            fieldName: 'collateralType',
            onSelectCollateralType: handleOnSelectCollateralType,
            value: collateralType,
            group: 'PropertyType',
          }}
          template={{
            fieldName: 'pricingTemplateCode',
            onSelectTemplate: handleOnSelectTemplate,
            value: selectedTemplateCode,
            options: (templateList ?? [])
              .filter(t => t.propertyType === collateralType)
              .map(t => ({
                value: t.templateCode,
                label: t.templateName,
              })),
          }}
        />
        {isGenerated && (
          <>
            <div className="flex-1 min-h-0 overflow-auto">
              <DirectComparisonForm
                {...methods}
                property={property ?? {}}
                buildingCost={buildingCost}
                isCostApproach={isCostApproach}
                marketSurveys={marketSurveys}
                comparativeMarketSurveys={comparativeSurveys}
                template={pricingTemplate}
                allFactors={allFactors}
                onSelectComparativeMarketSurvey={handleOnSelectComparativeMarketSurvey}
                manualSubject={manualSubject}
              />
            </div>
            <MethodFooterActions
              onCancel={onCancelCalculationMethod}
              onReset={handleOnReset}
              showReset={!!savedComparativeFactors && savedComparativeFactors.length > 0}
              isSubmitting={saveMutation.isPending}
            />
          </>
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
