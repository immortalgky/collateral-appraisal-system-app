import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { DCF, type DCFFormType } from '../schemas/dcfForm';
import { dcfMockData } from '../data/dcfMockData';
import { useEffect, useState } from 'react';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { DiscountedCashFlowTableSection } from './DiscountedCashFlowTableSection';

interface DiscountedCashFlowPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
}
export function DiscountedCashFlowPanel({ activeMethod }: DiscountedCashFlowPanelProps) {
  // const { methodId, methodType } = activeMethod ?? {};

  const methods = useForm<DCFFormType>({ mode: 'onSubmit', resolver: zodResolver(DCF) });

  const { reset, getValues } = methods;

  const data = getValues();

  useEffect(() => {
    reset(dcfMockData);
  }, []);
  // inquiry logic

  return (
    <FormProvider methods={methods} schema={DCF}>
      <form>
        {/* template */}

        <DiscountedCashFlowTableSection totalNumberOfYears={data.totalNumberOfYears} />

        {/* footer save, reset, cancel */}
      </form>
    </FormProvider>
  );
}
