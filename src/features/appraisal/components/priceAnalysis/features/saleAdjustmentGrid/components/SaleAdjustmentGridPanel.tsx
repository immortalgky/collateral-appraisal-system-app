import {
  COLLATERAL_TYPE,
  type WQSTemplate,
} from '@features/appraisal/components/priceAnalysis/data/data.ts';
import { FormProvider, type SubmitErrorHandler, useForm } from 'react-hook-form';
import {
  WQSDto,
  type WQSRequestType,
} from '@features/appraisal/components/priceAnalysis/features/wqs/schemas/wqsForm.ts';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  SaleAdjustmentGridDto,
  type SaleAdjustmentGridType,
} from '@features/appraisal/components/priceAnalysis/schemas/saleAdjustmentGridForm.ts';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { PriceAnalysisTemplateSelector } from '@features/appraisal/components/priceAnalysis/shared/components/PriceAnalysisTemplateSelector.tsx';
import { WQS } from '@features/appraisal/components/priceAnalysis/features/wqs/components/WQSSection.tsx';
import { MethodFooterActions } from '@features/appraisal/components/priceAnalysis/components/MethodFooterActions.tsx';
import { flattenRHFErrors } from '@features/appraisal/components/priceAnalysis/features/wqs/domain/flattenRHFErrors.ts';
import { setSaleAdjustmentGridInitialValue } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/domain/setSaleAdjustmentGridInitialValue.ts';
import { setSaleAdjustmentGridInitialValueOnSelectSurvey } from '@features/appraisal/components/priceAnalysis/features/saleAdjustmentGrid/domain/setSaleAdjustmentGridInitialValueOnSelectSurvey.ts';

interface SaleAdjustmentGridPanelProps {
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  templates?: WQSTemplate[];
  allFactors: Record<string, unknown>[];
  marketSurveys: Record<string, unknown>[];
}
export function SaleAdjustmentGridPanel({
  methodId,
  methodType,
  property,
  marketSurveys,
  templates,
  allFactors,
}: SaleAdjustmentGridPanelProps) {
  const methods = useForm<SaleAdjustmentGridType>({
    mode: 'onSubmit',
    resolver: zodResolver(SaleAdjustmentGridDto),
  });

  const {
    handleSubmit,
    getValues,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = methods;

  /** Form handler */
  const handleOnSubmit = (value: any) => {
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
  const [comparativeSurveys, setComparativeSurveys] = useState<Record<string, unknown>[]>([]);
  const handleOnSelectComparativeMarketSurvey = (surveys: Record<string, unknown>[]) => {
    setComparativeSurveys([...surveys]);
  };

  const [collateralTypeId, setCollateralTypeId] = useState<string>('');
  const [pricingTemplateId, setPricingTemplateId] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<WQSTemplate | undefined>();
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  const handleOnGenerate = () => {
    if (!collateralTypeId || !collateralTypeId) return;

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
    setSaleAdjustmentGridInitialValue({
      collateralType: collateralTypeId,
      methodId: methodId,
      methodType: methodType,
      comparativeSurveys: comparativeSurveys,
      property: property,
      template: pricingTemplate,
      reset: reset,
    });
  }, [
    collateralTypeId,
    comparativeSurveys,
    isGenerated,
    methodId,
    methodType,
    pricingTemplate,
    property,
    reset,
  ]);

  useEffect(() => {
    setSaleAdjustmentGridInitialValueOnSelectSurvey({
      collateralType: collateralTypeId,
      methodId: methodId,
      methodType: methodType,
      comparativeSurveys: comparativeSurveys,
      property: property,
      template: pricingTemplate,
      reset: reset,
      getValues: getValues,
    });
  }, [comparativeSurveys.length]);

  const onInvalid: SubmitErrorHandler<WQSRequestType> = errs => {
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
      { id: 'wqs-form-errors' }, // prevents stacking duplicate toasts
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
