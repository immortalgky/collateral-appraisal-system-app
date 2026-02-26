export const pricingAnalysisKeys = {
  all: ['price-analysis'] as const,
  detail: (id: string) => ['price-analysis', id] as const,
  comparativeFactors: (pricingAnalysisId: string, methodId: string) =>
    ['price-analysis', pricingAnalysisId, 'comparative-factors', methodId] as const,
  template: (methodType: string) => ['price-analysis-template', methodType] as const,
  allFactors: ['all-factors'] as const,
  comparables: (appraisalId: string) => ['appraisals', appraisalId, 'comparables'] as const,
  marketComparableDetail: (id: string) => ['market-comparables', 'detail', id] as const,
};
