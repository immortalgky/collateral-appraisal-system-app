import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { DCFForm, type DCFFormType } from '../../schemas/dcfForm';
import { useEffect, useState } from 'react';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { DiscountedCashFlowTable } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import type { DCFTemplateType } from '@features/pricingAnalysis/types/dcf.ts';
import { PricingAnalysisTemplateSelector } from '@features/pricingAnalysis/components/PricingAnalysisTemplateSelector.tsx';
import { COLLATERAL_TYPE } from '@features/pricingAnalysis/data/constants.ts';
import { MethodFooterActions } from '@features/pricingAnalysis/components/MethodFooterActions.tsx';
import ConfirmDialog from '@shared/components/ConfirmDialog.tsx';
import { dcfTemplateList, dcfTemplateQueries } from '../../data/dcfTemplates';
import { DiscountedCashFlowHighestBestUsed } from './DiscountedCashFlowHighestBestUsed';
import { initializeDiscountedCashFlowForm } from '../../adapters/initializeDiscountedCashFlowForm';

interface DiscountedCashFlowPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  properties: Record<string, unknown>[] | undefined;
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
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: DiscountedCashFlowPanelProps) {
  const methods = useForm<DCFFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(DCFForm),
    // shouldUnregister: true,
  });

  const { handleSubmit, reset, getValues, setValue, control } = methods;

  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<DCFTemplateType | undefined>();
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  const templateList = dcfTemplateList; // mock data
  const selectedTemplateId = (templateList ?? []).find(
    t => t.templateCode === selectedTemplateCode,
  )?.id;
  const templateDetailQuery = dcfTemplateQueries.find(t => t.id === selectedTemplateId)?.data; // replace by query template detail by template id function.

  const handleOnGenerate = async () => {
    console.log('generate');
    const nextTemplate = templateDetailQuery as DCFTemplateType | undefined;
    if (!nextTemplate) return;

    initializeDiscountedCashFlowForm(nextTemplate, reset);
    setIsGenerated(true);
  };

  const handleOnSelectTemplate = (templateCode: string) => {
    setSelectedTemplateCode(templateCode);
    setPricingTemplate(templateCode);
    setValue('templateCode', templateCode);
  };

  // restore
  useEffect(() => {}, []);

  const isLoading = !isGenerated;

  // reset handler
  const [isShowResetDialog, setIsShowResetDialog] = useState<boolean>(false);
  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    // ...
    setIsGenerated(false);
  };

  const handleOnSubmit = () => {
    console.log(getValues());
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
            onSelectCollateralType: () => null,
            value: '',
            options: COLLATERAL_TYPE,
          }}
          template={{
            fieldName: 'templateCode',
            onSelectTemplate: handleOnSelectTemplate,
            value: selectedTemplateCode,
            options: dcfTemplateList.map(t => ({ value: t.templateCode, label: t.templateName })),
          }}
        />

        {!isLoading && (
          <div className="flex flex-col gap-4 mt-4">
            <DiscountedCashFlowTable
              totalNumberOfYears={getValues('totalNumberOfYears')}
              properties={properties}
            />

            <DiscountedCashFlowHighestBestUsed />

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
