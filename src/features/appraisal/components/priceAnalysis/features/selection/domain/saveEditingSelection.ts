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
    groupId: string;
    selections: Array<{ approachType: string; methodTypes: string[] }>;
  }) => {
    console.log(
      'check parameters',
      input.pricingAnalysisId,
      input.groupId,
      input.selections.length,
    );
    if (!input.pricingAnalysisId || !input.groupId || input.selections.length === 0) return [];

    console.log('pass condition');

    const pricingIdEntries: Array<{ approachId: string; methodIds: Array<{ id: string }> }> = [];

    for (const sel of input.selections) {
      const addApproachRes = await addApproach.mutateAsync({
        id: input.pricingAnalysisId,
        request: { approachType: mapToServerApproachType(sel.approachType) },
      });

      const methodIdEntries: Array<{ id: string }> = [];
      for (const methodType of sel.methodTypes) {
        const addMethodRes = await addMethod.mutateAsync({
          id: input.pricingAnalysisId,
          approachId: addApproachRes.id,
          request: { methodType: mapToServerMethodType(methodType) },
        });
        methodIdEntries.push({ id: addMethodRes.id });
      }

      pricingIdEntries.push({ approachId: addApproachRes.id, methodIds: methodIdEntries });
    }

    return pricingIdEntries;
  };

  return {
    save,
    addApproach,
    addMethod,
  };
}
