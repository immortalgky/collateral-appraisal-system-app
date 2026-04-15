import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { DCFForm, type DCFFormType } from '../../schemas/dcfForm';
import { useEffect, useState } from 'react';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { DiscountedCashFlowTable } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import type { DCF, DCFSection, DCFTemplateType } from '@features/pricingAnalysis/types/dcf.ts';
import { PricingAnalysisTemplateSelector } from '@features/pricingAnalysis/components/PricingAnalysisTemplateSelector.tsx';
import { COLLATERAL_TYPE } from '@features/pricingAnalysis/data/constants.ts';
import { MethodFooterActions } from '@features/pricingAnalysis/components/MethodFooterActions.tsx';
import ConfirmDialog from '@shared/components/ConfirmDialog.tsx';
import { dcfTemplateList, dcfTemplateQueries } from '../../data/dcfTemplates';
import { DiscountedCashFlowHighestBestUsed } from './DiscountedCashFlowHighestBestUsed';
import { initializeDiscountedCashFlowForm } from '../../adapters/initializeDiscountedCashFlowForm';
import { restoreDiscountedCashFlowFromSavedData } from '@features/pricingAnalysis/adapters/restoreDiscountedCashFlowFromSavedData.ts';
import toast from 'react-hot-toast';
import { mapDCFFormToSubmitSchema } from '@features/pricingAnalysis/domain/mapDCFormToSubmitSchema.ts';
import { usePageReadOnly } from '@shared/contexts/PageReadOnlyContext.tsx';
import { DiscountedCashFlowSummaryAssumption } from '@features/pricingAnalysis/components/dcf/DiscountedCashFlowSummaryAssumption.tsx';

interface DiscountedCashFlowPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  properties: Record<string, unknown>[] | undefined;
  savedCalculation: DCF;
  savedComparativeAnalysisTemplateId: string;
  templateList: unknown;
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}
export function DiscountedCashFlowPanel({
  activeMethod,
  properties,
  savedCalculation,
  savedComparativeAnalysisTemplateId,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: DiscountedCashFlowPanelProps) {
  const isReadOnly = usePageReadOnly();
  const { methodId, methodType } = activeMethod ?? {};
  const methods = useForm<DCFFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(DCFForm),
    // shouldUnregister: true,
  });

  const { handleSubmit, reset, getValues, setValue, control } = methods;

  const [collateralType, setCollateralType] = useState<string>('');
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<DCFTemplateType | undefined>();
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [showAssumptionSummary, setShowAssumptionSummary] = useState(false);

  const templateList = dcfTemplateList; // mock data
  const selectedTemplateId = (templateList ?? []).find(
    t => t.templateCode === selectedTemplateCode,
  )?.id;
  const templateDetailQuery = dcfTemplateQueries.find(t => t.id === selectedTemplateId)?.data; // replace by query template detail by template id function.

  const handleOnSelectCollateralType = (collateralType: string) => {
    setCollateralType(collateralType);
    setSelectedTemplateCode('');
    setValue('templateCode', null, { shouldDirty: true });
  };

  const handleOnGenerate = async () => {
    const nextTemplate = templateDetailQuery as DCFTemplateType | undefined;
    if (!nextTemplate) return;

    initializeDiscountedCashFlowForm(nextTemplate, reset);
    setPricingTemplate(nextTemplate);
    setIsGenerated(true);
  };

  const handleOnSelectTemplate = (templateCode: string) => {
    setSelectedTemplateCode(templateCode);
    setValue('templateCode', templateCode);
  };

  const handleOnShowAssumptionSummary = () => {
    setShowAssumptionSummary(!showAssumptionSummary);
  };

  // restore
  useEffect(() => {
    if (isGenerated) return;

    if (!methodId || !methodType || !properties) return;

    // 1) restore saved data
    if (!!savedCalculation) {
      restoreDiscountedCashFlowFromSavedData({ savedCalculation, reset });
      setIsGenerated(true);
    }

    // 2) restore selected template
    if (pricingTemplate) return;

    if (!!savedComparativeAnalysisTemplateId) {
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
          setValue('templateCode', savedTemplate.templateCode);
        }
      }
      setIsGenerated(true);
    }
  }, [savedCalculation, reset, isGenerated, methodId, methodType, properties]);

  const isLoading = !isGenerated || !properties;

  // reset handler
  const [isShowResetDialog, setIsShowResetDialog] = useState<boolean>(false);
  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    // ...
    setIsGenerated(false);
  };

  const handleOnSubmit = () => {
    if (!activeMethod?.pricingAnalysisId || !methodId) {
      toast.error('Pricing analysis ID or method ID not found!');
      return;
    }

    const dcfForm = getValues();
    console.log(dcfForm);

    try {
      const appraisalValue = dcfForm.appraisalPriceRounded ?? null;
      const request = mapDCFFormToSubmitSchema({ DCFForm: dcfForm });
      // await saveMutation.mutateAsync({
      //   id: activeMethod.pricingAnalysisId,
      //   methodId,
      //   request,
      // });
      if (appraisalValue && activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue,
        });
      }
      toast.success('Saved!');
      reset(dcfForm);
    } catch {
      toast.error('Failed to save comparative analysis');
    }
  };

  return (
    <FormProvider methods={methods} schema={DCFForm}>
      <form
        onSubmit={e => {
          e.preventDefault();
          // handleSubmit(handleOnSubmit)(e); // use this one to validate by zod!
          handleOnSubmit();
        }}
      >
        {/* template */}
        <PricingAnalysisTemplateSelector
          icon={'chart-line-up'}
          methodName={'Income'}
          onGenerate={handleOnGenerate}
          collateralType={{
            fieldName: 'collateralType',
            onSelectCollateralType: handleOnSelectCollateralType,
            value: collateralType,
            options: COLLATERAL_TYPE,
          }}
          template={{
            fieldName: 'templateCode',
            onSelectTemplate: handleOnSelectTemplate,
            value: selectedTemplateCode,
            options: dcfTemplateList.map(t => ({
              value: t.templateCode,
              label: t.templateName,
              id: t.id,
            })),
          }}
        />

        {!isLoading && (
          <div className="flex flex-col gap-4 mt-4">
            <DiscountedCashFlowTable
              totalNumberOfYears={getValues('totalNumberOfYears')}
              properties={properties}
              isReadOnly={isReadOnly}
            />

            <DiscountedCashFlowSummaryAssumption
              properties={properties}
              getValues={getValues}
              showAssumptionSummary={showAssumptionSummary}
              onShowAssumptionSummary={handleOnShowAssumptionSummary}
            />

            <DiscountedCashFlowHighestBestUsed isReadOnly={isReadOnly} />

            {/* footer save, reset, cancel */}
            <MethodFooterActions
              onCancel={onCancelCalculationMethod}
              onReset={handleOnReset}
              showReset={isShowResetDialog}
              isSubmitting={false}
            />
          </div>
        )}

        <ConfirmDialog
          isOpen={isShowResetDialog}
          onClose={() => setIsShowResetDialog(false)}
          onConfirm={handleOnConfirmReset}
          message="Are you sure you want to reset this method? All calculation data will be cleared."
        />
      </form>
    </FormProvider>
  );
}
