import { COLLATERAL_TYPE } from '@features/appraisal/components/priceAnalysis/data/data.ts';
import { FormProvider, type SubmitErrorHandler, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  SaleAdjustmentGridDto,
  type SaleAdjustmentGridType,
} from '@features/appraisal/components/priceAnalysis/schemas/saleAdjustmentGridForm.ts';
import toast from 'react-hot-toast';
import { useEffect, useRef, useState } from 'react';
import { PriceAnalysisTemplateSelector } from '@/features/appraisal/components/priceAnalysis/components/PriceAnalysisTemplateSelector';
import { MethodFooterActions } from '@features/appraisal/components/priceAnalysis/components/MethodFooterActions.tsx';
import { SaleAdjustmentGrid } from './SaleAdjustmentGrid';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import {
  type MarketComparableDetailType,
  SaveComparativeAnalysisRequest,
  type TemplateDetailType,
} from '@features/appraisal/components/priceAnalysis/schemas/v1.ts';
import { useSaveComparativeAnalysis } from '@features/appraisal/components/priceAnalysis/api/api.ts';
import { mapSaleAdjustmentGridFormToSubmitSchama } from '@features/appraisal/components/priceAnalysis/domain/mapSaleAdjustmentGridFormToSubmitSchema.ts';
import { flattenRHFErrors } from '@features/appraisal/components/priceAnalysis/domain/flattenRHFErrors.ts';
import { setSaleAdjustmentGridInitialValue } from '@features/appraisal/components/priceAnalysis/adapters/setSaleAdjustmentGridInitialValue.ts';
import { setSaleAdjustmentGridInitialValueOnSelectSurvey } from '@features/appraisal/components/priceAnalysis/adapters/setSaleAdjustmentGridInitialValueOnSelectSurvey.ts';
import type { PriceAnalysisSelectorState } from '../features/selection/domain/useReducer';
import { saleGridFieldPath } from '../adapters/saleAdjustmentGridfieldPath';
import { useSelectionDispatch } from '../features/selection/domain/selectionContext';

interface SaleAdjustmentGridPanelProps {
  state: PriceAnalysisSelectorState;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}
export function SaleAdjustmentGridPanel({
  state,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: SaleAdjustmentGridPanelProps) {
  const {
    activeMethod: { pricingAnalysisId, methodId, methodType } = {},
    property,
    marketSurveys,
    allFactors,
    methodTemplates: templates,
  } = state;

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
    control,
  } = methods;

  // comparative market survey selection
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
  const [pricingTemplate, setPricingTemplate] = useState<TemplateDetailType | undefined>();
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  /** cancel calulation dialog state */
  const [isShowCanceledDialog, setisShowCanceledDialog] = useState<boolean>(false);

  /** mutate submit api */
  const {
    mutate: submitComparativeAnalysisMutate,
    isSuccess: isSubmitComparativeAnalysisSuccess,
    error,
  } = useSaveComparativeAnalysis();

  const dispatch = useSelectionDispatch(); // TODO: remove if api ready

  /** Form handler */
  const handleOnSubmit = (value: SaleAdjustmentGridType) => {
    // if (!!pricingAnalysisId && !!methodId) {
    //   const submitSchema = mapSaleAdjustmentGridFormToSubmitSchama({
    //     SaleAdjustmentGridForm: value,
    //   });

    //   const parse = SaveComparativeAnalysisRequest.safeParse(submitSchema);

    //   if (!parse.success) {
    //     toast.error(parse.error.message);
    //     return;
    //   }

    //   submitComparativeAnalysisMutate({
    //     id: pricingAnalysisId,
    //     methodId: methodId,
    //     request: submitSchema,
    //   });

    //   if (isSubmitComparativeAnalysisSuccess) {
    //     toast.success('Saved!');
    //     reset(value);
    //     return;
    //   }

    //   toast.error(error);
    //   return;
    // }

    // toast.error('Pricing analysis ID or method Id not found!');

    // TODO: remove if api ready!
    const appraisalValue = value.saleAdjustmentGridAppraisalPrice.appraisalPriceRounded;
    if (
      !!appraisalValue &&
      !!state.activeMethod?.approachType &&
      !!state.activeMethod?.methodType
    ) {
      dispatch({
        type: 'CALCULATION_SAVE',
        payload: {
          approachType: state.activeMethod?.approachType,
          methodType: state.activeMethod?.methodType,
          appraisalValue: appraisalValue,
        },
      });
      toast.success('Saved!');
      reset(value);
      return;
    }
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

    const template = (templates ?? []).find(t => t.templateCode === pricingTemplateType);
    setPricingTemplate(template);
    setComparativeSurveys([]);

    // single source of truth: init now
    setSaleAdjustmentGridInitialValue({
      collateralType,
      methodId: methodId!,
      methodType: methodType!,
      comparativeSurveys: [],
      property: property!,
      template,
      reset,
    });

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

  const onInvalid: SubmitErrorHandler<SaleAdjustmentGridType> = errs => {
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
      { id: 'sale-grid-form-errors' }, // prevents stacking duplicate toasts
    );
  };

  useEffect(() => {
    console.log('Check infinite refresh on select market survey!');
    if (!methodId || !methodType || !property) return;
    setSaleAdjustmentGridInitialValueOnSelectSurvey({
      comparativeSurveys: comparativeSurveys,
      reset: reset,
      getValues: getValues,
    });
  }, [comparativeSurveys, getValues, methodId, methodType, property]);

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
          icon="table"
          methodName="Sale Adjustment Grid"
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
                  value: template.templateCode,
                  label: template.templateName,
                })) ?? [],
          }}
        />
        {isGenerated && (
          <div className="flex-1 min-h-0">
            <SaleAdjustmentGrid
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
