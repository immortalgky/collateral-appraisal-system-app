import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DirectComparisonDto, type DirectComparisonType } from '../schemas/directComparisonForm';
import { useEffect, useState } from 'react';
import type {
  FactorDataType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '../schemas';
import toast from 'react-hot-toast';
import { flattenRHFErrors } from '@features/pricingAnalysis/domain/flattenRHFErrors.ts';
import { setDirectComparisonInitialValue } from '@features/pricingAnalysis/adapters/setDirectComparisonInitialValue.ts';
import { setDirectComparisonInitialValueOnSelectSurvey } from '@features/pricingAnalysis/adapters/setDirectComparisonInitialValueOnSelectSurvey.ts';
import { PriceAnalysisTemplateSelector } from '@features/pricingAnalysis/components/PriceAnalysisTemplateSelector.tsx';
import { COLLATERAL_TYPE } from '@features/pricingAnalysis/data/constants';
import { DirectComparison } from '@features/pricingAnalysis/components/DirectComparison.tsx';
import { MethodFooterActions } from '@features/pricingAnalysis/components/MethodFooterActions.tsx';
import ConfirmDialog from '@shared/components/ConfirmDialog.tsx';

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

  /** Template selector handler */
  const [comparativeSurveys, setComparativeSurveys] = useState<MarketComparableDetailType[]>([]);
  const handleOnSelectComparativeMarketSurvey = (surveys: MarketComparableDetailType[]) => {
    setComparativeSurveys(surveys);
  };

  const [collateralType, setCollateralType] = useState<string>('');
  const [pricingTemplateType, setPricingTemplateType] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<TemplateDetailType | undefined>();
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  /** cancel calculation dialog state */
  const [isShowCanceledDialog, setisShowCanceledDialog] = useState<boolean>(false);

  /** Form handler */
  const handleOnSubmit = (value: DirectComparisonType) => {
    // TODO: remove if api ready!
    const appraisalValue = value.directComparisonAppraisalPrice.appraisalPriceRounded;
    if (
      !!appraisalValue &&
      !!activeMethod?.approachType &&
      !!activeMethod?.methodType
    ) {
      onCalculationSave({
        approachType: activeMethod.approachType,
        methodType: activeMethod.methodType,
        appraisalValue: appraisalValue,
      });
      toast.success('Saved!');
      reset(value);
      return;
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
    setComparativeSurveys([]);

    // single source of truth: init now
    setDirectComparisonInitialValue({
      collateralType,
      methodId: methodId!,
      methodType: methodType!,
      comparativeSurveys: [],
      property: property!,
      template,
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

  useEffect(() => {
    if (!methodId || !methodType || !property) return;
    setDirectComparisonInitialValueOnSelectSurvey({
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
        onSubmit={handleSubmit(handleOnSubmit, onInvalid)}
        className="flex flex-col h-full gap-4"
      >
        <PriceAnalysisTemplateSelector
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
            <DirectComparison
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
