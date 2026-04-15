import type { DCFCategory, DCFSection } from '@features/pricingAnalysis/types/dcf.ts';

export function useAssumptionEditor(activeAssumption, section: DCFSection, category: DCFCategory) {
  if (!activeAssumption) return null;

  return {
    targetSectionClientId: section.clientId,
    targetCategoryClientId: category.clientId,
    targetAssumptionClientId: activeAssumption.clientId,
    assumptionType: activeAssumption.assumptionType ?? null,
    assumptionName: activeAssumption.assumptionName ?? null,
    displayName: activeAssumption.assumptionName ?? null,
    method: activeAssumption.method ?? null,
  };
}
