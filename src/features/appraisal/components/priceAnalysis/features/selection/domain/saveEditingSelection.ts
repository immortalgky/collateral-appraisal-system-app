import {
  useAddPriceAnalysisApproach,
  useAddPriceAnalysisMethod,
} from '@features/appraisal/components/priceAnalysis/api/api.ts';

function mapToServerApproachType(approachType: string): string {
  if (approachType === 'MARAPPR') {
    return 'Market';
  }
  if (approachType === 'COSTAPPR') {
    return 'Cost';
  }
  if (approachType === 'INCOMEAPPR') {
    return 'Income';
  }
  if (approachType === 'RESAPPR') {
    return 'Residual';
  }
  return '';
}

function mapToServerMethodType(methodType: string): string {
  if (methodType === 'WQS_MARKET') {
    return 'WQS';
  }
  if (methodType === 'SAG_MARKET') {
    return 'SaleGrid';
  }
  if (methodType === 'DC_MARKET') {
    return 'DirectComparison';
  }
  return '';
}
export function useSaveEditingSelection() {
  const addApproach = useAddPriceAnalysisApproach();
  const addMethod = useAddPriceAnalysisMethod();

  const save = async (input: {
    pricingAnalysisId: string;
    selections: Array<{ approachType: string; methodTypes: string[] }>;
  }) => {
    if (!input.pricingAnalysisId || input.selections.length === 0) return [];

    const pricingIdEntries: Array<{ approachId: string; methodIds: Array<{ id: string }> }> = [];

    for (const sel of input.selections) {
      const addApproachRes = await addApproach.mutateAsync({
        pricingAnalysisId: input.pricingAnalysisId,
        request: { approachType: mapToServerApproachType(sel.approachType) },
      });

      const methodIdEntries: Array<{ id: string }> = [];
      for (const methodType of sel.methodTypes) {
        const addMethodRes = await addMethod.mutateAsync({
          pricingAnalysisId: input.pricingAnalysisId,
          approachId: addApproachRes.id,
          request: { methodType: mapToServerMethodType(methodType) },
        });
        methodIdEntries.push({ id: addMethodRes.id });
      }

      pricingIdEntries.push({ approachId: addApproachRes.id, methodIds: methodIdEntries });
    }

    return pricingIdEntries;
  };

  const isSuccess = addApproach.isSuccess && addMethod.isSuccess;

  return {
    save,
    addApproach,
    addMethod,
  };
}
