import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form';
import { PriceAnalysisTemplateSelector } from './PriceAnalysisTemplateSelector';
import { MethodFooterActions } from './MethodFooterActions';
import { WQSDto, type WQSFormType } from '../schemas/wqsForm';
import { useEffect, useState } from 'react';
import { COLLATERAL_TYPE } from '../data/constants';
import toast from 'react-hot-toast';
import { flattenRHFErrors } from '../domain/flattenRHFErrors';
import { WQS } from './WQS';
import type {
  FactorDataType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '../schemas';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { setWQSInitialValueOnSelectSurvey } from '@features/pricingAnalysis/adapters/setWQSInitialValueOnSelectSurvey.ts';
import { setWQSInitialValue } from '@features/pricingAnalysis/adapters/setWQSInitialValue.ts';

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
  onCalculationSave: (payload: { approachType: string; methodType: string; appraisalValue: number }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

export function WQSPanel({
  activeMethod,
  property,
  marketSurveys,
  allFactors,
  methodTemplates: templates,
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

  /** Template selector states handler */
  const [comparativeSurveys, setComparativeSurveys] = useState<MarketComparableDetailType[]>([]);
  const handleOnSelectComparativeMarketSurvey = (surveys: MarketComparableDetailType[]) => {
    setComparativeSurveys(surveys);
  };

  const [collateralType, setCollateralType] = useState<string>('');
  const [pricingTemplateType, setPricingTemplateType] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<TemplateDetailType | undefined>(undefined);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  /** cancel calculation dialog state */
  const [isShowCanceledDialog, setisShowCanceledDialog] = useState<boolean>(false);

  /** Form handler */
  const handleOnSubmit = (value: WQSFormType) => {
    const appraisalValue = value.WQSFinalValue.appraisalPriceRounded;
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

    toast.error('Pricing analysis ID or method Id not found!');
  };

  const handleOnSaveDraft = () => {
    const currentValue = getValues();
    reset(currentValue);
  };

  /** template selection handler */
  const handleOnGenerate = () => {
    setIsGenerated(false);
    setPricingTemplate(
      (templates ?? []).find(template => template?.templateCode === pricingTemplateType),
    );
    setComparativeSurveys([]);
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

  useEffect(() => {
    if (!!methodId && !!methodType && !!comparativeSurveys && !!property) {
      setWQSInitialValue({
        collateralType: collateralType,
        methodId: methodId,
        methodType: methodType,
        comparativeSurveys: comparativeSurveys,
        property: property,
        template: pricingTemplate,
        reset: reset,
      });
    }
  }, [collateralType, isGenerated, methodId, methodType, pricingTemplate, property]);

  useEffect(() => {
    if (!!methodId && !!methodType && !!comparativeSurveys && !!property) {
      setWQSInitialValueOnSelectSurvey({
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
        onSubmit={handleSubmit(handleOnSubmit, onInvalid)}
        className="flex flex-col h-full gap-4"
      >
        <PriceAnalysisTemplateSelector
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
            <WQS
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
