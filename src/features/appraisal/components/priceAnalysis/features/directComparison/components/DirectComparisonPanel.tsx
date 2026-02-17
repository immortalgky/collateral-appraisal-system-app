import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DirectComparisonDto,
  type DirectComparisonType,
} from '../../../schemas/directComparisonForm';
import type {
  FactorDataType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '../../../schemas/v1';
import { useEffect, useState } from 'react';
import { flattenRHFErrors } from '../../wqs/domain/flattenRHFErrors';
import toast from 'react-hot-toast';
import { PriceAnalysisTemplateSelector } from '../../../shared/components/PriceAnalysisTemplateSelector';
import { MethodFooterActions } from '../../../components/MethodFooterActions';
import { DirectComparisonSection } from './DirectComparisonSection';
import { setDirectComparisonInitialValueOnSelectSurvey } from '../domain/setDirectComparisonInitialValueOnSelectSurvey';
import { setDirectComparisonInitialValue } from '../domain/setDirectComparisonInitialValue';

interface DirectComparisonPanelProps {
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  templates?: TemplateDetailType[];
  allFactors: FactorDataType[];
  marketSurveys: MarketComparableDetailType[];
}
export function DirectComparisonPanel({
  methodId,
  methodType,
  property,
  marketSurveys,
  templates,
  allFactors,
}: DirectComparisonPanelProps) {
  const methods = useForm<DirectComparisonType>({
    mode: 'onSubmit',
    resolver: zodResolver(DirectComparisonDto),
  });

  const {
    handleSubmit,
    getValues,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = methods;

  /** Form handler */
  const handleOnSubmit = (value: DirectComparisonType) => {
    reset(value);
    toast.success('Saved!');
  };

  const handleOnSaveDraft = () => {
    const currentValue = getValues();
    console.log(currentValue);
    reset(currentValue);
  };

  const handleOnCancel = () => {
    // waning confirmation, the hide method section
  };

  /** Template selector handler */
  const [comparativeSurveys, setComparativeSurveys] = useState<MarketComparableDetailType[]>([]);
  const handleOnSelectComparativeMarketSurvey = (surveys: Record<string, unknown>[]) => {
    setComparativeSurveys([...surveys]);
  };

  const [collateralTypeId, setCollateralTypeId] = useState<string>('');
  const [pricingTemplateId, setPricingTemplateId] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<TemplateDetailType | undefined>();
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  const handleOnGenerate = () => {
    // if (!collateralTypeId || !pricingTemplateId) return;

    setIsGenerated(false);
    // set template that belong to selected template
    setPricingTemplate(templates?.find(template => template.templateCode === pricingTemplateId));
    // reset comparative surveys to empty list when generate
    setComparativeSurveys([]);

    // Mark as dirty because Generate creates a new unsaved configuration
    setValue('generatedAt', new Date().toISOString(), { shouldDirty: true });
    setIsGenerated(true);
  };

  const handleOnSelectCollateralType = (collateralTypeId: string) => {
    setCollateralTypeId(collateralTypeId);
  };

  const handleOnSelectTemplate = (templateId: string) => {
    setPricingTemplateId(templateId);
  };

  useEffect(() => {
    setDirectComparisonInitialValue({
      collateralType: collateralTypeId,
      methodId: methodId,
      methodType: methodType,
      comparativeSurveys: comparativeSurveys,
      property: property,
      template: pricingTemplate,
      reset: reset,
    });
  }, [collateralTypeId, isGenerated, methodId, methodType, pricingTemplate, property, reset]);

  useEffect(() => {
    setDirectComparisonInitialValueOnSelectSurvey({
      comparativeSurveys: comparativeSurveys,
      setValue: setValue,
      getValues: getValues,
    });
  }, [comparativeSurveys.length]);

  const onInvalid: SubmitErrorHandler<DirectComparisonType> = errs => {
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
      { id: 'sale-grid-form-errors' }, // prevents stacking duplicate toasts
    );
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(handleOnSubmit, onInvalid)}
        className="flex flex-col h-full gap-4"
      >
        <PriceAnalysisTemplateSelector
          icon="table"
          methodName="Sale Adjustment Grid"
          onGenerate={handleOnGenerate}
          collateralType={{
            onSelectCollateralType: handleOnSelectCollateralType,
            value: collateralTypeId,
            options: COLLATERAL_TYPE,
          }}
          template={{
            onSelectTemplate: handleOnSelectTemplate,
            value: pricingTemplateId,
            options:
              templates
                ?.filter(template => template.collateralTypeId === collateralTypeId)
                .map(template => ({
                  value: template.templateCode,
                  label: template.templateName,
                })) ?? [],
          }}
        />
        {isGenerated && (
          <div className="flex-1 min-h-0">
            <DirectComparisonSection
              {...methods}
              property={property}
              marketSurveys={marketSurveys}
              comparativeMarketSurveys={comparativeSurveys}
              template={pricingTemplate}
              allFactors={allFactors}
              onSelectComparativeMarketSurvey={handleOnSelectComparativeMarketSurvey}
            />
            <MethodFooterActions
              isLoading={isGenerated}
              onSaveDraft={handleOnSaveDraft}
              onCancel={handleOnCancel}
            />
          </div>
        )}
      </form>
    </FormProvider>
  );
}
