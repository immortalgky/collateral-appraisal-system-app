import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import toast from 'react-hot-toast';
import { flattenRHFErrors } from '@features/pricingAnalysis/domain/flattenRHFErrors.ts';
import { mapDirectComparisonFormToSubmitSchema } from '@features/pricingAnalysis/domain/mapDirectComparisonFormToSubmitSchema.ts';
import { useSaveComparativeAnalysis } from '@features/pricingAnalysis/api';
import { initializeDirectComparisonForm } from '@features/pricingAnalysis/adapters/initializeDirectComparisonForm.ts';
import { syncDirectComparisonFormSurveys } from '@features/pricingAnalysis/adapters/syncDirectComparisonFormSurveys.ts';
import { restoreDirectComparisonFromSavedData } from '@features/pricingAnalysis/adapters/restoreDirectComparisonFromSavedData.ts';
import { PricingAnalysisTemplateSelector } from '@features/pricingAnalysis/components/PricingAnalysisTemplateSelector.tsx';
import { COLLATERAL_TYPE } from '@features/pricingAnalysis/data/constants';
import { DirectComparisonForm } from '@features/pricingAnalysis/components/DirectComparisonForm.tsx';
import { MethodFooterActions } from '@features/pricingAnalysis/components/MethodFooterActions.tsx';
import ConfirmDialog from '@shared/components/ConfirmDialog.tsx';
import { useLinkedComparables } from '@features/pricingAnalysis/hooks/useLinkedComparables';

