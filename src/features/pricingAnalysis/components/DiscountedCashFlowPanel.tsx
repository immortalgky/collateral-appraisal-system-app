import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { DCF, type DCFFormType } from '../schemas/dcfForm';
import { DiscountedCashFlowForm } from './DiscountedCashFlowForm';
import { dcfMockData } from '../data/dcfMockData';
import { useEffect } from 'react';

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

  const { reset } = methods;

  useEffect(() => {
    reset(dcfMockData);
  }, []);

  return (
    <FormProvider {...methods}>
      <form>
        <DiscountedCashFlowForm />
      </form>
    </FormProvider>
  );
}
