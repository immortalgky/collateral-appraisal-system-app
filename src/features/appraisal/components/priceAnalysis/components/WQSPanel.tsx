import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form';
import { PriceAnalysisTemplateSelector } from './PriceAnalysisTemplateSelector';
import { MethodFooterActions } from './MethodFooterActions';
import { WQSDto, type WQSFormType } from '../schemas/wqsForm';
import { useEffect, useState } from 'react';
import { COLLATERAL_TYPE } from '../data/data';
import toast from 'react-hot-toast';
import { flattenRHFErrors } from '../domain/flattenRHFErrors';
import { WQS } from './WQS';
import {
  SaveComparativeAnalysisRequest,
  type MarketComparableDetailType,
  type TemplateDetailType,
} from '../schemas/v1';
import { mapWQSFormToSubmitSchema } from '../domain/mapWQSFormToSubmitSchema';
import { useSaveComparativeAnalysis } from '../api/api';
import type { PriceAnalysisSelectorState } from '../features/selection/domain/useReducer';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { setWQSInitialValueOnSelectSurvey } from '@features/appraisal/components/priceAnalysis/adapters/setWQSInitialValueOnSelectSurvey.ts';
import { setWQSInitialValue } from '@features/appraisal/components/priceAnalysis/adapters/setWQSInitialValue.ts';

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

interface WQSPanelProps {
  state: PriceAnalysisSelectorState;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}
export function WQSPanel({
  state,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: WQSPanelProps) {
  const {
    activeMethod: { pricingAnalysisId, methodId, methodType } = {},
    property,
    marketSurveys,
    allFactors,
    methodTemplates: templates,
  } = state;

  const methods = useForm<WQSFormType>({
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

  /** Template selector states handler */
  /** market comparable must be initialize from database */
  const [comparativeSurveys, setComparativeSurveys] = useState<MarketComparableDetailType[]>([]);
  const handleOnSelectComparativeMarketSurvey = (surveys: MarketComparableDetailType[]) => {
    const nextIds = new Set(surveys.map(s => s.id));
    const prevIds = new Set(comparativeSurveys.map(s => s.id));

    const removed = comparativeSurveys.filter(s => !nextIds.has(s.id)); // prev - next
    const added = surveys.filter(s => !prevIds.has(s.id)); // next - prev

    // TODO: fire api to update link

    setComparativeSurveys(surveys);
  };

  const [collateralType, setCollateralType] = useState<string>('');
  const [pricingTemplateType, setPricingTemplateType] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<TemplateDetailType | undefined>(undefined);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  /** cancel calulation dialog state */
  const [isShowCanceledDialog, setisShowCanceledDialog] = useState<boolean>(false);

  /** mutate submit api */
  const {
    mutate: submitComparativeAnalysisMutate,
    isSuccess: isSubmitComparativeAnalysisSuccess,
    error,
  } = useSaveComparativeAnalysis();

  /** Form handler */
  const handleOnSubmit = (value: WQSFormType) => {
    if (!!pricingAnalysisId && !!methodId) {
      const submitSchema = mapWQSFormToSubmitSchema({ WQSForm: value });

      const parse = SaveComparativeAnalysisRequest.safeParse(submitSchema);

      if (!parse.success) {
        toast.error(parse.error.message);
        return;
      }

      submitComparativeAnalysisMutate({
        id: pricingAnalysisId,
        methodId: methodId,
        request: submitSchema,
      });

      if (isSubmitComparativeAnalysisSuccess) {
        toast.success('Saved!');
        reset(value);
        return;
      }

      toast.error(error);
      return;
    }

    toast.error('Pricing analysis ID or method Id not found!');
  };

  const handleOnSaveDraft = () => {
    const currentValue = getValues();
    console.log(currentValue);
    reset(currentValue);
  };

  /** template selection handler */
  const handleOnGenerate = () => {
    // validate to select collateral type and template
    // if (!collateralType || !pricingTemplateType) return;

    setIsGenerated(false);
    // set template that belong to selected template
    setPricingTemplate(
      (templates ?? []).find(template => template?.templateCode === pricingTemplateType),
    );
    // reset comparative surveys to empty list when generate
    setComparativeSurveys([]);

    // Mark as dirty because Generate creates a new unsaved configuration
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
      { id: 'wqs-form-errors' }, // prevents stacking duplicate toasts
    );
  };

  useEffect(() => {
    console.log('Check infinite refresh on initial!');
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

  // useEffect must have the active list in below, to update immediately
  useEffect(() => {
    console.log('Check infinite refresh on select market survey!');
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
