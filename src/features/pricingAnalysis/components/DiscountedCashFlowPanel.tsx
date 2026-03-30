import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { DCFForm, type DCFFormType } from '../schemas/dcfForm';
import { dcfHotelTemplate, dcfTemplateList } from '../data/dcfMockData';
import { useEffect, useState } from 'react';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { DiscountedCashFlowTable } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import type { DCFTemplateType } from '@features/pricingAnalysis/types/dcf.ts';
import { PricingAnalysisTemplateSelector } from '@features/pricingAnalysis/components/PricingAnalysisTemplateSelector.tsx';
import { COLLATERAL_TYPE } from '@features/pricingAnalysis/data/constants.ts';
import { MethodFooterActions } from '@features/pricingAnalysis/components/MethodFooterActions.tsx';
import ConfirmDialog from '@shared/components/ConfirmDialog.tsx';
import { getNewId } from '../domain/getNewId';

interface DiscountedCashFlowPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  property: Record<string, unknown> | undefined;
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
  property,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: DiscountedCashFlowPanelProps) {
  // const { methodId, methodType } = activeMethod ?? {};

  const methods = useForm<DCFFormType>({ mode: 'onSubmit', resolver: zodResolver(DCFForm) });

  const { handleSubmit, reset, getValues } = methods;

  const data = getValues();

  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('');
  const [pricingTemplate, setPricingTemplate] = useState<DCFTemplateType | undefined>();
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  const templateList = dcfTemplateList; // mock data
  const selectedTemplateId = (templateList ?? []).find(
    t => t.templateCode === selectedTemplateCode,
  )?.id;
  const templateDetailQuery = dcfHotelTemplate; // replace by query template detail by template id function.

  const handleOnGenerate = async () => {
    setIsGenerated(false);

    // initialize
    reset({
      clientId: getNewId(),
      templateCode: templateDetailQuery.templateCode,
      templateName: templateDetailQuery.templateName,
      totalNumberOfYears: templateDetailQuery.totalNumberOfYears,
      totalNumberOfDayInYear: templateDetailQuery.totalNumberOfDayInYear,
      capitalizeRate: templateDetailQuery.capitalizeRate,
      discountedRate: templateDetailQuery.discountedRate,
      sections: templateDetailQuery.sections.map((s, s_idx) => {
        return {
          clientId: getNewId(),
          sectionType: s.sectionType,
          sectionName: s.sectionName,
          identifier: s.identifier,
          displaySeq: s_idx,
          categories:
            s.categories?.map((c, c_idx) => {
              return {
                clientId: getNewId(),
                categoryType: c.categoryType,
                categoryName: c.categoryName,
                identifier: c.identifier,
                displaySeq: c_idx,
                assumptions: c.assumptions.map((a, a_idx) => {
                  return {
                    clientId: getNewId(),
                    assumptionType: a.assumptionType,
                    assumptionName: a.assumptionName,
                    identifier: a.identifier,
                    displaySeq: a_idx,
                    method: {
                      clientId: getNewId(),
                      methodType: a.method.methodType,
                      detail: a.method.detail,
                    },
                  };
                }),
              };
            }) ?? null,
        };
      }),
      finalValue: 0,
      finalValueRounded: 0,
    });

    setIsGenerated(true);
  };

  const handleOnSelectTemplate = (templateCode: string) => {
    setSelectedTemplateCode(templateCode);
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
          icon={''}
          methodName={'Income'}
          onGenerate={handleOnGenerate}
          collateralType={{
            onSelectCollateralType: () => null,
            value: '',
            options: COLLATERAL_TYPE,
          }}
          template={{
            onSelectTemplate: handleOnSelectTemplate,
            value: selectedTemplateCode,
            options: [{ value: 'dcf-hotel', label: 'DCF-HOTEL' }],
          }}
        />

        {!isLoading && (
          <div className="flex flex-col gap-1">
            <DiscountedCashFlowTable
              totalNumberOfYears={data.totalNumberOfYears}
              property={property}
            />

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
