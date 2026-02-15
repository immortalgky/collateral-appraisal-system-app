import {
  useAddPriceAnalysisApproach,
  useAddPriceAnalysisMethod,
} from '@features/appraisal/components/priceAnalysis/api/api.ts';

export interface PriceAnalysisGateway {
  addApproach(input: { appraisalId: string; approachType: string }): Promise<{ id: string }>;
  addMethod(input: {
    appraisalId: string;
    approachId: string;
    methodType: string;
  }): Promise<{ id: string }>;
}

export function usePriceAnalysisGateway(): PriceAnalysisGateway {
  const addApproach = useAddPriceAnalysisApproach();
  const addMethod = useAddPriceAnalysisMethod();

  return {
    addApproach: ({ appraisalId, approachType }) =>
      addApproach.mutateAsync({ id: appraisalId, request: { approachType } }),
    addMethod: ({ appraisalId, approachId, methodType }) =>
      addMethod.mutateAsync({ id: appraisalId, approachId, request: { methodType } }),
  };
}
