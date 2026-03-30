import {
  useAddPricingAnalysisApproach,
  useAddPricingAnalysisMethod,
  useCreatePricingAnalysis,
} from '@features/pricingAnalysis/api';
import type { Approach, Method } from '../types/selection';

export function mapToServerApproachType(approachType: string): string {
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

const CONFIG_TO_SERVER_METHOD: Record<string, string> = {
  // Market
  WQS_MARKET: 'WQS',
  SAG_MARKET: 'SaleGrid',
  DC_MARKET: 'DirectComparison',
  // Cost
  WQS_COST: 'WQS',
  SAG_COST: 'SaleGrid',
  DC_COST: 'DirectComparison',
  BC: 'BuildingCost',
  PR: 'ProfitRent',
  LH: 'Leasehold',
  MC_COST: 'MachineryCost',
  // Income
  I: 'Income',
  // Residual (config has methodType "I" for Hypothesis — likely a typo, but map it)
  HYPO: 'Hypothesis',
};

export function mapToServerMethodType(methodType: string): string {
  return CONFIG_TO_SERVER_METHOD[methodType] ?? methodType;
}

/** Check if an ID is a real server UUID (not a config-generated placeholder) */
export function isServerId(id: string | undefined): id is string {
  if (!id) return false;
  // Config IDs are short strings like "MARAPPR", "WQS_MARKET" etc.
  // Server UUIDs are 36-char strings with dashes
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function useSaveEditingSelection() {
  const createPricingAnalysis = useCreatePricingAnalysis();
  const addApproach = useAddPricingAnalysisApproach();
  const addMethod = useAddPricingAnalysisMethod();

  const save = async (input: {
    pricingAnalysisId: string;
    groupId: string;
    selections: Array<{ approachType: string; methodTypes: string[] }>;
    existingApproaches: Approach[];
  }) => {
    if (input.selections.length === 0)
      return { pricingAnalysisId: input.pricingAnalysisId, entries: [] };

    // If "new", create the pricing analysis first to get a real ID
    let pricingAnalysisId = input.pricingAnalysisId;
    const isNew = !pricingAnalysisId || pricingAnalysisId === 'new';

    if (isNew) {
      const createRes = await createPricingAnalysis.mutateAsync({
        groupId: input.groupId,
      });
      pricingAnalysisId = createRes.id;
    }

    // Build lookup from existing state (editDraft has IDs from createInitialState)
    const existingByType = new Map(input.existingApproaches.map(a => [a.approachType, a]));

    const pricingIdEntries: Array<{ approachId: string; methodIds: Array<{ id: string }> }> = [];

    for (const sel of input.selections) {
      const existingApproach = existingByType.get(sel.approachType);
      let approachId: string;

      if (isServerId(existingApproach?.id)) {
        // Approach already exists on server — reuse its ID
        approachId = existingApproach.id;
      } else {
        // Approach is new — create it
        const addApproachRes = await addApproach.mutateAsync({
          pricingAnalysisId,
          request: { approachType: mapToServerApproachType(sel.approachType) },
        });
        approachId = addApproachRes.id;
      }

      // Build lookup for existing methods within this approach
      const existingMethodByType = new Map(
        (existingApproach?.methods ?? []).map((m: Method) => [m.methodType, m]),
      );

      const methodIdEntries: Array<{ id: string }> = [];
      for (const methodType of sel.methodTypes) {
        const existingMethod = existingMethodByType.get(methodType);

        if (isServerId(existingMethod?.id)) {
          // Method already exists — reuse its ID
          methodIdEntries.push({ id: existingMethod.id });
        } else {
          // Method is new — create it
          const addMethodRes = await addMethod.mutateAsync({
            pricingAnalysisId,
            approachId,
            request: { methodType: mapToServerMethodType(methodType) },
          });
          methodIdEntries.push({ id: addMethodRes.id });
        }
      }

      pricingIdEntries.push({ approachId, methodIds: methodIdEntries });
    }

    return { pricingAnalysisId, entries: pricingIdEntries };
  };

  return {
    save,
    addApproach,
    addMethod,
  };
}
