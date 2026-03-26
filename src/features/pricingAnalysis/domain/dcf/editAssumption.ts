import type { AssumptionEditDraft } from '../../components/DiscountedCashFlowMethodModal';
import type { DCFAssumption, DCFSection } from '../../types/dcf';

// editAssumption.ts
export function editAssumption(sections: DCFSection[], draft: AssumptionEditDraft): DCFSection[] {
  let sourceCategoryId: string | null = null;
  let sourceAssumption: DCFAssumption | null = null;

  for (const section of sections) {
    for (const category of section.categories ?? []) {
      const found = category.assumptions?.find(a => a.clientId === draft.targetAssumptionClientId);
      if (found) {
        sourceCategoryId = category.clientId;
        sourceAssumption = found;
        break;
      }
    }
    if (sourceAssumption) break;
  }

  if (!sourceAssumption || !draft.targetCategoryClientId) return sections;

  const updatedAssumption: DCFAssumption = {
    ...sourceAssumption,
    assumptionType: draft.assumptionType,
    assumptionName: draft.assumptionName,
    method: draft.method,
  };

  if (sourceCategoryId !== draft.targetCategoryClientId) {
    return sections.map(section => ({
      ...section,
      categories: (section.categories ?? []).map(category => {
        let assumptions = category.assumptions ?? [];

        if (category.clientId === sourceCategoryId) {
          assumptions = assumptions.filter(a => a.clientId !== draft.targetAssumptionClientId);
        }

        if (category.clientId === draft.targetCategoryClientId) {
          assumptions = [
            ...assumptions,
            { ...updatedAssumption, displaySeq: category.assumptions.length },
          ].sort((a, b) => a.displaySeq - b.displaySeq);
        }

        return { ...category, assumptions };
      }),
    }));
  }

  return sections.map(section => ({
    ...section,
    categories: (section.categories ?? []).map(category => {
      let assumptions = category.assumptions ?? [];

      if (category.clientId === sourceCategoryId) {
        assumptions = assumptions.filter(a => a.clientId !== draft.targetAssumptionClientId);
      }

      if (category.clientId === draft.targetCategoryClientId) {
        assumptions = [...assumptions, updatedAssumption].sort(
          (a, b) => a.displaySeq - b.displaySeq,
        );
      }

      return { ...category, assumptions };
    }),
  }));
}
