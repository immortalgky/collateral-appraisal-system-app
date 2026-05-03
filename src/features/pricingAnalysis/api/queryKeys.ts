export const projectModelPricingContextKeys = {
  /** ['project-model-pricing-context', appraisalId, projectId, modelId] */
  detail: (appraisalId: string, projectId: string, modelId: string) =>
    ['project-model-pricing-context', appraisalId, projectId, modelId] as const,
};

export const pricingAnalysisKeys = {
  all: ['price-analysis'] as const,
  detail: (id: string) => ['price-analysis', id] as const,
  comparativeFactors: (pricingAnalysisId: string, methodId: string) =>
    ['price-analysis', pricingAnalysisId, 'comparative-factors', methodId] as const,
  template: (methodType: string) => ['price-analysis-template', methodType] as const,
  allFactors: ['all-factors'] as const,
  comparables: (appraisalId: string) => ['appraisals', appraisalId, 'comparables'] as const,
  marketComparableDetail: (id: string) => ['market-comparables', 'detail', id] as const,
  finalValue: (id: string, methodId: string) =>
    ['price-analysis', id, 'final-value', methodId] as const,
  machineCostItems: (pricingAnalysisId: string, methodId: string) =>
    ['price-analysis', pricingAnalysisId, 'machine-cost-items', methodId] as const,
  leaseholdAnalysis: (pricingAnalysisId: string, methodId: string) =>
    ['price-analysis', pricingAnalysisId, 'leasehold-analysis', methodId] as const,
  profitRentAnalysis: (pricingAnalysisId: string, methodId: string) =>
    ['price-analysis', pricingAnalysisId, 'profit-rent-analysis', methodId] as const,
  pricingTemplates: (activeOnly: boolean) => ['pricing-templates', activeOnly] as const,
  pricingTemplateByCode: (code: string) => ['pricing-templates', code] as const,
  incomeAnalysis: (pricingAnalysisId: string, methodId: string) =>
    ['price-analysis', pricingAnalysisId, 'income-analysis', methodId] as const,
  pricingParameters: () => ['pricing-parameters'] as const,
  hypothesisAnalysis: (pricingAnalysisId: string, methodId: string) =>
    ['price-analysis', pricingAnalysisId, 'hypothesis-analysis', methodId] as const,
};
