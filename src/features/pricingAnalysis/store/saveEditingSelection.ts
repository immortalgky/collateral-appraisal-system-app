import {
  useAddPriceAnalysisApproach,
  useAddPriceAnalysisMethod,
  useCreatePricingAnalysis,
} from '@features/pricingAnalysis/api';

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
  const createPricingAnalysis = useCreatePricingAnalysis();
  const addApproach = useAddPriceAnalysisApproach();
  const addMethod = useAddPriceAnalysisMethod();

  const save = async (input: {
    pricingAnalysisId: string;
    groupId: string;
    selections: Array<{ approachType: string; methodTypes: string[] }>;
  }) => {
    if (input.selections.length === 0) return { pricingAnalysisId: input.pricingAnalysisId, entries: [] };

    // If "new", create the pricing analysis first to get a real ID
    let pricingAnalysisId = input.pricingAnalysisId;
    const isNew = !pricingAnalysisId || pricingAnalysisId === 'new';

    if (isNew) {
      const createRes = await createPricingAnalysis.mutateAsync({
        groupId: input.groupId,
      });
      pricingAnalysisId = createRes.id;
    }

    const pricingIdEntries: Array<{ approachId: string; methodIds: Array<{ id: string }> }> = [];

    for (const sel of input.selections) {
      const addApproachRes = await addApproach.mutateAsync({
        pricingAnalysisId,
        request: { approachType: mapToServerApproachType(sel.approachType) },
      });

      const methodIdEntries: Array<{ id: string }> = [];
      for (const methodType of sel.methodTypes) {
        const addMethodRes = await addMethod.mutateAsync({
          pricingAnalysisId,
          approachId: addApproachRes.id,
          request: { methodType: mapToServerMethodType(methodType) },
        });
        methodIdEntries.push({ id: addMethodRes.id });
      }

      pricingIdEntries.push({ approachId: addApproachRes.id, methodIds: methodIdEntries });
    }

    return { pricingAnalysisId, entries: pricingIdEntries };
  };

  return {
    save,
    addApproach,
    addMethod,
  };
}
