import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form';
import { PriceAnalysisTemplateSelector } from '../../../shared/components/PriceAnalysisTemplateSelector';
import { WQSSection } from './WQSSection';
import { MethodFooterActions } from '../../../components/MethodFooterActions';
import { WQSDto, type WQSRequestType } from '../schemas/wqsForm';
import { useEffect, useState } from 'react';
import { COLLATERAL_TYPE, type WQSTemplate } from '../../../data/data';
import toast from 'react-hot-toast';
import { setWQSInitialValueOnSelectSurvey } from '../domain/setWQSInitialValueOnSelectSurvey';
import { setWQSInitialValue } from '../domain/setWQSInitialValue';
import { flattenRHFErrors } from '../domain/flattenRHFErrors';

/**
 * => default collateral type, template => generate => query factors in template
 * =>
 * API stages:
 * stage (1): after user click 'AP' button
 * - use 'groupId' to query property in the group, market survey in application
 *
 * stage (2): after user trigger 'pencil' button to start method
 * - load 'collateral type', 'template', 'all factors' parameter
 *
 * stage (3): after user trigger 'generate' button
 * - initial template setting into methods
 *
 * WQS divided into 4 sections:
 * (1) select comparative data
 * (2) WQS score
 * (3) WQS calculation
 * (4) adjust value
 *
 * WQS flow:
 * (1) user choose collateral type and template then system initial data
 * (2) user choose market survey in application to calculate at section (1)
 * (3) user adjust score in section (2)
 * (4) user adjust pricing from market survey such as offering price or selling price (3)
 * (5) after system calculate final value, user will adjust final value at section (4)
 *
 * Control logic:
 * section (1)
 * - in selection market survey screen, system will display in map ***
 * - factor from template setting cannot change/ remove
 * - user can add more factor from all parameter
 * - in case that no template, user still select factor by themself
 * section (2)
 * - factor from template setting cannot change/ remove
 * - user can add more factor from section (1), these factors can change or remove
 * - if total intensity > 100, system will show red color
 * - in case that no template, no factor initail from section (1). but user still choose factor from section (1) to key in score
 * section (3)
 * - market survey data will deliver either offering price or selling price
 * - if offering price has value, user can adjust value by either percentage or amount. but default percentage 5%
 * - if selling price has value, system will calculate total number of year of collateral from date. then, user can adjust period of time (%) and period of time also default 3%
 * section (4)
 * - if coefficient > 0.85, highlight red color
 * others
 * - warning when change template button data already key in ***
 */

export function WQSMethodPanel({
  methodId,
  methodType,
  property,
  marketSurveys,
  templates,
  allFactors,
  onCalculationMethodDirty,
}: {
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  templates?: WQSTemplate[];
  allFactors: Record<string, unknown>[];
  marketSurveys: Record<string, unknown>[];
  onCalculationMethodDirty: (check: boolean) => void;
}) {
  const methods = useForm<WQSRequestType>({
    mode: 'onSubmit',
    resolver: zodResolver(WQSDto),
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
  const [pricingTemplateCode, setPricingTemplateCode] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<WQSTemplate | undefined>();
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  const handleOnGenerate = () => {
    if (!!pricingTemplate && !!collateralTypeId) return;

    setIsGenerated(false);
    // set template that belong to selected template
    setPricingTemplate(templates?.find(template => template.templateCode === pricingTemplateCode));
    // reset comparative surveys to empty list when generate
    setComparativeSurveys([]);

    // Mark as dirty because Generate creates a new unsaved configuration
    setValue('generatedAt', new Date().toISOString(), { shouldDirty: true });
    setIsGenerated(true);
  };

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

  useEffect(() => {
    setWQSInitialValue({
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
    console.log('comparative change!');
    setWQSInitialValueOnSelectSurvey({
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

  const [showMarketSurveySelection, setShowMarketSurveySelection] = useState<boolean>(false);
  const handleOnClickAddComparativeSurvey = (check: boolean) => {
    setShowMarketSurveySelection(check);
  };

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
            onSelectCollateralType: setCollateralTypeId,
            value: collateralTypeId,
            options: COLLATERAL_TYPE,
          }}
          template={{
            onSelectTemplate: setPricingTemplateCode,
            value: pricingTemplateCode,
            options:
              templates
                .filter(template => template.collateralTypeId === collateralTypeId)
                .map(template => ({
                  value: template.templateCode,
                  label: template.templateName,
                })) ?? '',
          }}
        />
        {isGenerated && (
          <div className="flex-1 min-h-0">
            <WQSSection
              {...methods}
              property={property}
              surveys={marketSurveys}
              comparativeSurveys={comparativeSurveys}
              template={pricingTemplate}
              allFactors={allFactors}
              onSelectComparativeMarketSurvey={handleOnSelectComparativeMarketSurvey}
              onShowComparativeDataSelection={handleOnClickAddComparativeSurvey}
              showMarketSurveySelection={showMarketSurveySelection}
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