interface DirectComparisonPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  property: Record<string, unknown> | undefined;
  marketSurveys: MarketComparableDetailType[];
  allFactors: FactorDataType[] | undefined;
  methodTemplates: TemplateDetailType[] | null | undefined;
  linkedComparables: LinkedComparableType[] | undefined;
  savedComparativeFactors?: ComparativeFactorType[];
  savedFactorScores?: FactorScoreType[];
  savedCalculations?: CalculationType[];
  onCalculationSave: (payload: { approachType: string; methodType: string; appraisalValue: number }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

export function DirectComparisonPanel({
  activeMethod,
  property,
  marketSurveys,
  allFactors,
  methodTemplates: templates,
  linkedComparables,
  savedComparativeFactors,
  savedCalculations,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: DirectComparisonPanelProps) {
  const { methodId, methodType } = activeMethod ?? {};

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
  const [pricingTemplateType, setPricingTemplateType] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<TemplateDetailType | undefined>();
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  /** cancel calculation dialog state */
  const [isShowCanceledDialog, setisShowCanceledDialog] = useState<boolean>(false);

  const saveMutation = useSaveComparativeAnalysis();

  /** Form handler — skips full Zod validation so we can save factors/scores independently */
  const handleOnSubmit = async () => {
    if (!activeMethod?.pricingAnalysisId || !methodId) {
      toast.error('Pricing analysis ID or method ID not found!');
      return;
    }

    const value = getValues();

    try {
      const request = mapDirectComparisonFormToSubmitSchema({
        DirectComparisonForm: value,
      });

      await saveMutation.mutateAsync({
        id: activeMethod.pricingAnalysisId,
        methodId,
        request,
      });

      const appraisalValue = value.directComparisonAppraisalPrice?.appraisalPriceRounded;
      if (appraisalValue && activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue,
        });
      }
      toast.success('Saved!');
      reset(value);
    } catch {
      toast.error('Failed to save comparative analysis');
    }
  };

  const handleOnSaveDraft = () => {
    const currentValue = getValues();
    reset(currentValue);
  };

  const handleOnGenerate = () => {
    setIsGenerated(false);

    const template = (templates ?? []).find(t => t?.templateCode === pricingTemplateType);
    setPricingTemplate(template);

    // single source of truth: init now (use existing linked comparables)
    initializeDirectComparisonForm({
      collateralType,
      methodId: methodId!,
      methodType: methodType!,
      comparativeSurveys,
      property: property!,
      template,
      allFactors,
      reset,
    });

    setValue('generatedAt', new Date().toISOString(), { shouldDirty: true });
    setIsGenerated(true);
  };

  const handleOnSelectCollateralType = (collateralType: string) => {
    setCollateralType(collateralType);
  };

  const handleOnSelectTemplate = (templateId: string) => {
    setPricingTemplateType(templateId);
  };

  /** cancel calculation handler */
  const handleOnCancelCalculationMethod = () => {
    setisShowCanceledDialog(true);
  };

  const handleOnConfirmCancelCalculationMethod = () => {
    onCancelCalculationMethod();
    setisShowCanceledDialog(false);
  };

  const handleOnDenyCancelCalculationMethod = () => {
    setisShowCanceledDialog(false);
  };

  const onInvalid: SubmitErrorHandler<DirectComparisonType> = errs => {
    const messages = flattenRHFErrors(errs);

    toast.error(
      <div>
        <div className="font-semibold">Please fix these fields</div>
        <ul className="mt-1 list-disc pl-5">
          {messages.slice(0, 6).map(m => (
            <li key={m} className={'text-wrap'}>
              {m}
            </li>
          ))}
        </ul>
      </div>,
      { id: 'direct-comparison-form-errors' },
    );
  };

  // Auto-show table when linked comparables already exist from the API
  useEffect(() => {
    if (isGenerated || comparativeSurveys.length === 0) return;
    if (!methodId || !methodType || !property) return;

    // Restore from saved data if available
    if (savedComparativeFactors && savedComparativeFactors.length > 0) {
      restoreDirectComparisonFromSavedData({
        methodId,
        property,
        comparativeSurveys,
        allFactors,
        linkedComparables,
        savedComparativeFactors,
        savedCalculations,
        reset,
      });
      setIsGenerated(true);
      return;
    }

    initializeDirectComparisonForm({
      collateralType: '',
      methodId,
      methodType,
      comparativeSurveys,
      property,
      template: undefined,
      allFactors,
      reset,
    });
    setIsGenerated(true);
  }, [comparativeSurveys, isGenerated, methodId, methodType, property, reset, savedComparativeFactors]);

  // Re-init form when comparative surveys change (e.g. user selects/deselects from modal)
  useEffect(() => {
    if (!isGenerated) return;
    if (!methodId || !methodType || !property) return;

    // Only re-init when the set of surveys actually changed
    const formSurveyIds = (getValues('comparativeSurveys') ?? []).map(s => s.marketId).sort().join(',');
    const currentSurveyIds = comparativeSurveys.map(s => s.id).sort().join(',');
    if (formSurveyIds === currentSurveyIds) return;

    initializeDirectComparisonFormOnSelectSurvey({
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
    <FormProvider {...methods}>
      <form
        onSubmit={(e) => { e.preventDefault(); handleOnSubmit(); }}
        className="flex flex-col h-full gap-4"
      >
        <PricingAnalysisTemplateSelector
          icon="house-building"
          methodName="Direct Comparison"
          onGenerate={handleOnGenerate}
          collateralType={{
            onSelectCollateralType: handleOnSelectCollateralType,
            value: collateralType,
            options: COLLATERAL_TYPE,
          }}
          template={{
            onSelectTemplate: handleOnSelectTemplate,
            value: pricingTemplateType,
            options:
              (templates ?? [])
                .filter(template => template?.collateralType === collateralType)
                .map(template => ({
                  value: template?.templateCode ?? '',
                  label: template?.templateName ?? '',
                })) ?? [],
          }}
        />
        {isGenerated && (
          <div className="flex-1 min-h-0">
            <DirectComparisonForm
              {...methods}
              property={property}
              marketSurveys={marketSurveys}
              comparativeMarketSurveys={comparativeSurveys}
              template={pricingTemplate}
              allFactors={allFactors}
              onSelectComparativeMarketSurvey={handleOnSelectComparativeMarketSurvey}
            />
            <MethodFooterActions
              onSaveDraft={handleOnSaveDraft}
              onCancel={handleOnCancelCalculationMethod}
              isSubmitting={saveMutation.isPending}
            />
          </div>
        )}
        <ConfirmDialog
          isOpen={isShowCanceledDialog}
          onClose={handleOnDenyCancelCalculationMethod}
          onConfirm={handleOnConfirmCancelCalculationMethod}
          message={`Are you sure? If you confirm the calculation value of this method will be removed.`}
        />
      </form>
    </FormProvider>
  );
}
