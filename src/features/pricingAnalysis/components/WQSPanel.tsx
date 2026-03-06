import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form';
import { PricingAnalysisTemplateSelector } from './PricingAnalysisTemplateSelector';
import { MethodFooterActions } from './MethodFooterActions';
import { WQSDto, type WQSFormType } from '../schemas/wqsForm';
import { useEffect, useState } from 'react';
import { COLLATERAL_TYPE } from '../data/constants';
import toast from 'react-hot-toast';
import { flattenRHFErrors } from '../domain/flattenRHFErrors';
import { mapWQSFormToSubmitSchema } from '../domain/mapWQSFormToSubmitSchema';
import { useSaveComparativeAnalysis } from '../api';
import { WQSForm } from './WQSForm';
import type {
  CalculationType,
  ComparativeFactorType,
  FactorDataType,
  FactorScoreType,
  LinkedComparableType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '../schemas';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { syncWQSFormSurveys } from '@features/pricingAnalysis/adapters/syncWQSFormSurveys.ts';
import { initializeWQSForm } from '@features/pricingAnalysis/adapters/initializeWQSForm.ts';
import { restoreWQSFromSavedData } from '@features/pricingAnalysis/adapters/restoreWQSFromSavedData.ts';
import { useLinkedComparables } from '@features/pricingAnalysis/hooks/useLinkedComparables';

interface WQSPanelProps {
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
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

export function WQSPanel({
  activeMethod,
  property,
  marketSurveys,
  allFactors,
  methodTemplates: templates,
  linkedComparables,
  savedComparativeFactors,
  savedFactorScores,
  savedCalculations,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: WQSPanelProps) {
  const { methodId, methodType } = activeMethod ?? {};

  const methods = useForm<WQSFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(WQSDto),
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
  const [pricingTemplate, setPricingTemplate] = useState<TemplateDetailType | undefined>(undefined);
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
      const request = mapWQSFormToSubmitSchema({
        WQSForm: value,
      });

      await saveMutation.mutateAsync({
        id: activeMethod.pricingAnalysisId,
        methodId,
        request,
      });

      const appraisalValue = value.WQSFinalValue?.appraisalPriceRounded;
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

  /** template selection handler */
  const handleOnGenerate = () => {
    setIsGenerated(false);

    const template = (templates ?? []).find(t => t?.templateCode === pricingTemplateType);
    setPricingTemplate(template);

    // single source of truth: init now (use existing linked comparables)
    initializeWQSForm({
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

  const handleOnResetCalculationMethod = () => {
    if (!!methodId && !!methodType && !!comparativeSurveys && !!property) {
      resetWQSValue({
        collateralType: collateralType,
        methodId: methodId,
        methodType: methodType,
        comparativeSurveys: comparativeSurveys,
        property: property,
        template: pricingTemplate,
        reset: reset,
        getValues: getValues,
      });
    }
  };

  const onInvalid: SubmitErrorHandler<WQSFormType> = errs => {
    const messages = flattenRHFErrors(errs);

    toast.error(
      <div>
        <div className="font-semibold">Please fix these fields</div>
        <ul className="mt-1 list-disc pl-5">
          {messages.slice(0, 6).map(m => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>,
      { id: 'wqs-form-errors' },
    );
  };

  // Auto-show table when linked comparables already exist from the API
  useEffect(() => {
    if (isGenerated || comparativeSurveys.length === 0) return;
    if (!methodId || !methodType || !property) return;

    // Restore from saved data if available
    if (savedComparativeFactors && savedComparativeFactors.length > 0) {
      restoreWQSFromSavedData({
        methodId,
        property,
        comparativeSurveys,
        allFactors,
        linkedComparables,
        savedComparativeFactors,
        savedFactorScores: savedFactorScores ?? [],
        savedCalculations,
        reset,
      });
      setIsGenerated(true);
      return;
    }

    initializeWQSForm({
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
  }, [
    comparativeSurveys,
    isGenerated,
    methodId,
    methodType,
    property,
    reset,
    savedComparativeFactors,
    savedFactorScores,
  ]);

  // Re-init form when comparative surveys change (e.g. user selects/deselects from modal)
  useEffect(() => {
    if (!isGenerated) return;
    if (!methodId || !methodType || !property) return;

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

    syncWQSFormSurveys({
      collateralType: collateralType,
      methodId: methodId,
      methodType: methodType,
      comparativeSurveys: comparativeSurveys,
      property: property,
      template: pricingTemplate,
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

  const isLoading = !isGenerated || !property || !marketSurveys || !allFactors;

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
        onSubmit={e => {
          e.preventDefault();
          handleOnSubmit();
        }}
        className="flex flex-col h-full gap-4"
      >
        <PricingAnalysisTemplateSelector
          icon="scale-balanced"
          methodName="Weighted Quality Scores (WQS)"
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
                .map(template => {
                  return {
                    value: template?.templateCode ?? '',
                    label: template?.templateName ?? '',
                  };
                }) ?? [],
          }}
        />
        {!isLoading && (
          <div className="flex-1 min-h-0">
            <WQSForm
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
